import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ProviderSnapshot, UsageLimit } from '@shared/provider'
import type { ProviderAdapter } from './ProviderAdapter'

const ENDPOINT = 'https://cursor.com/api/usage-summary'
const DATABASE_PATH = join(homedir(), '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb')

interface CursorUsageResponse {
  billingCycleEnd?: string
  membershipType?: string
  isUnlimited?: boolean
  individualUsage?: {
    plan?: {
      autoPercentUsed?: number
      apiPercentUsed?: number
    }
    onDemand?: {
      enabled?: boolean
      used?: number
      limit?: number | null
    }
    overall?: {
      enabled?: boolean
      used?: number
      limit?: number | null
    }
  }
}

function readItem(database: Database.Database, key: string): string | undefined {
  const row = database.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key) as { value?: string } | undefined
  return row?.value || undefined
}

function readCredentials(): { cookie: string; plan?: string } | undefined {
  if (!existsSync(DATABASE_PATH)) return undefined

  let database: Database.Database | undefined
  try {
    database = new Database(DATABASE_PATH, { readonly: true, fileMustExist: true })
    const token = readItem(database, 'cursorAuth/accessToken')
    const authId = readItem(database, 'cursorAuth/stripeMembershipAuthId')
    const plan = readItem(database, 'cursorAuth/stripeMembershipType')
    if (!token || !authId) return undefined
    return { cookie: `WorkosCursorSessionToken=${authId}::${token}`, plan }
  } catch {
    return undefined
  } finally {
    database?.close()
  }
}

function parseReset(value?: string): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined
  return new Date(value).toISOString()
}

function percentLimit(
  id: string,
  label: string,
  percent: number | undefined,
  resetsAt: string | undefined
): UsageLimit | undefined {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return undefined
  return { id, label, percent: Math.min(100, Math.max(0, percent)), resetsAt }
}

function spendLimit(
  id: string,
  label: string,
  bucket: { enabled?: boolean; used?: number; limit?: number | null } | undefined,
  resetsAt: string | undefined
): UsageLimit | undefined {
  if (!bucket?.enabled || typeof bucket.used !== 'number' || typeof bucket.limit !== 'number' || bucket.limit <= 0) {
    return undefined
  }
  return {
    ...percentLimit(id, label, (bucket.used / bucket.limit) * 100, resetsAt)!,
    used: bucket.used,
    limit: bucket.limit,
    remaining: Math.max(0, bucket.limit - bucket.used)
  }
}

function parseUsage(response: CursorUsageResponse): UsageLimit[] {
  const resetsAt = parseReset(response.billingCycleEnd)
  const plan = response.individualUsage?.plan
  const limits = [
    percentLimit('auto', 'Auto usage', plan?.autoPercentUsed, resetsAt),
    plan?.apiPercentUsed && plan.apiPercentUsed > 0
      ? percentLimit('api', 'API usage', plan.apiPercentUsed, resetsAt)
      : undefined,
    spendLimit('on-demand', 'On-demand usage', response.individualUsage?.onDemand, resetsAt),
    spendLimit('included', 'Included usage', response.individualUsage?.overall, resetsAt)
  ].filter((limit): limit is UsageLimit => Boolean(limit))

  return limits
}

export class CursorProviderAdapter implements ProviderAdapter {
  readonly id = 'cursor'
  readonly name = 'Cursor'
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
        error: 'Cursor session not found. Sign in through the Cursor editor.'
      }
    }

    try {
      const response = await fetch(ENDPOINT, {
        headers: { Accept: 'application/json', Cookie: credentials.cookie },
        signal: AbortSignal.timeout(15_000)
      })
      if (response.status === 401 || response.status === 403) {
        return {
          providerId: this.id,
          status: 'error',
          limits: [],
          lastUpdatedAt: new Date().toISOString(),
          error: 'Cursor rejected its local session. Sign in again in Cursor.'
        }
      }
      if (!response.ok) throw new Error(`Cursor usage request failed with HTTP ${response.status}`)

      const payload = (await response.json()) as CursorUsageResponse
      const limits = parseUsage(payload)
      if (limits.length === 0) {
        return {
          providerId: this.id,
          status: 'unavailable',
          limits: [],
          lastUpdatedAt: new Date().toISOString(),
          error: 'Cursor reported no metered usage for this plan.'
        }
      }
      return {
        providerId: this.id,
        status: 'connected',
        limits,
        lastUpdatedAt: new Date().toISOString(),
        plan: payload.membershipType ?? credentials.plan,
        isUnlimited: payload.isUnlimited === true
      }
    } catch (error) {
      return {
        providerId: this.id,
        status: 'error',
        limits: [],
        lastUpdatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unable to read Cursor usage.'
      }
    }
  }
}
