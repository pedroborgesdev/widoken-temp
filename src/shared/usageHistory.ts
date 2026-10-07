export const USAGE_HISTORY_DAYS = 31

const RESET_TOLERANCE_MS = 5 * 60_000

export type UsageHistoryUnit = 'count' | 'percent'

export interface UsageHistorySample {
  providerId: string
  limitId: string
  capturedAt: number
  percent: number
  resetAt: number | null
  used: number | null
  limitValue: number | null
}

export interface UsageHistoryPoint {
  day: string
  /** External used delta when the provider reports one, otherwise the quota percent delta. */
  amount: number
  /** Percent of the quota, so every series shares one chart axis. */
  quota: number
}

export interface UsageHistorySeries {
  providerId: string
  limitId: string
  unit: UsageHistoryUnit
  total: number
  totalQuota: number
  lastActivityAt?: string
  points: UsageHistoryPoint[]
}

export interface UsageHistory {
  days: string[]
  series: UsageHistorySeries[]
  /** Earliest locally stored sample, even when it is older than the visible days. */
  since?: string
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function usageHistoryDay(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Inclusive local-calendar days ending on `now`, oldest first. Month boundaries stay in order. */
export function usageHistoryDays(now: number, count = USAGE_HISTORY_DAYS): string[] {
  const cursor = new Date(now)
  cursor.setHours(12, 0, 0, 0)
  const days: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(cursor)
    date.setDate(cursor.getDate() - offset)
    days.push(usageHistoryDay(date.getTime()))
  }
  return days
}

function sameCycle(previous: UsageHistorySample, current: UsageHistorySample): boolean {
  if (previous.resetAt !== null && current.resetAt !== null) {
    return Math.abs(previous.resetAt - current.resetAt) < RESET_TOLERANCE_MS
  }
  if (previous.used !== null && current.used !== null) return current.used >= previous.used
  return current.percent >= previous.percent
}

export function usageHistoryAxis(maxQuota: number): { max: number; ticks: number[] } {
  if (maxQuota <= 0) return { max: 100, ticks: [0, 25, 50, 75, 100] }
  const rough = maxQuota / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10]
    .map((candidate) => candidate * magnitude)
    .find((candidate) => candidate >= rough - 1e-9) ?? magnitude * 10
  const max = Math.ceil((maxQuota - 1e-9) / step) * step
  const count = Math.max(1, Math.round(max / step))
  return { max, ticks: Array.from({ length: count + 1 }, (_, index) => round(index * step, 2)) }
}

export function buildUsageHistory(
  samples: UsageHistorySample[],
  now: number,
  count = USAGE_HISTORY_DAYS
): UsageHistory {
  const days = usageHistoryDays(now, count)
  const visible = new Set(days)
  const grouped = new Map<string, UsageHistorySample[]>()
  for (const sample of samples) {
    const key = `${sample.providerId}\u0000${sample.limitId}`
    const rows = grouped.get(key)
    if (rows) rows.push(sample)
    else grouped.set(key, [sample])
  }

  const series: UsageHistorySeries[] = []
  for (const [key, rows] of grouped) {
    rows.sort((left, right) => left.capturedAt - right.capturedAt)
    const usesExternal = rows.some((row) => row.used !== null && Number.isFinite(row.used))
    const byDay = new Map<string, { amount: number; quota: number; at: number }>()

    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1]
      const current = rows[index]
      const day = usageHistoryDay(current.capturedAt)
      if (!visible.has(day) || !sameCycle(previous, current)) continue

      let amount = 0
      let quota = 0
      if (usesExternal) {
        if (previous.used === null || current.used === null) continue
        const delta = current.used - previous.used
        if (delta <= 0) continue
        amount = delta
        const limit = current.limitValue ?? previous.limitValue
        if (limit !== null && limit > 0) quota = (delta / limit) * 100
      } else {
        const delta = current.percent - previous.percent
        if (delta <= 0) continue
        amount = delta
        quota = delta
      }

      const existing = byDay.get(day)
      if (existing) {
        existing.amount += amount
        existing.quota += quota
        existing.at = current.capturedAt
      } else {
        byDay.set(day, { amount, quota, at: current.capturedAt })
      }
    }

    if (byDay.size === 0) continue
    const [providerId, limitId] = key.split('\u0000')
    const points = [...byDay.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([day, value]) => ({
        day,
        amount: round(value.amount, usesExternal ? 2 : 1),
        quota: round(value.quota, 1)
      }))
    const lastActivityAt = Math.max(...[...byDay.values()].map((value) => value.at))
    series.push({
      providerId,
      limitId,
      unit: usesExternal ? 'count' : 'percent',
      total: round(points.reduce((sum, point) => sum + point.amount, 0), usesExternal ? 2 : 1),
      totalQuota: round(points.reduce((sum, point) => sum + point.quota, 0), 1),
      lastActivityAt: new Date(lastActivityAt).toISOString(),
      points
    })
  }

  series.sort((left, right) => left.providerId.localeCompare(right.providerId) || left.limitId.localeCompare(right.limitId))
  return { days, series }
}
