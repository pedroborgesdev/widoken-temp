import type { ProviderBrowserSessionClient } from '../browserSessions/ProviderBrowserSessionManager'

const BASE = 'https://huggingface.co'
const POLL_INTERVAL_MS = 5_000
const ACTIVE_FOR_MS = 15_000

export interface HuggingFaceBalanceResult {
  provider: 'huggingface'
  balance_usd: number
}

export interface HuggingFaceMonitorResult {
  provider: 'huggingface'
  status: 'working' | 'idle' | 'unknown'
  requests_month?: number
  spent_usd_month?: number
  new_requests?: number
  detail?: string
}

export interface HuggingFaceMonitorHandle {
  stop(): void
}

export interface HuggingFaceCollector {
  balance(): Promise<HuggingFaceBalanceResult>
  monitor(onResult: (result: HuggingFaceMonitorResult) => void): HuggingFaceMonitorHandle
}

function decodeHtmlAttribute(value: string): string {
  const named: Record<string, string> = {
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&'
  }
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&(quot|#39|apos|lt|gt|amp);/g, (entity) => named[entity] ?? entity)
}

function attribute(tag: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = tag.match(new RegExp(`\\s${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))
  const value = match?.[1] ?? match?.[2]
  return value === undefined ? undefined : decodeHtmlAttribute(value)
}

export function extractHuggingFaceBalance(html: string): number {
  const balances: number[] = []
  for (const match of html.matchAll(/<div\b[^>]*>/gi)) {
    const tag = match[0]
    if (attribute(tag, 'data-target') !== 'BillingOverviewMetronome') continue
    const props = attribute(tag, 'data-props')
    if (!props) continue
    try {
      const data = JSON.parse(props) as {
        entity?: { currentBalanceUsd?: unknown; invoiceCreditsCents?: unknown }
      }
      const raw = data.entity?.currentBalanceUsd
      const cents = data.entity?.invoiceCreditsCents
      const balance = raw !== undefined ? Number(raw) : cents !== undefined ? Number(cents) / 100 : Number.NaN
      if (Number.isFinite(balance) && balance >= 0) balances.push(balance)
    } catch {
      // Ignore unrelated or malformed component props and require one unambiguous balance below.
    }
  }
  const unique = [...new Set(balances)]
  if (unique.length !== 1) throw new Error('Balance was missing or ambiguous in the Hugging Face billing page.')
  return unique[0]!
}

function responseError(response: Response, operation: string): Error {
  if (response.status === 401 || response.status === 403) {
    return new Error('Hugging Face browser session is signed out.')
  }
  return new Error(`${operation} failed (HTTP ${response.status}).`)
}

export class HuggingFaceSessionCollector implements HuggingFaceCollector {
  constructor(private readonly client: ProviderBrowserSessionClient) {}

  async balance(): Promise<HuggingFaceBalanceResult> {
    const response = await this.client.fetch(`${BASE}/settings/billing`, {
      headers: { Accept: 'text/html' }
    })
    if (!response.ok) throw responseError(response, 'Hugging Face billing request')
    return {
      provider: 'huggingface',
      balance_usd: extractHuggingFaceBalance(await response.text())
    }
  }

  monitor(onResult: (result: HuggingFaceMonitorResult) => void): HuggingFaceMonitorHandle {
    let stopped = false
    let timer: NodeJS.Timeout | undefined
    let previous: number | undefined
    let period: string | undefined
    let lastActivityAt: number | undefined
    let lastStatus: HuggingFaceMonitorResult['status'] | undefined

    const poll = async (): Promise<void> => {
      if (stopped) return
      try {
        const now = new Date()
        const currentPeriod = `${now.getUTCFullYear()}-${now.getUTCMonth()}`
        const startDate = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000)
        const endDate = Math.floor(now.getTime() / 1000)
        const response = await this.client.fetch(
          `${BASE}/api/settings/billing/usage-v2?${new URLSearchParams({
            startDate: String(startDate),
            endDate: String(endDate)
          })}`,
          { headers: { Accept: 'application/json' } }
        )
        if (!response.ok) throw responseError(response, 'Hugging Face usage request')
        const body = await response.json() as {
          usage?: { inferenceProviders?: { numRequests?: unknown; usedNanoUsd?: unknown } }
        }
        const count = Number(body.usage?.inferenceProviders?.numRequests)
        const usedNanoUsd = Number(body.usage?.inferenceProviders?.usedNanoUsd)
        if (!Number.isFinite(count) || count < 0 || !Number.isFinite(usedNanoUsd) || usedNanoUsd < 0) {
          throw new Error('Hugging Face usage response was invalid.')
        }
        if (period !== currentPeriod || (previous !== undefined && count < previous)) previous = undefined
        period = currentPeriod
        const delta = previous === undefined ? 0 : Math.max(0, count - previous)
        if (delta > 0) lastActivityAt = Date.now()
        previous = count
        const status = lastActivityAt !== undefined && Date.now() - lastActivityAt < ACTIVE_FOR_MS
          ? 'working'
          : 'idle'
        onResult({
          provider: 'huggingface',
          status,
          requests_month: count,
          spent_usd_month: usedNanoUsd / 1_000_000_000,
          new_requests: delta
        })
        lastStatus = status
      } catch (error) {
        if (lastStatus !== 'unknown') {
          onResult({
            provider: 'huggingface',
            status: 'unknown',
            detail: error instanceof Error ? error.message : 'Hugging Face usage request failed.'
          })
        }
        lastStatus = 'unknown'
      } finally {
        if (!stopped) timer = setTimeout(() => { void poll() }, POLL_INTERVAL_MS)
      }
    }

    void poll()
    return {
      stop: () => {
        stopped = true
        if (timer) clearTimeout(timer)
      }
    }
  }
}
