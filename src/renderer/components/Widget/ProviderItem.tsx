import { useState } from 'react'
import { clampPercent, type ProviderView } from '@shared/provider'
import { displayedUsageLimits } from '@shared/providerUsage'
import type { ProviderUsageDisplay } from '@shared/settings'
import { providerLogos } from '../../utils/providerBranding'
import { UsageRing } from './UsageRing'

interface ProviderItemProps {
  provider: ProviderView
  usageDisplay?: ProviderUsageDisplay
  animateEntry: boolean
  onEnter: () => void
  onLeave: () => void
}

export function ProviderItem({ provider, usageDisplay, animateEntry, onEnter, onLeave }: ProviderItemProps): React.JSX.Element {
  const usages = displayedUsageLimits(provider.id, provider.snapshot.limits, usageDisplay)
  const usageDescription = usages.map(({ limit, side }) =>
    `${side ? `${side} ` : ''}${limit.label} ${clampPercent(limit.percent)}%`
  ).join(', ')
  const [shouldAnimateEntry] = useState(animateEntry)
  const status = provider.snapshot.status
  const active = provider.activity === 'active'

  return (
    <button
      className={`provider-item provider-item--${status}${shouldAnimateEntry ? ' provider-item--entering' : ''}`}
      type="button"
      data-provider-id={provider.id}
      aria-label={`${provider.name}: ${status}${status === 'connected' && usageDescription ? `, ${usageDescription}` : ''}${active ? ', request in progress' : ''}`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <UsageRing active={active} usages={usages} status={status} />
      <span className="provider-item__icon-shell">
        <img
          className={`provider-item__logo provider-item__logo--${provider.id}`}
          src={providerLogos[provider.id]}
          alt=""
          draggable={false}
        />
      </span>
    </button>
  )
}
