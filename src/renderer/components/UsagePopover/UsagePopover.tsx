import { forwardRef } from 'react'
import type { ProviderView, UsageTrend } from '@shared/provider'
import { displayedUsageLimits } from '@shared/providerUsage'
import type { DockSide, ProviderUsageDisplay } from '@shared/settings'
import { listPriceDescription, percentDescription, readableName, relativeFuture, resetDescription } from '../../utils/usageFormat'
import { UnavailablePopover } from './UnavailablePopover'
import { UsageBar } from './UsageBar'

export type PopoverPlacement = DockSide | 'top' | 'bottom'

function amountDescription(used?: number, limit?: number, remaining?: number): string | undefined {
  const format = (value: number): string => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
  if (typeof used === 'number' && typeof limit === 'number') return `${format(used)} / ${format(limit)} used`
  if (typeof remaining === 'number') return `${format(remaining)} remaining`
  if (typeof used === 'number') return `${format(used)} used`
  return undefined
}

function updateDescription(value: string): string {
  const updated = new Date(value)
  if (Number.isNaN(updated.getTime())) return 'Last update unavailable'
  const formatted = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(updated)
  return `Updated at ${formatted}`
}

function TrendDetails({ trend }: { trend?: UsageTrend }): React.JSX.Element {
  if (!trend) return <p className="usage-popover__trend">Collecting usage history</p>
  const primary = [
    trend.consumedLast24Hours === undefined ? undefined : `24h +${trend.consumedLast24Hours}%`,
    trend.averageDailyConsumption === undefined ? undefined : `avg ${trend.averageDailyConsumption}%/day`,
    trend.burnRatePerHour === undefined ? undefined : `${trend.burnRatePerHour}%/h`
  ].filter(Boolean)
  const forecast = [
    trend.estimatedExhaustionAt ? `full ${relativeFuture(trend.estimatedExhaustionAt)}` : undefined,
    trend.projectedPercentAtReset === undefined ? undefined : `${trend.projectedPercentAtReset}% at reset`
  ].filter(Boolean)
  if (primary.length === 0 && forecast.length === 0) {
    return <p className="usage-popover__trend">Collecting usage history</p>
  }
  return (
    <div className="usage-popover__trend">
      {primary.length > 0 && <span>{primary.join(' · ')}</span>}
      {forecast.length > 0 && <span>{forecast.join(' · ')}</span>}
    </div>
  )
}

interface UsagePopoverProps {
  provider: ProviderView
  usageDisplay?: ProviderUsageDisplay
  placement: PopoverPlacement
  left: number
  top?: number
  bottom?: number
  maxHeight?: number
  onEnter: () => void
  onLeave: () => void
}

export const UsagePopover = forwardRef<HTMLDivElement, UsagePopoverProps>(function UsagePopover(
  { provider, usageDisplay, placement, left, top, bottom, maxHeight, onEnter, onLeave },
  ref
) {
  const isAvailable = provider.snapshot.status === 'connected' && provider.snapshot.limits.length > 0
  const displayedSides = new Map(
    displayedUsageLimits(provider.id, provider.snapshot.limits, usageDisplay)
      .flatMap(({ limit, side }) => side ? [[limit.id, side] as const] : [])
  )
  const panelStyle = maxHeight === undefined
    ? undefined
    : { maxHeight, ...(maxHeight < 96 ? { minHeight: 0 } : {}) }

  return (
    <div
      ref={ref}
      className={`usage-popover-anchor usage-popover-anchor--${placement}`}
      style={{ top, bottom, left }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      {isAvailable ? (
        <div className={`usage-popover${provider.snapshot.limits.length === 1 ? ' usage-popover--single' : ''}`} data-node-id="9:371" style={panelStyle}>
          {(provider.snapshot.plan || provider.snapshot.isUnlimited) && (
            <div className="usage-popover__metadata">
              {provider.snapshot.plan && <span>{readableName(provider.snapshot.plan)} plan</span>}
              {provider.snapshot.analytics?.listPrice && (
                <span>{listPriceDescription(provider.snapshot.analytics.listPrice)}</span>
              )}
              {provider.snapshot.isUnlimited && <strong>Unlimited</strong>}
            </div>
          )}
          <div className="usage-popover__limits">
            {provider.snapshot.limits.map((limit) => {
              const amount = amountDescription(limit.used, limit.limit, limit.remaining)
              const trend = provider.snapshot.analytics?.trends.find((candidate) => candidate.limitId === limit.id)
              return (
                <div className="usage-popover__limit" key={limit.id}>
                  <div className="usage-popover__heading">
                    <p className="usage-popover__label">
                      {limit.label}
                      {displayedSides.has(limit.id) && (
                        <span className={`usage-popover__side usage-popover__side--${displayedSides.get(limit.id)}`}>
                          {displayedSides.get(limit.id)}
                        </span>
                      )}
                    </p>
                    <strong className="usage-popover__percent">
                      {limit.unlimited ? 'Unlimited' : percentDescription(limit.percent)}
                    </strong>
                  </div>
                  {!limit.unlimited && <UsageBar percent={limit.percent} />}
                  {amount && <p className="usage-popover__amount">{amount}</p>}
                  <p className="usage-popover__reset">{resetDescription(limit.resetsAt)}</p>
                  <TrendDetails trend={trend} />
                </div>
              )
            })}
          </div>
          {provider.snapshot.analytics?.localMetrics && provider.snapshot.analytics.localMetrics.length > 0 && (
            <div className="usage-popover__local">
              <strong>Local analytics</strong>
              <dl>
                {provider.snapshot.analytics.localMetrics.map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <p className="usage-popover__updated">{updateDescription(provider.snapshot.lastUpdatedAt)}</p>
        </div>
      ) : (
        <UnavailablePopover message={provider.snapshot.error} style={panelStyle} />
      )}
    </div>
  )
})
