import { clampPercent, getUsageSeverity } from '@shared/provider'

export function UsageBar({ percent }: { percent: number }): React.JSX.Element {
  const value = clampPercent(percent)
  return (
    <div className="usage-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <span
        className={`usage-bar__fill usage-bar__fill--${getUsageSeverity(value)}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
