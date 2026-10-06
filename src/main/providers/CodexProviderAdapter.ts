import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ProviderSnapshot, UsageLimit } from '@shared/provider'
import type { ProviderAdapter } from './ProviderAdapter'

const ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage'
const AUTH_PATH = join(homedir(), '.codex', 'auth.json')

interface CodexAuth {
  tokens?: {
    access_token?: string
    account_id?: string
  }
}

interface CodexWindow {
  used_percent?: number
  limit_window_seconds?: number
  reset_at?: number
  reset_after_seconds?: number
}

interface CodexResponse {
  plan_type?: string
  rate_limit?: {
    primary_window?: CodexWindow | null
    secondary_window?: CodexWindow | null
  }
}

function readCredentials(): { accessToken: string; accountId: string } | undefined {
  try {
    const auth = JSON.parse(readFileSync(AUTH_PATH, 'utf8')) as CodexAuth
    const accessToken = auth.tokens?.access_token?.trim()
    const accountId = auth.tokens?.account_id?.trim()
    if (!accessToken || !accountId) return undefined
    return { accessToken, accountId }
  } catch {
    return undefined
  }
}

function labelFor(window: CodexWindow, fallback: string): string {
  const seconds = window.limit_window_seconds
  if (!seconds || !Number.isFinite(seconds)) return fallback === 'primary' ? 'Current session' : 'Longer window'
  const minutes = seconds / 60
  if (minutes < 60) return `${Math.round(minutes)}m limit`
  if (minutes < 1_440) return `${Math.round(minutes / 60)}h limit`
  const days = Math.round(minutes / 1_440)
  return days === 7 ? 'Weekly limit' : days === 30 ? 'Monthly limit' : `${days}d limit`
}

function resetAt(window: CodexWindow): string | undefined {
  if (typeof window.reset_at === 'number' && Number.isFinite(window.reset_at)) {
    return new Date(window.reset_at * 1000).toISOString()
  }
  if (typeof window.reset_after_seconds === 'number' && Number.isFinite(window.reset_after_seconds)) {
    return new Date(Date.now() + window.reset_after_seconds * 1000).toISOString()
  }
  return undefined
}

function parseUsage(response: CodexResponse): UsageLimit[] {
  return (['primary', 'secondary'] as const).flatMap((id) => {
    const window = response.rate_limit?.[`${id}_window`]
    if (!window || typeof window.used_percent !== 'number' || !Number.isFinite(window.used_percent)) return []
    return [{
      id,
      label: labelFor(window, id),
      percent: Math.min(100, Math.max(0, window.used_percent)),
      resetsAt: resetAt(window)
    }]
  })
}

export class CodexProviderAdapter implements ProviderAdapter {
  readonly id = 'openai'
  readonly name = 'ChatGPT'
  private connected = true

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async isConnected(): Promise<boolean> {
    return this.connected && Boolean(readCredentials())
  }

  async getUsage(): Promise<ProviderSnapshot> {
    if (!this.connected) {
      return { providerId: this.id, status: 'disconnected', limits: [], lastUpdatedAt: new Date().toISOString() }
    }

    const credentials = readCredentials()
    if (!credentials) {
      return {
        providerId: this.id,
        status: 'unavailable',
        limits: [],
        lastUpdatedAt: new Date().toISOString(),
        error: 'Codex sign-in not found. Sign in through Codex first.'
      }
    }

    try {
      const response = await fetch(ENDPOINT, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
          'ChatGPT-Account-Id': credentials.accountId,
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(15_000)
      })
      if (response.status === 401 || response.status === 403) {
        return {
          providerId: this.id,
          status: 'error',
          limits: [],
          lastUpdatedAt: new Date().toISOString(),
          error: 'Codex rejected its local sign-in. Sign in again through Codex.'
        }
      }
      if (!response.ok) throw new Error(`Codex usage request failed with HTTP ${response.status}`)

      const payload = (await response.json()) as CodexResponse
      const limits = parseUsage(payload)
      if (limits.length === 0) {
        return {
          providerId: this.id,
          status: 'unavailable',
          limits: [],
          lastUpdatedAt: new Date().toISOString(),
          error: 'Codex reported no usage windows for this account.'
        }
      }
      return {
        providerId: this.id,
        status: 'connected',
        limits,
        lastUpdatedAt: new Date().toISOString(),
        plan: payload.plan_type
      }
    } catch (error) {
      return {
        providerId: this.id,
        status: 'error',
        limits: [],
        lastUpdatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unable to read Codex usage.'
      }
    }
  }
}
