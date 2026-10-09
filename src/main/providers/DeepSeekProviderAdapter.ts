import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import type { ProviderAuthSource, ProviderSnapshot, UsageLimit } from '@shared/provider'
import type { CredentialSource, ProviderSetting } from '@shared/settings'
import type { ProviderAdapter } from './ProviderAdapter'
import {
  HARNESS_SUMMARY_ENDPOINT,
  harnessHeaders,
  parsePlatformSummary,
  platformResponseCode,
  platformSessionRejected,
  readHarnessGrant,
  type BalanceObservation,
  type HarnessGrant,
  type HarnessHeaderOptions
} from './deepseekHarness'

const API_KEY_ENDPOINT = 'https://api.deepseek.com/user/balance'
const REQUEST_TIMEOUT_MS = 15_000
const CURRENCY_PATTERN = /^[A-Z]{3}$/
const AUTH_SOURCES: readonly ProviderAuthSource[] = ['harness-account', 'api-key']

/** Marks states written with the baseline rule; anything else is legacy and gets rebased. */
export const DEEPSEEK_BASELINE_VERSION = 2

export interface DeepSeekBalanceInfo {
  currency?: unknown
  total_balance?: unknown
}

export interface DeepSeekBalanceResponse {
  is_available?: unknown
  balance_infos?: unknown
}

export interface BalanceState {
  capacity: number
  remaining: number
  baselineVersion: typeof DEEPSEEK_BASELINE_VERSION
}

/** Persisted key format is `${authSource}:${currency}` so accounts never mix. */
export type BalanceStates = Record<string, BalanceState>

export interface DeepSeekApiKeyStore {
  getApiKey(): Promise<string | undefined>
  hasApiKey(): Promise<boolean>
}

export interface DeepSeekAdapterOptions {
  statePath?: string
  apiKeys?: DeepSeekApiKeyStore
  readHarnessGrant?: () => Promise<HarnessGrant | undefined>
  fetchImpl?: typeof fetch
  env?: NodeJS.ProcessEnv
  harnessHeaders?: HarnessHeaderOptions
}

type SourceAttempt =
  | { ok: true; source: ProviderAuthSource; balances: BalanceObservation[] }
  | { ok: false; source: ProviderAuthSource; status: 'unavailable' | 'error'; error: string }

function amount(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Parses the API key `/user/balance` envelope. */
export function parseDeepSeekBalances(payload: DeepSeekBalanceResponse): BalanceObservation[] {
  if (!payload || typeof payload !== 'object') return []
  if (!Array.isArray(payload.balance_infos)) return []
  const balances = new Map<string, BalanceObservation>()
  for (const candidate of payload.balance_infos) {
    if (!candidate || typeof candidate !== 'object') continue
    const info = candidate as DeepSeekBalanceInfo
    const currency = typeof info.currency === 'string' ? info.currency.trim().toUpperCase() : ''
    const remaining = amount(info.total_balance)
    if (!CURRENCY_PATTERN.test(currency) || remaining === undefined) continue
    balances.set(currency, { currency, remaining })
  }
  return [...balances.values()].sort((left, right) => left.currency.localeCompare(right.currency))
}

function normalizeStateKey(rawKey: string): string | undefined {
  const separator = rawKey.indexOf(':')
  if (separator < 0) {
    // Legacy stage-one format stored plain currencies for the API key source.
    return CURRENCY_PATTERN.test(rawKey) ? `api-key:${rawKey}` : undefined
  }
  const source = rawKey.slice(0, separator)
  const currency = rawKey.slice(separator + 1)
  if (!AUTH_SOURCES.includes(source as ProviderAuthSource) || !CURRENCY_PATTERN.test(currency)) return undefined
  return `${source}:${currency}`
}

/**
 * Applies the observed baseline rule for one auth source and currency.
 *
 * The first observation sets the capacity to the current balance. While the
 * balance falls or stays equal, the capacity is kept and the used percentage is
 * measured against it. When the balance grows above the previously observed
 * balance, the whole capacity is replaced by the new balance (a recharge), so
 * the usage resets to zero. A first observation at zero stays fully depleted.
 */
export function applyDeepSeekBaseline(
  previous: BalanceState | undefined,
  remaining: number
): { state: BalanceState; limit: Pick<UsageLimit, 'percent' | 'used' | 'limit' | 'remaining'> } {
  const current = isNonNegativeFinite(remaining) ? remaining : 0
  const recharged = previous !== undefined && current > previous.remaining
  const capacity = previous === undefined || recharged ? current : previous.capacity
  const used = Math.max(0, capacity - current)
  const percent = capacity > 0 ? Math.min(100, Math.max(0, (used / capacity) * 100)) : 100
  return {
    state: { capacity, remaining: current, baselineVersion: DEEPSEEK_BASELINE_VERSION },
    limit: { percent, used, limit: capacity, remaining: current }
  }
}

/**
 * Normalizes persisted state. Legacy entries (no baseline marker) keep their
 * migrated `authSource:currency` key but reset the capacity to the persisted
 * remaining balance, so this version never inherits an old capacity.
 */
export function sanitizeBalanceStates(value: unknown): BalanceStates {
  if (!value || typeof value !== 'object') return {}
  const result: BalanceStates = {}
  for (const [rawKey, candidate] of Object.entries(value)) {
    if (!candidate || typeof candidate !== 'object') continue
    const key = normalizeStateKey(rawKey)
    if (!key) continue
    const { capacity, remaining, baselineVersion } = candidate as Partial<BalanceState>
    if (!isNonNegativeFinite(remaining)) continue
    const isCurrent = baselineVersion === DEEPSEEK_BASELINE_VERSION && isNonNegativeFinite(capacity)
    result[key] = {
      capacity: isCurrent ? capacity : remaining,
      remaining,
      baselineVersion: DEEPSEEK_BASELINE_VERSION
    }
  }
  return result
}

function needsMigration(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  for (const [rawKey, candidate] of Object.entries(value)) {
    if (normalizeStateKey(rawKey) !== rawKey) return true
    if (!candidate || typeof candidate !== 'object') continue
    const { baselineVersion } = candidate as Partial<BalanceState>
    if (baselineVersion !== DEEPSEEK_BASELINE_VERSION) return true
  }
  return false
}

function failureSnapshot(
  providerId: string,
  attempt: Extract<SourceAttempt, { ok: false }>,
  lastUpdatedAt: string
): ProviderSnapshot {
  return {
    providerId,
    status: attempt.status,
    limits: [],
    lastUpdatedAt,
    error: attempt.error
  }
}

export class DeepSeekProviderAdapter implements ProviderAdapter {
  readonly id = 'deepseek'
  readonly name = 'DeepSeek'
  private connected = true
  private states: BalanceStates | undefined
  private mode: CredentialSource = 'auto'
  private preferred: ProviderAuthSource = 'harness-account'
  private readonly fetchImpl: typeof fetch
  private readonly env: NodeJS.ProcessEnv

  constructor(private readonly options: DeepSeekAdapterOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.env = options.env ?? process.env
  }

  configure(setting: ProviderSetting): void {
    const next = setting.credentialSource ?? 'auto'
    if (next === this.mode) return
    this.mode = next
    this.preferred = next === 'api-key' ? 'api-key' : 'harness-account'
  }

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async isConnected(): Promise<boolean> {
    return this.connected
  }

  async getUsage(): Promise<ProviderSnapshot> {
    const lastUpdatedAt = new Date().toISOString()
    if (!this.connected) {
      return { providerId: this.id, status: 'disconnected', limits: [], lastUpdatedAt }
    }

    let firstFailure: Extract<SourceAttempt, { ok: false }> | undefined
    for (const source of this.sourceOrder()) {
      const attempt = source === 'harness-account'
        ? await this.attemptHarnessAccount()
        : await this.attemptApiKey()
      if (attempt.ok) {
        this.preferred = source
        return this.connectedSnapshot(source, attempt.balances, lastUpdatedAt)
      }
      firstFailure ??= attempt
    }

    return firstFailure
      ? failureSnapshot(this.id, firstFailure, lastUpdatedAt)
      : { providerId: this.id, status: 'unavailable', limits: [], lastUpdatedAt, error: 'No DeepSeek credential source is configured.' }
  }

  private sourceOrder(): ProviderAuthSource[] {
    if (this.mode === 'harness-account') return ['harness-account']
    if (this.mode === 'api-key') return ['api-key']
    return this.preferred === 'api-key' ? ['api-key', 'harness-account'] : ['harness-account', 'api-key']
  }

  private async attemptHarnessAccount(): Promise<SourceAttempt> {
    let grant: HarnessGrant | undefined
    try {
      grant = await this.readGrant()
    } catch {
      grant = undefined
    }
    if (!grant) {
      return {
        ok: false,
        source: 'harness-account',
        status: 'unavailable',
        error: 'DeepSeek Harness account not found. Sign in with the DeepSeek harness or switch to an API key.'
      }
    }

    try {
      const response = await this.fetchImpl(HARNESS_SUMMARY_ENDPOINT, {
        redirect: 'error',
        headers: harnessHeaders(grant.token, this.options.harnessHeaders),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
      if (response.status === 401) return this.rejectedHarness()
      if (!response.ok) {
        return {
          ok: false,
          source: 'harness-account',
          status: 'error',
          error: `DeepSeek Harness request failed with HTTP ${response.status}.`
        }
      }
      const payload = await this.readJson(response)
      if (payload === undefined) {
        return { ok: false, source: 'harness-account', status: 'error', error: 'DeepSeek Harness returned an invalid response.' }
      }
      if (platformSessionRejected(payload)) return this.rejectedHarness()
      const code = platformResponseCode(payload)
      if (code !== undefined && code !== 0) {
        return { ok: false, source: 'harness-account', status: 'error', error: 'DeepSeek Harness rejected the account request.' }
      }
      const balances = parsePlatformSummary(payload)
      if (balances.length === 0) {
        return { ok: false, source: 'harness-account', status: 'unavailable', error: 'DeepSeek Harness reported no usable balance.' }
      }
      return { ok: true, source: 'harness-account', balances }
    } catch {
      return { ok: false, source: 'harness-account', status: 'error', error: 'Unable to reach the DeepSeek Harness account service.' }
    }
  }

  private async attemptApiKey(): Promise<SourceAttempt> {
    let apiKey: string | undefined
    try {
      apiKey = await this.readApiKey()
    } catch {
      apiKey = undefined
    }
    if (!apiKey) {
      return {
        ok: false,
        source: 'api-key',
        status: 'unavailable',
        error: 'DeepSeek API key not found. Save one in Widget → Providers or set DEEPSEEK_API_KEY.'
      }
    }

    try {
      const response = await this.fetchImpl(API_KEY_ENDPOINT, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          source: 'api-key',
          status: 'error',
          error: 'DeepSeek rejected the API key. Check the saved key and restart Widoken.'
        }
      }
      if (response.status === 429) {
        return {
          ok: false,
          source: 'api-key',
          status: 'error',
          error: 'DeepSeek rate limited the balance request. Try again later.'
        }
      }
      if (!response.ok) {
        return {
          ok: false,
          source: 'api-key',
          status: 'error',
          error: `DeepSeek balance request failed with HTTP ${response.status}.`
        }
      }
      const payload = await this.readJson(response)
      if (payload === undefined) {
        return { ok: false, source: 'api-key', status: 'error', error: 'DeepSeek returned an invalid balance response.' }
      }
      const balances = parseDeepSeekBalances(payload as DeepSeekBalanceResponse)
      if (balances.length === 0) {
        return { ok: false, source: 'api-key', status: 'unavailable', error: 'DeepSeek reported no valid account balance.' }
      }
      return { ok: true, source: 'api-key', balances }
    } catch {
      return { ok: false, source: 'api-key', status: 'error', error: 'Unable to reach the DeepSeek balance service.' }
    }
  }

  private rejectedHarness(): SourceAttempt {
    return {
      ok: false,
      source: 'harness-account',
      status: 'error',
      error: 'DeepSeek Harness rejected the stored session. Sign in again or switch to an API key.'
    }
  }

  private async readJson(response: Response): Promise<unknown | undefined> {
    try {
      return await response.json()
    } catch {
      return undefined
    }
  }

  private async readGrant(): Promise<HarnessGrant | undefined> {
    if (this.options.readHarnessGrant) return this.options.readHarnessGrant()
    return readHarnessGrant({ env: this.env })
  }

  private async readApiKey(): Promise<string | undefined> {
    const stored = await this.options.apiKeys?.getApiKey()
    if (stored && stored.trim().length > 0) return stored.trim()
    const environment = this.env.DEEPSEEK_API_KEY?.trim()
    return environment && environment.length > 0 ? environment : undefined
  }

  private async connectedSnapshot(
    source: ProviderAuthSource,
    balances: BalanceObservation[],
    lastUpdatedAt: string
  ): Promise<ProviderSnapshot> {
    const states = await this.loadStates()
    const limits = balances.map<UsageLimit>(({ currency, remaining }) => {
      const key = `${source}:${currency}`
      const applied = applyDeepSeekBaseline(states[key], remaining)
      states[key] = applied.state
      return {
        id: `balance-${currency.toLowerCase()}`,
        label: `${currency} balance`,
        currency,
        percent: applied.limit.percent,
        used: applied.limit.used,
        limit: applied.limit.limit,
        remaining: applied.limit.remaining
      }
    })
    await this.persistStates(states)
    return {
      providerId: this.id,
      status: 'connected',
      limits,
      lastUpdatedAt,
      plan: source === 'harness-account' ? 'Harness' : 'API',
      authSource: source
    }
  }

  private async loadStates(): Promise<BalanceStates> {
    if (this.states) return this.states
    if (!this.options.statePath) return (this.states = {})
    let parsed: unknown
    try {
      parsed = JSON.parse(await fs.readFile(this.options.statePath, 'utf8'))
    } catch {
      return (this.states = {})
    }
    this.states = sanitizeBalanceStates(parsed)
    if (needsMigration(parsed)) await this.persistStates(this.states)
    return this.states
  }

  private async persistStates(states: BalanceStates): Promise<void> {
    const statePath = this.options.statePath
    if (!statePath) return
    await fs.mkdir(dirname(statePath), { recursive: true, mode: 0o700 })
    const temporaryPath = `${statePath}.tmp`
    await fs.writeFile(temporaryPath, `${JSON.stringify(states, null, 2)}\n`, { mode: 0o600 })
    await fs.rename(temporaryPath, statePath)
  }
}
