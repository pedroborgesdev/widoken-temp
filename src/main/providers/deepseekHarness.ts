import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { JSON_SCHEMA, load } from 'js-yaml'

export const DEEPSEEK_ISSUER = 'https://platform.deepseek.com'
export const HARNESS_ACCOUNT_RECORD = 'deepseek-account-platform/default'
export const HARNESS_SUMMARY_ENDPOINT = 'https://platform.deepseek.com/api/v0/users/get_user_summary'
export const HARNESS_CREDENTIAL_FILENAME = '.credentials.yaml'
export const MAX_HARNESS_TOKEN_LENGTH = 4096

export interface HarnessGrant {
  token: string
  issuer: typeof DEEPSEEK_ISSUER
}

export interface BalanceObservation {
  currency: string
  remaining: number
}

export type HarnessClientPlatform = 'desktop-win' | 'desktop-mac' | 'web'

const TOKEN_PATTERN = /^[\x21-\x7e]+$/
const CURRENCY_PATTERN = /^[A-Z]{3}$/
const PLATFORM_CURRENCIES = new Set(['USD', 'CNY'])

export function harnessCredentialPath(
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir()
): string {
  const configuredRoot = env.DSH_HOME?.trim()
  const root = configuredRoot && configuredRoot.length > 0 ? configuredRoot : join(home, '.dsh')
  return join(root, HARNESS_CREDENTIAL_FILENAME)
}

/** Validates the harness grant record. Invalid or foreign issuers are rejected outright. */
export function parseHarnessGrant(document: unknown): HarnessGrant | undefined {
  if (!document || typeof document !== 'object') return undefined
  const records = (document as { records?: unknown }).records
  const container = records && typeof records === 'object'
    ? records as Record<string, unknown>
    : document as Record<string, unknown>
  const record = container[HARNESS_ACCOUNT_RECORD]
  if (!record || typeof record !== 'object') return undefined
  const { kind, payload } = record as { kind?: unknown; payload?: unknown }
  if (kind !== 'grant' || !payload || typeof payload !== 'object') return undefined
  const { token, issuer } = payload as { token?: unknown; issuer?: unknown }
  if (issuer !== DEEPSEEK_ISSUER) return undefined
  if (typeof token !== 'string') return undefined
  const trimmed = token.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_HARNESS_TOKEN_LENGTH) return undefined
  if (!TOKEN_PATTERN.test(trimmed)) return undefined
  return { token: trimmed, issuer: DEEPSEEK_ISSUER }
}

export interface ReadHarnessGrantOptions {
  env?: NodeJS.ProcessEnv
  home?: string
  readFile?: (path: string) => Promise<string>
}

/** Reads the read-only harness credential file. Missing or malformed files resolve to undefined. */
export async function readHarnessGrant(options: ReadHarnessGrantOptions = {}): Promise<HarnessGrant | undefined> {
  const readFile = options.readFile ?? ((path: string) => fs.readFile(path, 'utf8'))
  let contents: string
  try {
    contents = await readFile(harnessCredentialPath(options.env ?? process.env, options.home ?? homedir()))
  } catch {
    return undefined
  }
  try {
    return parseHarnessGrant(load(contents, { schema: JSON_SCHEMA }))
  } catch {
    return undefined
  }
}

export function harnessClientPlatform(platform: NodeJS.Platform = process.platform): HarnessClientPlatform {
  if (platform === 'win32') return 'desktop-win'
  if (platform === 'darwin') return 'desktop-mac'
  return 'web'
}

export interface HarnessHeaderOptions {
  platform?: NodeJS.Platform
  version?: string
  locale?: string
  timezoneOffsetSeconds?: number
}

/** Headers for the DeepSeek platform summary endpoint. The token never leaves the main process. */
export function harnessHeaders(token: string, options: HarnessHeaderOptions = {}): Record<string, string> {
  const timezoneOffsetSeconds = options.timezoneOffsetSeconds ?? -new Date().getTimezoneOffset() * 60
  return {
    Accept: 'application/json',
    'x-dsh-auth-token': token,
    'x-client-bundle-id': '',
    'x-client-platform': harnessClientPlatform(options.platform),
    'x-client-version': options.version ?? '1.0.0',
    'x-client-locale': options.locale === 'zh_CN' ? 'zh_CN' : 'en_US',
    'x-client-timezone-offset': String(Math.trunc(timezoneOffsetSeconds))
  }
}

function walletAmount(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function walletList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function platformSessionRejected(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  return (payload as { code?: unknown }).code === 40003
}

/** Returns the platform response code when the envelope is well formed, otherwise undefined. */
export function platformResponseCode(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const code = (payload as { code?: unknown }).code
  return typeof code === 'number' && Number.isFinite(code) ? code : undefined
}

/**
 * Sums normal and bonus wallets per currency from the DeepSeek platform summary envelope.
 * Returns an empty list for malformed envelopes or currencies other than USD/CNY.
 */
export function parsePlatformSummary(payload: unknown): BalanceObservation[] {
  if (!payload || typeof payload !== 'object') return []
  const data = (payload as { data?: unknown }).data
  if (!data || typeof data !== 'object') return []
  const { biz_code: bizCode, biz_data: bizData } = data as { biz_code?: unknown; biz_data?: unknown }
  if (bizCode !== 0 || !bizData || typeof bizData !== 'object') return []
  const { normal_wallets: normalWallets, bonus_wallets: bonusWallets } = bizData as {
    normal_wallets?: unknown
    bonus_wallets?: unknown
  }
  const totals = new Map<string, number>()
  for (const wallet of [...walletList(normalWallets), ...walletList(bonusWallets)]) {
    if (!wallet || typeof wallet !== 'object') continue
    const { currency: rawCurrency, balance } = wallet as { currency?: unknown; balance?: unknown }
    const currency = typeof rawCurrency === 'string' ? rawCurrency.trim().toUpperCase() : ''
    const amount = walletAmount(balance)
    if (!CURRENCY_PATTERN.test(currency) || !PLATFORM_CURRENCIES.has(currency) || amount === undefined) continue
    totals.set(currency, (totals.get(currency) ?? 0) + amount)
  }
  return [...totals.entries()]
    .map(([currency, remaining]) => ({ currency, remaining }))
    .sort((left, right) => left.currency.localeCompare(right.currency))
}
