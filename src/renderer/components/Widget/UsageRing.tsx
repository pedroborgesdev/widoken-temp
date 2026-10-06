import { clampPercent, getUsageSeverity, type ProviderStatus } from '@shared/provider'

interface UsageRingProps {
  percent: number
  status: ProviderStatus
}

const RADIUS = 12.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function UsageRing({ percent, status }: UsageRingProps): React.JSX.Element {
  const value = clampPercent(percent)
  const severity = getUsageSeverity(value)
  const isConnected = status === 'connected'
  const className = isConnected ? `usage-ring__value usage-ring__value--${severity}` : 'usage-ring__value usage-ring__value--muted'
  const dashOffset = CIRCUMFERENCE * (1 - (isConnected ? value : 18) / 100)

  return (
    <svg className="usage-ring" viewBox="0 0 28 28" aria-hidden="true">
      <circle className="usage-ring__track" cx="14" cy="14" r={RADIUS} />
      <circle
        className={className}
        cx="14"
        cy="14"
        r={RADIUS}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
      />
    </svg>
  )
}
