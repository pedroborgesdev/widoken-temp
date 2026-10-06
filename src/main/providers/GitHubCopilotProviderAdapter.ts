import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ProviderSnapshot, UsageLimit } from '@shared/provider'
import type { ProviderAdapter } from './ProviderAdapter'

const ENDPOINT = 'https://api.github.com/copilot_internal/user'
const execFileAsync = promisify(execFile)

interface CopilotQuota {
  entitlement?: number
  remaining?: number
  used?: number
  unlimited?: boolean
  reset_date?: string | number
  reset_at?: string | number
  resets_at?: string | number
}

interface CopilotResponse {
  copilot_plan?: string
  plan?: string
  quota_reset_date?: string | number
  quota_snapshots?: Record<string, CopilotQuota>
}

function configPath(): string {
  if (process.env.GH_CONFIG_DIR) return join(process.env.GH_CONFIG_DIR, 'hosts.yml')
  if (process.env.XDG_CONFIG_HOME) return join(process.env.XDG_CONFIG_HOME, 'gh', 'hosts.yml')
  return join(homedir(), '.config', 'gh', 'hosts.yml')
}

function parseHosts(text: string): string | undefined {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === 'github.com:')
  if (start < 0) return undefined

  for (const line of lines.slice(start + 1)) {
    if (line && !line.startsWith(' ') && !line.startsWith('\t')) break
    const match = line.trim().match(/^oauth_token:\s*["']?([^"']+?)["']?$/)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

async function readToken(): Promise<{ token: string; source: string } | undefined> {
  const environmentToken = process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim()
  if (environmentToken) return { token: environmentToken, source: 'GitHub' }

  try {
    const token = parseHosts(readFileSync(configPath(), 'utf8'))
    if (token) return { token, source: 'GitHub CLI' }
  } catch {
    // GitHub CLI may keep the token in the OS credential store instead.
  }

  try {
    const result = await execFileAsync('gh', ['auth', 'token', '--hostname', 'github.com'], {
      timeout: 10_000,
      maxBuffer: 16_384,
      windowsHide: true
    })
    const token = result.stdout.trim()
    return token ? { token, source: 'GitHub CLI' } : undefined
  } catch {
    return undefined
  }
}

function resetDate(value: string | number | undefined): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return new Date(value > 10_000_000_000 ? value : value * 1000).toISOString()
  }
  if (typeof value === 'string') {
    const timestamp = Date.parse(value)
    if (!Number.isNaN(timestamp)) return new Date(timestamp).toISOString()
    const date = Date.parse(`${value}T00:00:00Z`)
    if (!Number.isNaN(date)) return new Date(date).toISOString()
  }
  return undefined
}

function labelFor(id: string): string {
  switch (id) {
    case 'premium_interactions': return 'Premium requests'
    case 'chat': return 'Chat requests'
    case 'completions': return 'Completions'
    default: return id.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  }
}

function parseUsage(response: CopilotResponse): UsageLimit[] {
  const quotas = response.quota_snapshots ?? {}
  const orderedIds = ['premium_interactions', 'chat', 'completions', ...Object.keys(quotas).sort()]
  const uniqueIds = [...new Set(orderedIds)]

  return uniqueIds.flatMap<UsageLimit>((id) => {
    const quota = quotas[id]
    if (!quota) return []
    const unlimited = quota.unlimited === true || quota.entitlement === -1
    if (unlimited) {
      return [{
        id,
        label: labelFor(id),
        percent: 0,
        resetsAt: resetDate(quota.reset_date ?? quota.reset_at ?? quota.resets_at ?? response.quota_reset_date),
        used: typeof quota.used === 'number' ? quota.used : undefined,
        unlimited: true
      }]
    }
    if (typeof quota.entitlement !== 'number' || quota.entitlement <= 0) return []
    const used = typeof quota.used === 'number'
      ? quota.used
      : Math.max(0, quota.entitlement - (quota.remaining ?? quota.entitlement))
    return [{
      id,
      label: labelFor(id),
      percent: Math.min(100, Math.max(0, (used / quota.entitlement) * 100)),
      resetsAt: resetDate(quota.reset_date ?? quota.reset_at ?? quota.resets_at ?? response.quota_reset_date),
      used,
      limit: quota.entitlement,
      remaining: typeof quota.remaining === 'number'
        ? Math.max(0, quota.remaining)
        : Math.max(0, quota.entitlement - used)
    }]
  })
}

export class GitHubCopilotProviderAdapter implements ProviderAdapter {
  readonly id = 'copilot'
  readonly name = 'GitHub Copilot'
  private connected = true

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async isConnected(): Promise<boolean> {
    return this.connected && Boolean(await readToken())
  }

  async getUsage(): Promise<ProviderSnapshot> {
    if (!this.connected) {
      return { providerId: this.id, status: 'disconnected', limits: [], lastUpdatedAt: new Date().toISOString() }
    }

    const credentials = await readToken()
    if (!credentials) {
      return {
        providerId: this.id,
        status: 'unavailable',
        limits: [],
        lastUpdatedAt: new Date().toISOString(),
        error: 'GitHub session not found. Run gh auth login first.'
      }
    }

    try {
      const response = await fetch(ENDPOINT, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${credentials.token}`,
          'User-Agent': 'widoken',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        signal: AbortSignal.timeout(15_000)
      })
      if (response.status === 401 || response.status === 403) {
        return {
          providerId: this.id,
          status: 'error',
          limits: [],
          lastUpdatedAt: new Date().toISOString(),
          error: 'GitHub rejected the local session. Run gh auth login again.'
        }
      }
      if (!response.ok) throw new Error(`GitHub Copilot request failed with HTTP ${response.status}`)

      const payload = (await response.json()) as CopilotResponse
      const limits = parseUsage(payload)
      if (limits.length === 0) {
        return {
          providerId: this.id,
          status: 'unavailable',
          limits: [],
          lastUpdatedAt: new Date().toISOString(),
          error: 'GitHub Copilot reported no metered quotas for this account.'
        }
      }
      return {
        providerId: this.id,
        status: 'connected',
        limits,
        lastUpdatedAt: new Date().toISOString(),
        plan: payload.copilot_plan ?? payload.plan
      }
    } catch (error) {
      return {
        providerId: this.id,
        status: 'error',
        limits: [],
        lastUpdatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unable to read GitHub Copilot usage.'
      }
    }
  }
}
