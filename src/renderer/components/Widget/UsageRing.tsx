import { clampPercent, getUsageSeverity, type ProviderStatus, type UsageLimit } from '@shared/provider'

interface UsageRingProps {
  active?: boolean
  usages: Array<{ limit: UsageLimit; side?: 'left' | 'right' }>
  status: ProviderStatus
}

const RADIUS = 12.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const ACTIVITY_SEGMENTS = 12
const activityPeriod = CIRCUMFERENCE / ACTIVITY_SEGMENTS
const ACTIVITY_DASH = Math.round(activityPeriod * 0.55 * 100) / 100
const ACTIVITY_GAP = Math.round((activityPeriod - ACTIVITY_DASH) * 100) / 100

function severityClass(limit: UsageLimit): string {
  return `usage-ring__value--${getUsageSeverity(clampPercent(limit.percent))}`
}

export function UsageRing({ active = false, usages, status }: UsageRingProps): React.JSX.Element {
  const isConnected = status === 'connected'
  const split = isConnected && usages.length === 2

  return (
    <svg className={`usage-ring${active ? ' usage-ring--active' : ''}${split ? ' usage-ring--split' : ''}`} viewBox="0 0 28 28" aria-hidden="true">
      <circle className="usage-ring__track" cx="14" cy="14" r={RADIUS} />
      {split ? usages.map(({ limit, side }) => (
        <path
          key={side}
          className={`usage-ring__value usage-ring__value--${side} ${severityClass(limit)}`}
          d={side === 'left'
            ? 'M 14 1.5 A 12.5 12.5 0 0 0 14 26.5'
            : 'M 14 1.5 A 12.5 12.5 0 0 1 14 26.5'}
          pathLength="100"
          strokeDasharray={`${clampPercent(limit.percent)} 100`}
        />
      )) : (
        <g transform="rotate(-90 14 14)">
          <circle
            className={isConnected && usages[0]
              ? `usage-ring__value ${severityClass(usages[0].limit)}`
              : 'usage-ring__value usage-ring__value--muted'}
            cx="14"
            cy="14"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - (isConnected && usages[0] ? clampPercent(usages[0].limit.percent) : 18) / 100)}
          />
        </g>
      )}
      <circle
        className="usage-ring__activity"
        cx="14"
        cy="14"
        r={RADIUS}
        strokeDasharray={`${ACTIVITY_DASH} ${ACTIVITY_GAP}`}
      />
    </svg>
  )
}
