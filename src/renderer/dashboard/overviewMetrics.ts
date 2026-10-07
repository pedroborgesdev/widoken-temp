import { clampPercent, type ProviderView } from '@shared/provider'
import type { ProviderSetting } from '@shared/settings'
import { usageHistoryDay, type UsageHistory } from '@shared/usageHistory'

export interface UsageLimitRef {
  providerId: string
  limitId: string
  label: string
}

export interface OverviewMetrics {
  providers: { total: number; connected: number; unavailable: number; off: number }
  highest?: UsageLimitRef & { percent: number }
  nextReset?: UsageLimitRef & { inMilliseconds: number }
  activeProviderIds: string[]
  today: number
  averagePerActiveDay?: number
  busiest?: { day: string; quota: number }
  trackedDays: number
  since?: string
  listPrice?: { amount: number; currency: string; plans: number }
}

export function overviewMetrics(
  settings: ProviderSetting[],
  providers: ProviderView[],
  history: UsageHistory,
  now: number
): OverviewMetrics {
  const views = new Map(providers.map((provider) => [provider.id, provider]))
  const counts = { total: settings.length, connected: 0, unavailable: 0, off: 0 }
  for (const setting of settings) {
    const status = views.get(setting.id)?.snapshot.status
    if (!setting.enabled) counts.off += 1
    else if (status === 'connected') counts.connected += 1
    else if (status && status !== 'loading') counts.unavailable += 1
  }

  const connected = providers.filter((provider) => provider.snapshot.status === 'connected')
  let highest: OverviewMetrics['highest']
  let nextReset: OverviewMetrics['nextReset']
  for (const provider of connected) {
    for (const limit of provider.snapshot.limits) {
      if (limit.unlimited) continue
      const percent = clampPercent(limit.percent)
      if (!highest || percent > highest.percent) {
        highest = { providerId: provider.id, limitId: limit.id, label: limit.label, percent }
      }
      const resetsAt = limit.resetsAt ? Date.parse(limit.resetsAt) : Number.NaN
      if (Number.isFinite(resetsAt) && resetsAt > now && (!nextReset || resetsAt - now < nextReset.inMilliseconds)) {
        nextReset = { providerId: provider.id, limitId: limit.id, label: limit.label, inMilliseconds: resetsAt - now }
      }
    }
  }

  const quotaByDay = new Map<string, number>()
  for (const series of history.series) {
    for (const point of series.points) quotaByDay.set(point.day, (quotaByDay.get(point.day) ?? 0) + point.quota)
  }
  const activeDays = [...quotaByDay.entries()].filter(([, quota]) => quota > 0)
  const total = activeDays.reduce((sum, [, quota]) => sum + quota, 0)
  const busiest = activeDays.reduce<OverviewMetrics['busiest']>(
    (best, [day, quota]) => (!best || quota > best.quota ? { day, quota } : best),
    undefined
  )

  const since = history.since ? Date.parse(history.since) : Number.NaN
  const firstDay = Number.isFinite(since) ? usageHistoryDay(since) : undefined
  const trackedDays = firstDay
    ? Math.max(1, Math.round((localMidnight(usageHistoryDay(now)) - localMidnight(firstDay)) / 86_400_000) + 1)
    : 0

  const prices = connected.flatMap((provider) => provider.snapshot.analytics?.listPrice ?? [])
  const currency = prices[0]?.currency
  const sameCurrency = prices.filter((price) => price.currency === currency)

  return {
    providers: counts,
    highest,
    nextReset,
    activeProviderIds: providers
      .filter((provider) => provider.activity === 'active' && settings.some((setting) => setting.id === provider.id && setting.enabled))
      .map((provider) => provider.id),
    today: round(quotaByDay.get(usageHistoryDay(now)) ?? 0),
    averagePerActiveDay: activeDays.length > 0 ? round(total / activeDays.length) : undefined,
    busiest: busiest && { day: busiest.day, quota: round(busiest.quota) },
    trackedDays,
    since: firstDay,
    listPrice: currency
      ? { amount: sameCurrency.reduce((sum, price) => sum + price.amount, 0), currency, plans: sameCurrency.length }
      : undefined
  }
}

function localMidnight(day: string): number {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, date ?? 1).getTime()
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
