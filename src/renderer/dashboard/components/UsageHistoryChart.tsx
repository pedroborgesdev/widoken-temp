import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import type { ProviderView } from '@shared/provider'
import { PROVIDER_USAGE_LIMITS } from '@shared/providerUsage'
import type { ProviderSetting } from '@shared/settings'
import { usageHistoryAxis, type UsageHistory, type UsageHistorySeries, type UsageHistoryUnit } from '@shared/usageHistory'
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

function lastActivityLabel(value: string | undefined, now: number): string {
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

function seriesKey(series: UsageHistorySeries): string {
  return `${series.providerId}:${series.limitId}`
}

function seriesColor(all: UsageHistorySeries[], item: UsageHistorySeries): string {
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

interface UsageHistoryChartProps {
  history: UsageHistory
  series: UsageHistorySeries[]
  providers: ProviderView[]
  filter: string
  onFilterChange: (value: string) => void
}

export function UsageHistoryChart({ history, series, providers, filter, onFilterChange }: UsageHistoryChartProps): React.JSX.Element {
  const [hoveredDay, setHoveredDay] = useState<string>()
  const quotaByDay = new Map(history.days.map((day) => [day, 0]))
  for (const item of series) {
    for (const point of item.points) quotaByDay.set(point.day, (quotaByDay.get(point.day) ?? 0) + point.quota)
  }
  const axis = usageHistoryAxis(Math.max(0, ...quotaByDay.values()))
  const columns = { gridTemplateColumns: `repeat(${history.days.length}, minmax(0, 1fr))` }

  return (
    <section className="usage-history dashboard-card" aria-label="Usage history">
      <div className="usage-history__heading">
        <div>
          <h3>Usage</h3>
          <p>
            Daily quota consumed, saved on this computer. Amounts reported by a provider are preferred over inferred percentages.
            Some data may have been collected only after Widoken was installed.
          </p>
        </div>
        <label className="usage-history__filter">
          <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
          <input
            type="search"
            value={filter}
            placeholder="Filter by provider"
            aria-label="Filter by provider"
            onChange={(event) => onFilterChange(event.target.value)}
          />
        </label>
      </div>

      <div className="usage-history__chart">
        <div className="usage-history__yaxis" aria-hidden="true">
          <span className="usage-history__axis">Quota %</span>
          <div className="usage-history__ticks">
            {axis.ticks.map((tick) => (
              <span key={tick} style={{ bottom: `${(tick / axis.max) * 100}%` }}>{amountFormat.format(tick)}</span>
            ))}
          </div>
        </div>
        <div className="usage-history__scroll">
          <div className="usage-history__frame">
            <div
              className="usage-history__canvas"
              role="img"
              aria-label={`Daily quota usage for ${history.days.length} days, from ${formatDay(history.days[0] ?? '')} to ${formatDay(history.days.at(-1) ?? '')}`}
              onPointerLeave={() => setHoveredDay(undefined)}
            >
              {axis.ticks.slice(1).map((tick) => (
                <span key={tick} className="usage-history__gridline" style={{ bottom: `${(tick / axis.max) * 100}%` }} />
              ))}
              <div className="usage-history__columns" style={columns}>
                {history.days.map((day, index) => {
                  const segments = series.flatMap((item) => {
                    const point = item.points.find((candidate) => candidate.day === day)
                    return point && point.quota > 0 ? [{ item, point }] : []
                  })
                  const stack = segments.reduce((sum, segment) => sum + segment.point.quota, 0)
                  const align = index < 3 ? 'start' : index > history.days.length - 4 ? 'end' : 'center'
                  return (
                    <div
                      key={day}
                      className={`usage-history__column${hoveredDay === day ? ' usage-history__column--hovered' : ''}`}
                      data-day={day}
                      onPointerEnter={() => setHoveredDay(day)}
                    >
                      {stack > 0 && (
                        <span className="usage-history__stack" style={{ height: `${(stack / axis.max) * 100}%` }}>
                          {segments.map(({ item, point }) => (
                            <span
                              key={seriesKey(item)}
                              className="usage-history__segment"
                              style={{ flexGrow: point.quota, background: seriesColor(history.series, item) }}
                            />
                          ))}
                        </span>
                      )}
                      {hoveredDay === day && (
                        <div className={`usage-history__tooltip usage-history__tooltip--${align}`}>
                          <strong>{formatDay(day)}</strong>
                          {segments.length > 0 ? segments.map(({ item, point }) => (
                            <span key={seriesKey(item)}>
                              <i style={{ background: seriesColor(history.series, item) }} />
                              <em>{providerName(item.providerId)} · {limitLabel(item.providerId, item.limitId, providers)}</em>
                              <b>
                                {formatAmount(point.amount, item.unit)}
                                {item.unit === 'count' && point.quota > 0 ? ` · ${formatAmount(point.quota, 'percent')}` : ''}
                              </b>
                            </span>
                          )) : <span>No usage recorded</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="usage-history__labels" aria-hidden="true" style={columns}>
              {history.days.map((day, index) => (
                <span key={day}>{index % 2 === 0 ? formatDay(day) : ''}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {series.length > 0 && (
        <ul className="usage-history__legend">
          {series.map((item) => (
            <li key={seriesKey(item)}>
              <i style={{ background: seriesColor(history.series, item) }} />
              <span>{providerName(item.providerId)} · {limitLabel(item.providerId, item.limitId, providers)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface UsageBreakdownProps {
  history: UsageHistory
  series: UsageHistorySeries[]
  providers: ProviderView[]
}

export function UsageBreakdown({ history, series, providers }: UsageBreakdownProps): React.JSX.Element {
  const now = Date.now()
  return (
    <section className="usage-history__breakdown dashboard-card" aria-label="Usage breakdown">
      <h3>Breakdown</h3>
      <table className="usage-history__table">
        <thead>
          <tr>
            <th scope="col">Provider</th>
            <th scope="col">Last activity</th>
            <th scope="col">Active days</th>
            <th scope="col">Consumed</th>
          </tr>
        </thead>
        <tbody>
          {series.length > 0 ? [...series]
            .sort((left, right) => right.totalQuota - left.totalQuota || right.total - left.total)
            .map((item) => (
              <tr key={seriesKey(item)}>
                <th scope="row">
                  <i style={{ background: seriesColor(history.series, item) }} />
                  <span>
                    <strong>{providerName(item.providerId)}</strong>
                    <small>{limitLabel(item.providerId, item.limitId, providers)}</small>
                  </span>
                </th>
                <td>{lastActivityLabel(item.lastActivityAt, now)}</td>
                <td>{item.points.length}</td>
                <td>
                  <strong>{formatAmount(item.total, item.unit)}</strong>
                  {item.unit === 'count' && item.totalQuota > 0 && <small>{formatAmount(item.totalQuota, 'percent')} quota</small>}
                </td>
              </tr>
            )) : (
              <tr>
                <td className="usage-history__empty" colSpan={4}>
                  {history.series.length === 0 ? 'No usage recorded in this period.' : 'No matching providers.'}
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </section>
  )
}
