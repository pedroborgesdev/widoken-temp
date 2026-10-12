import { forwardRef } from 'react'
import type { ProviderView } from '@shared/provider'
import { displayedUsageLimits } from '@shared/providerUsage'
import type { DockSide, ProviderUsageDisplay } from '@shared/settings'
import { amountDescription, listPriceDescription, percentDescription, readableName, resetDescription } from '../../utils/usageFormat'
import { UnavailablePopover } from './UnavailablePopover'
import { UsageBar } from './UsageBar'

export type PopoverPlacement = DockSide | 'top' | 'bottom'

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
              {provider.snapshot.listPrice && (
                <span>{listPriceDescription(provider.snapshot.listPrice)}</span>
              )}
              {provider.snapshot.isUnlimited && <strong>Unlimited</strong>}
            </div>
          )}
          <div className="usage-popover__limits">
            {provider.snapshot.limits.map((limit) => {
              const amount = amountDescription(limit)
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
                </div>
              )
            })}
          </div>
          <p className="usage-popover__updated">{updateDescription(provider.snapshot.lastUpdatedAt)}</p>
        </div>
      ) : (
        <UnavailablePopover message={provider.snapshot.error} style={panelStyle} />
      )}
    </div>
  )
})
