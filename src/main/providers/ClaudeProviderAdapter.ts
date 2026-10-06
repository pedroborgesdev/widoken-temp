import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ProviderSnapshot, UsageLimit } from '@shared/provider'
import type { ProviderAdapter } from './ProviderAdapter'

const ENDPOINT = 'https://api.anthropic.com/api/oauth/usage'
const CREDENTIALS_PATH = join(homedir(), '.claude', '.credentials.json')

interface ClaudeCredentials {
  claudeAiOauth?: {
    accessToken?: string
    expiresAt?: number
  }
}

interface ClaudeLimit {
  kind?: string
  percent?: number
  resets_at?: string
}

interface ClaudeResponse {
  limits?: ClaudeLimit[]
  five_hour?: { utilization?: number; resets_at?: string }
  seven_day?: { utilization?: number; resets_at?: string }
}

function readToken(): { token: string; expiresAt?: number } | undefined {
  try {
    const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8')) as ClaudeCredentials
    const token = credentials.claudeAiOauth?.accessToken?.trim()
    if (!token) return undefined
    return { token, expiresAt: credentials.claudeAiOauth?.expiresAt }
  } catch {
    return undefined
  }
}

function labelFor(kind: string): string {
  if (kind === 'session' || kind === 'five_hour') return 'Current session'
  if (kind === 'seven_day' || kind === 'weekly_all') return 'Weekly limit'
  return kind.replaceAll('_', ' ')
}

function parseReset(value?: string): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined
  return new Date(value).toISOString()
}

function parseUsage(response: ClaudeResponse): UsageLimit[] {
  const limits = (response.limits ?? []).flatMap((limit) => {
    if (typeof limit.percent !== 'number' || !Number.isFinite(limit.percent) || !limit.kind) return []
    return [{
      id: limit.kind,
      label: labelFor(limit.kind),
      percent: Math.min(100, Math.max(0, limit.percent)),
      resetsAt: parseReset(limit.resets_at)
    }]
  })

  for (const [id, fallback] of [['session', response.five_hour], ['weekly', response.seven_day]] as const) {
    if (!fallback || typeof fallback.utilization !== 'number' || !Number.isFinite(fallback.utilization)) continue
    if (limits.some((limit) => limit.id === id || (id === 'session' && limit.id === 'five_hour'))) continue
    limits.push({
      id,
      label: id === 'session' ? 'Current session' : 'Weekly limit',
      percent: Math.min(100, Math.max(0, fallback.utilization)),
      resetsAt: parseReset(fallback.resets_at)
    })
  }

  return limits.sort((a, b) => (a.id === 'session' || a.id === 'five_hour' ? -1 : b.id === 'session' || b.id === 'five_hour' ? 1 : 0))
}

export class ClaudeProviderAdapter implements ProviderAdapter {
  readonly id = 'claude'
  readonly name = 'Claude'
  private connected = true

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async isConnected(): Promise<boolean> {
    return this.connected && Boolean(readToken())
  }

  async getUsage(): Promise<ProviderSnapshot> {
    if (!this.connected) {
      return { providerId: this.id, status: 'disconnected', limits: [], lastUpdatedAt: new Date().toISOString() }
    }

    const credentials = readToken()
    if (!credentials) {
      return {
        providerId: this.id,
        status: 'unavailable',
        limits: [],
        lastUpdatedAt: new Date().toISOString(),
        error: 'Claude Code session not found. Sign in with Claude Code first.'
      }
    }
    if (typeof credentials.expiresAt === 'number' && credentials.expiresAt <= Date.now()) {
      return {
        providerId: this.id,
        status: 'unavailable',
        limits: [],
        lastUpdatedAt: new Date().toISOString(),
        error: 'Claude Code session expired. Run Claude Code to sign in again.'
      }
    }

    try {
      const response = await fetch(ENDPOINT, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${credentials.token}`,
          'anthropic-beta': 'oauth-2025-04-20'
        },
        signal: AbortSignal.timeout(15_000)
      })
      if (response.status === 401 || response.status === 403) {
        return {
          providerId: this.id,
          status: 'error',
          limits: [],
          lastUpdatedAt: new Date().toISOString(),
          error: 'Claude rejected its local session. Sign in again with Claude Code.'
        }
      }
      if (!response.ok) throw new Error(`Claude usage request failed with HTTP ${response.status}`)

      const limits = parseUsage((await response.json()) as ClaudeResponse)
      if (limits.length === 0) {
        return {
          providerId: this.id,
          status: 'unavailable',
          limits: [],
          lastUpdatedAt: new Date().toISOString(),
          error: 'Claude reported no usage windows for this account.'
        }
      }
      return { providerId: this.id, status: 'connected', limits, lastUpdatedAt: new Date().toISOString() }
    } catch (error) {
      return {
        providerId: this.id,
        status: 'error',
        limits: [],
        lastUpdatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unable to read Claude usage.'
      }
    }
  }
}
