import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import type { ProviderView } from '@shared/provider'
import { usageHistoryAxis, type UsageHistory, type UsageHistorySeries } from '@shared/usageHistory'
import { providerName } from '../../utils/providerBranding'
import { formatAmount, formatDay, lastActivityLabel, limitLabel, seriesColor, seriesKey } from '../utils/usageHistoryView'

const amountFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

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
    <section className="usage-history dashboard-card grid gap-2.5 rounded-lg border border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_55%,var(--color-overlay-surface))] px-3.5 py-3" aria-label="Usage history">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="m-0 text-sm font-semibold text-overlay-strong">Usage</h3>
          <p className="mt-[3px] mb-0 max-w-[82ch] text-[11.5px] leading-[1.4] text-overlay-muted">
            Daily quota consumed, saved on this computer. Amounts reported by a provider are preferred over inferred percentages.
            Some data may have been collected only after Widoken was installed.
          </p>
        </div>
        <label className="flex h-7 w-[200px] shrink-0 items-center gap-2 rounded-lg border border-overlay-track bg-overlay-elevated px-2.5 text-overlay-muted [&_svg]:size-3 [&_svg]:shrink-0">
          <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
          <input
            className="w-full min-w-0 border-0 bg-transparent font-[inherit] text-[12.5px] text-overlay-text outline-none placeholder:text-overlay-muted"
            type="search"
            value={filter}
            placeholder="Filter by provider"
            aria-label="Filter by provider"
            onChange={(event) => onFilterChange(event.target.value)}
          />
        </label>
      </div>

      <div className="flex min-w-0 gap-2">
        <div className="flex shrink-0 gap-1.5 pb-[18px]" aria-hidden="true">
          <span className="self-center text-[11px] text-overlay-muted [writing-mode:vertical-rl] rotate-180">Quota %</span>
          <div className="relative h-[150px] w-7">
            {axis.ticks.map((tick) => (
              <span className="absolute right-0 translate-y-1/2 text-[11px] text-overlay-muted tabular-nums" key={tick} style={{ bottom: `${(tick / axis.max) * 100}%` }}>{amountFormat.format(tick)}</span>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="min-w-[640px]">
            <div
              className="relative h-[150px] border-b border-overlay-track"
              role="img"
              aria-label={`Daily quota usage for ${history.days.length} days, from ${formatDay(history.days[0] ?? '')} to ${formatDay(history.days.at(-1) ?? '')}`}
              onPointerLeave={() => setHoveredDay(undefined)}
            >
              {axis.ticks.slice(1).map((tick) => (
                <span key={tick} className="absolute inset-x-0 border-t border-[color-mix(in_srgb,var(--color-overlay-track)_80%,transparent)]" style={{ bottom: `${(tick / axis.max) * 100}%` }} />
              ))}
              <div className="absolute inset-0 grid items-end" style={columns}>
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
                      className={`relative flex h-full items-end justify-center ${hoveredDay === day ? 'bg-[color-mix(in_srgb,var(--color-overlay-hover)_55%,transparent)]' : ''}`}
                      data-day={day}
                      onPointerEnter={() => setHoveredDay(day)}
                    >
                      {stack > 0 && (
                        <span className="flex w-[58%] min-w-1.5 max-w-[18px] flex-col-reverse overflow-hidden rounded-t-[2px]" style={{ height: `${(stack / axis.max) * 100}%` }}>
                          {segments.map(({ item, point }) => (
                            <span
                              key={seriesKey(item)}
                              className="block min-h-px flex-[1_0_0]"
                              style={{ flexGrow: point.quota, background: seriesColor(history.series, item) }}
                            />
                          ))}
                        </span>
                      )}
                      {hoveredDay === day && (
                        <div className={`pointer-events-none absolute top-2 z-[5] grid w-max max-w-[280px] gap-1 rounded-lg border border-overlay-track bg-overlay-elevated px-2.5 py-2 text-[11.5px] text-overlay-text [&_b]:font-semibold [&_b]:text-overlay-strong [&_b]:tabular-nums [&_em]:font-normal [&_em]:whitespace-nowrap [&_i]:size-2 [&_i]:shrink-0 [&_i]:rounded-[2px] [&_span]:flex [&_span]:items-baseline [&_span]:gap-1.5 [&_strong]:text-xs [&_strong]:text-overlay-strong ${align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'start' ? 'left-1' : 'right-1'}`}>
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
            <div className="usage-history__labels grid h-[18px] items-end" aria-hidden="true" style={columns}>
              {history.days.map((day, index) => (
                <span className="text-center text-[10px] whitespace-nowrap text-overlay-muted" key={day}>{index % 2 === 0 ? formatDay(day) : ''}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {series.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0">
          {series.map((item) => (
            <li className="flex items-center gap-1.5 text-[11px] text-overlay-muted [&_i]:size-2 [&_i]:shrink-0 [&_i]:rounded-[2px]" key={seriesKey(item)}>
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
    <section className="grid gap-1 rounded-lg border border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_55%,var(--color-overlay-surface))] px-3.5 py-3" aria-label="Usage breakdown">
      <h3 className="m-0 text-sm font-semibold text-overlay-strong">Breakdown</h3>
      <table className="w-full border-collapse [&_tbody_th]:flex [&_tbody_th]:items-center [&_tbody_th]:gap-2.5 [&_tbody_th]:font-medium [&_tbody_th_i]:size-2 [&_tbody_th_i]:shrink-0 [&_tbody_th_i]:rounded-[2px] [&_tbody_th_span]:flex [&_tbody_th_span]:items-baseline [&_tbody_th_span]:gap-1.5 [&_tbody_th_strong]:text-xs [&_tbody_th_strong]:text-overlay-strong [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:last-child_th]:border-b-0 [&_td:nth-child(n+2)]:text-right [&_td:nth-child(n+2)]:tabular-nums [&_td]:border-b [&_td]:border-overlay-track [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-middle [&_td]:text-xs [&_td]:text-overlay-text [&_td_small]:text-[11px] [&_td_small]:text-overlay-muted [&_td_strong]:block [&_td_strong]:font-semibold [&_td_strong]:text-overlay-strong [&_th]:border-b [&_th]:border-overlay-track [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:align-middle [&_thead_th:nth-child(n+2)]:text-right [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:text-overlay-muted [&_tbody_th_small]:text-[11px] [&_tbody_th_small]:text-overlay-muted">
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
                <td className="text-left text-overlay-muted" colSpan={4}>
                  {history.series.length === 0 ? 'No usage recorded in this period.' : 'No matching providers.'}
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </section>
  )
}
