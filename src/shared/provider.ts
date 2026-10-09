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

export interface UsageTrend {
  limitId: string
  observedSince: string
  consumedLast24Hours?: number
  averageDailyConsumption?: number
  burnRatePerHour?: number
  estimatedExhaustionAt?: string
  projectedPercentAtReset?: number
}

export interface ProviderListPrice {
  amount: number
  currency: string
  interval: 'month'
  asOf: string
}

export interface LocalAnalyticsMetric {
  label: string
  value: string
}

export interface ProviderAnalytics {
  trends: UsageTrend[]
  listPrice?: ProviderListPrice
  localMetrics?: LocalAnalyticsMetric[]
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
  analytics?: ProviderAnalytics
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
