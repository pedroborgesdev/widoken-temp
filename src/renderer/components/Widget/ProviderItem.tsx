import { useState } from 'react'
import { summaryUsage, type ProviderView } from '@shared/provider'
import antigravityLogo from '../../assets/providers/antigravity.png'
import claudeLogo from '../../assets/providers/claude.png'
import cursorLogo from '../../assets/providers/cursor.png'
import copilotLogo from '../../assets/providers/github-copilot.png'
import openaiLogo from '../../assets/providers/openai.png'
import { UsageRing } from './UsageRing'

const logos: Record<string, string> = {
  claude: claudeLogo,
  openai: openaiLogo,
  cursor: cursorLogo,
  antigravity: antigravityLogo,
  copilot: copilotLogo
}

interface ProviderItemProps {
  provider: ProviderView
  animateEntry: boolean
  onEnter: () => void
  onLeave: () => void
}

export function ProviderItem({ provider, animateEntry, onEnter, onLeave }: ProviderItemProps): React.JSX.Element {
  const percent = summaryUsage(provider.snapshot.limits)
  const [shouldAnimateEntry] = useState(animateEntry)

  return (
    <button
      className={`provider-item provider-item--${provider.snapshot.status}${shouldAnimateEntry ? ' provider-item--entering' : ''}`}
      type="button"
      aria-label={`${provider.name}: ${provider.snapshot.status}${provider.snapshot.status === 'connected' ? `, ${percent}% used` : ''}`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <UsageRing percent={percent} status={provider.snapshot.status} />
      <span className="provider-item__icon-shell">
        <img
          className={`provider-item__logo provider-item__logo--${provider.id}`}
          src={logos[provider.id]}
          alt=""
          draggable={false}
        />
      </span>
    </button>
  )
}
