import { clampPercent, getUsageSeverity, type ProviderStatus } from '@shared/provider'

interface UsageRingProps {
  active?: boolean
  percent: number
  status: ProviderStatus
}

const RADIUS = 12.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const ACTIVITY_DOT_COUNT = 16

export function UsageRing({ active = false, percent, status }: UsageRingProps): React.JSX.Element {
  const value = clampPercent(percent)
  const severity = getUsageSeverity(value)
  const isConnected = status === 'connected'
  const className = isConnected ? `usage-ring__value usage-ring__value--${severity}` : 'usage-ring__value usage-ring__value--muted'
  const dashOffset = CIRCUMFERENCE * (1 - (isConnected ? value : 18) / 100)

  return (
    <svg className={`usage-ring${active ? ' usage-ring--active' : ''}`} viewBox="0 0 28 28" aria-hidden="true">
      <circle className="usage-ring__track" cx="14" cy="14" r={RADIUS} />
      <g transform="rotate(-90 14 14)">
        <circle
          className={className}
          cx="14"
          cy="14"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </g>
      <g className={`usage-ring__activity ${isConnected ? `usage-ring__activity--${severity}` : 'usage-ring__activity--muted'}`}>
        {Array.from({ length: ACTIVITY_DOT_COUNT }, (_, index) => {
          const angle = (index / ACTIVITY_DOT_COUNT) * Math.PI * 2 - Math.PI / 2
          return (
            <circle
              key={index}
              className="usage-ring__activity-dot"
              cx={14 + Math.cos(angle) * RADIUS}
              cy={14 + Math.sin(angle) * RADIUS}
              r={1.5}
            />
          )
        })}
      </g>
    </svg>
  )
}
