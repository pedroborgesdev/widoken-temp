export type ProviderStatus =
  | 'loading'
  | 'connected'
  | 'disconnected'
  | 'unavailable'
  | 'error'

export interface UsageLimit {
  id: string
  label: string
  percent: number
  currency?: string
  resetsAt?: string
  used?: number
  limit?: number
  remaining?: number
  unlimited?: boolean
}

export interface ProviderListPrice {
  amount: number
  currency: string
  interval: 'month'
  asOf: string
}

export const PROVIDER_AUTH_SOURCES = ['harness-account', 'api-key'] as const
export type ProviderAuthSource = (typeof PROVIDER_AUTH_SOURCES)[number]

export interface ProviderSnapshot {
  providerId: string
  status: ProviderStatus
  limits: UsageLimit[]
  lastUpdatedAt: string
  plan?: string
  isUnlimited?: boolean
  /** Reference monthly list price for the reported plan, when it is known. */
  listPrice?: ProviderListPrice
  error?: string
  authSource?: ProviderAuthSource
}

export interface ProviderDescriptor {
  id: string
  name: string
}

export interface ProviderView extends ProviderDescriptor {
  snapshot: ProviderSnapshot
  activity?: 'idle' | 'active'
}

export function isMonetaryBalance(limit: UsageLimit): boolean {
  return typeof limit.currency === 'string'
    && limit.currency.length > 0
    && typeof limit.remaining === 'number'
}

export function clampPercent(percent: number): number {
  return Math.min(100, Math.max(0, percent))
}

export function summaryUsage(limits: UsageLimit[]): number {
  const meteredLimits = limits.filter((limit) => !limit.unlimited)
  return meteredLimits.length === 0 ? 0 : Math.max(...meteredLimits.map((limit) => clampPercent(limit.percent)))
}

export type UsageSeverity = 'success' | 'warning' | 'danger'

export function getUsageSeverity(percent: number): UsageSeverity {
  if (percent >= 75) return 'danger'
  if (percent >= 50) return 'warning'
  return 'success'
}
