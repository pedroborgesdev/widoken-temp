import { useId } from 'react'
import { clampPercent, getUsageSeverity, isMonetaryBalance, type ProviderStatus, type UsageLimit } from '@shared/provider'

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

function joinStopClass(limit: UsageLimit, side: 'left' | 'right'): string {
  return `usage-ring__join-stop usage-ring__join-stop--${side} usage-ring__join-stop--${getUsageSeverity(clampPercent(limit.percent))}`
}

export function UsageRing({ active = false, usages, status }: UsageRingProps): React.JSX.Element {
  const joinGradientId = `usage-ring-join-${useId().replaceAll(':', '')}`
  const isConnected = status === 'connected'
  const balance = isConnected && usages.length > 0 && usages.every(({ limit }) => isMonetaryBalance(limit))
  const split = !balance && isConnected && usages.length === 2
  const left = split ? usages.find(({ side }) => side === 'left') : undefined
  const right = split ? usages.find(({ side }) => side === 'right') : undefined
  const leftPercent = left ? clampPercent(left.limit.percent) : 0
  const rightPercent = right ? clampPercent(right.limit.percent) : 0
  const joinedAtStart = Boolean(left && right && leftPercent > 0 && rightPercent > 0)
  const joinedAtEnd = Boolean(left && right && leftPercent === 100 && rightPercent === 100)
  const sameColor = Boolean(
    joinedAtStart &&
    left &&
    right &&
    getUsageSeverity(leftPercent) === getUsageSeverity(rightPercent)
  )
  const singleLimit = !balance && !split && isConnected ? usages[0]?.limit : undefined
  const singlePercent = singleLimit ? clampPercent(singleLimit.percent) : undefined

  return (
    <svg className={`usage-ring${active ? ' usage-ring--active' : ''}${balance ? ' usage-ring--balance' : ''}${split ? ' usage-ring--split' : ''}${sameColor ? ' usage-ring--same-color' : ''}`} viewBox="0 0 28 28" aria-hidden="true">
      <circle className="usage-ring__track" cx="14" cy="14" r={RADIUS} />
      {joinedAtStart && left && right ? (
        <>
          <defs>
            <linearGradient id={joinGradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" className={joinStopClass(left.limit, 'left')} />
              <stop offset="0.5" className={joinStopClass(left.limit, 'left')} />
              <stop offset="0.5" className={joinStopClass(right.limit, 'right')} />
              <stop offset="1" className={joinStopClass(right.limit, 'right')} />
            </linearGradient>
          </defs>
          <circle className="usage-ring__join" cx="14" cy="1.5" r="1" fill={`url(#${joinGradientId})`} />
          {joinedAtEnd ? <circle className="usage-ring__join" cx="14" cy="26.5" r="1" fill={`url(#${joinGradientId})`} /> : null}
        </>
      ) : null}
      {balance ? (
        <circle
          className="usage-ring__value usage-ring__value--single usage-ring__value--balance"
          cx="14"
          cy="14"
          r={RADIUS}
        />
      ) : split ? usages.map(({ limit, side }) => {
        const percent = clampPercent(limit.percent)
        // Keep empty arcs out of the SVG so cap rendering can never create a
        // phantom endpoint at the bottom of a split usage ring.
        if (percent === 0) return null
        return (
          <path
            key={side}
            className={`usage-ring__value usage-ring__value--${side} ${severityClass(limit)}`}
            d={side === 'left'
              ? 'M 14 1.5 A 12.5 12.5 0 0 0 14 26.5'
              : 'M 14 1.5 A 12.5 12.5 0 0 1 14 26.5'}
            pathLength="100"
            strokeDasharray={`${percent} 100`}
          />
        )
      }) : singlePercent === 0 ? null : (
        <g transform="rotate(-90 14 14)">
          <circle
            className={singleLimit
              ? `usage-ring__value usage-ring__value--single ${severityClass(singleLimit)}`
              : 'usage-ring__value usage-ring__value--single usage-ring__value--muted'}
            cx="14"
            cy="14"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - (singlePercent ?? 18) / 100)}
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
