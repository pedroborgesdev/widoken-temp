import type { ProviderView } from '@shared/provider'
import { PROVIDER_USAGE_LIMITS } from '@shared/providerUsage'
import type { ProviderSetting } from '@shared/settings'
import type { UsageHistory, UsageHistorySeries, UsageHistoryUnit } from '@shared/usageHistory'
import { providerName } from '../../utils/providerBranding'
import { readableName } from '../../utils/usageFormat'

const SERIES_COLORS = ['#8b93a7', '#c084fc', '#ef6b73', '#3ecfb2', '#e7c065', '#8fd14f', '#6cb6ff', '#f0a05a']

const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const amountFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const countFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function formatDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return dayFormat.format(new Date(year, (month ?? 1) - 1, date ?? 1))
}

export function formatAmount(value: number, unit: UsageHistoryUnit): string {
  if (unit === 'percent') return `${amountFormat.format(value)}%`
  return countFormat.format(value)
}

export function limitLabel(providerId: string, limitId: string, providers: ProviderView[]): string {
  const fromSnapshot = providers
    .find((provider) => provider.id === providerId)
    ?.snapshot.limits.find((limit) => limit.id === limitId)?.label
  if (fromSnapshot) return fromSnapshot
  const option = PROVIDER_USAGE_LIMITS[providerId]?.find((candidate) =>
    candidate.id === limitId || candidate.aliases?.includes(limitId))
  return option?.label ?? readableName(limitId)
}

export function lastActivityLabel(value: string | undefined, now: number): string {
  if (!value) return '—'
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return '—'
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 45) return minutes === 1 ? 'about 1 minute ago' : `about ${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return hours === 1 ? 'about 1 hour ago' : `about ${hours} hours ago`
  const days = Math.round(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export function seriesKey(series: UsageHistorySeries): string {
  return `${series.providerId}:${series.limitId}`
}

export function seriesColor(all: UsageHistorySeries[], item: UsageHistorySeries): string {
  const ordered = [...all].sort((left, right) =>
    left.providerId.localeCompare(right.providerId) || left.limitId.localeCompare(right.limitId))
  const index = ordered.findIndex((candidate) => seriesKey(candidate) === seriesKey(item))
  return SERIES_COLORS[(index < 0 ? 0 : index) % SERIES_COLORS.length]
}

/** Series ordered like the widget, narrowed by the provider/limit filter text. */
export function filterUsageSeries(
  history: UsageHistory,
  providers: ProviderView[],
  providerOrder: ProviderSetting[],
  filter: string
): UsageHistorySeries[] {
  const order = new Map(providerOrder.map((provider) => [provider.id, provider.order]))
  const query = filter.trim().toLowerCase()
  return [...history.series]
    .sort((left, right) =>
      (order.get(left.providerId) ?? 99) - (order.get(right.providerId) ?? 99)
      || left.limitId.localeCompare(right.limitId))
    .filter((series) => {
      if (!query) return true
      const label = `${providerName(series.providerId)} ${limitLabel(series.providerId, series.limitId, providers)}`
      return label.toLowerCase().includes(query)
    })
}
