import { useMemo, useState } from 'react'
import { getUsageSeverity, type ProviderStatus, type ProviderView, type UsageLimit, type UsageTrend } from '@shared/provider'
import type { AppSettings, ProviderSetting } from '@shared/settings'
import type { UsageHistory } from '@shared/usageHistory'
import { UsageBreakdown, UsageHistoryChart } from '../components/UsageHistoryChart'
import { filterUsageSeries, formatDay } from '../utils/usageHistoryView'
import { overviewMetrics } from '../overviewMetrics'
import { SettingsSection } from '../../components/Settings/SettingsControls'
import { UsageBar } from '../../components/UsagePopover/UsageBar'
import { providerLogos, providerName } from '../../utils/providerBranding'
import { compactDuration, listPriceDescription, percentDescription, readableName, relativeFuture } from '../../utils/usageFormat'

type CardStatus = ProviderStatus | 'off'

const statusLabels: Record<CardStatus, string> = {
  loading: 'Loading',
  connected: 'Connected',
  disconnected: 'Signed out',
  unavailable: 'Unavailable',
  error: 'Error',
  off: 'Off'
}

const priceFormat = (amount: number, currency: string): string =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

interface MetricProps {
  label: string
  value: string
  detail: string
  tone?: 'success' | 'warning' | 'danger'
}

function Metric({ label, value, detail, tone }: MetricProps): React.JSX.Element {
  return (
    <div className="grid min-w-0 gap-px rounded-lg border border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_55%,var(--color-overlay-surface))] px-3 py-2" role="group" aria-label={label}>
      <span className="text-[11px] font-medium text-overlay-muted">{label}</span>
      <strong className={`text-lg leading-[1.3] font-semibold tabular-nums ${tone === 'success' ? 'text-overlay-success' : tone === 'warning' ? 'text-overlay-warning' : tone === 'danger' ? 'text-overlay-danger' : 'text-overlay-strong'}`}>{value}</strong>
      <span className="truncate text-[11px] text-overlay-muted" title={detail}>{detail}</span>
    </div>
  )
}

function limitDetails(limit: UsageLimit, trend: UsageTrend | undefined): string {
  const resetsAt = limit.resetsAt ? Date.parse(limit.resetsAt) - Date.now() : Number.NaN
  return [
    Number.isFinite(resetsAt) ? (resetsAt > 0 ? `resets in ${compactDuration(resetsAt)}` : 'resetting') : undefined,
    trend?.consumedLast24Hours === undefined ? undefined : `24h +${trend.consumedLast24Hours}%`,
    trend?.averageDailyConsumption === undefined ? undefined : `${trend.averageDailyConsumption}%/day`,
    trend?.estimatedExhaustionAt ? `full ${relativeFuture(trend.estimatedExhaustionAt)}` : undefined
  ].filter(Boolean).join(' · ')
}

interface ProviderUsageCardProps {
  setting: ProviderSetting
  view?: ProviderView
  onChooseProviders: () => void
}

function ProviderUsageCard({ setting, view, onChooseProviders }: ProviderUsageCardProps): React.JSX.Element {
  const name = providerName(setting.id)
  const status: CardStatus = setting.enabled ? view?.snapshot.status ?? 'loading' : 'off'
  const limits = view?.snapshot.limits ?? []
  const analytics = view?.snapshot.analytics
  const subtitle = [
    view?.snapshot.plan && `${readableName(view.snapshot.plan)} plan`,
    analytics?.listPrice && listPriceDescription(analytics.listPrice)
  ].filter(Boolean).join(' · ')
  const message = status === 'loading'
    ? 'Loading usage…'
    : view?.snapshot.error ?? 'Usage is not available for this provider right now.'

  return (
    <article className={`dashboard-provider-card flex min-w-0 flex-col gap-2 rounded-lg border px-3 py-2.5 ${status === 'off' ? 'border-dashed border-overlay-track bg-transparent' : 'border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_55%,var(--color-overlay-surface))]'}`} data-provider-id={setting.id} aria-label={name}>
      <header className="flex items-center gap-2.5">
        <span className={`grid size-[26px] shrink-0 basis-[26px] place-items-center overflow-hidden rounded-md bg-overlay-elevated ${status === 'off' ? 'opacity-55' : ''}`} aria-hidden="true">
          <img className="block size-[18px] object-contain" src={providerLogos[setting.id]} alt="" draggable={false} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-[13px] font-medium text-overlay-strong">{name}</strong>
          {subtitle && <span className="truncate text-[11.5px] text-overlay-muted">{subtitle}</span>}
        </span>
        {status !== 'off' && view?.activity === 'active' && <span className="shrink-0 rounded-full border border-dashed border-overlay-strong px-[7px] py-0.5 text-[10.5px] font-medium text-overlay-strong">Working</span>}
        <span className={`shrink-0 rounded-full px-[7px] py-0.5 text-[10.5px] font-medium ${status === 'connected' ? 'bg-[color-mix(in_srgb,var(--color-overlay-success)_16%,transparent)] text-overlay-success' : status === 'error' ? 'bg-[color-mix(in_srgb,var(--color-overlay-danger)_16%,transparent)] text-overlay-danger' : 'bg-overlay-hover text-overlay-muted'}`}>
          {statusLabels[status]}
        </span>
      </header>
      {status === 'off' ? (
        <div className="flex items-center justify-between gap-2.5">
          <p className="m-0 text-[11px] leading-[1.35] text-overlay-muted">Hidden from the widget, so Widoken is not checking its usage.</p>
          <button className="h-6 shrink-0 cursor-pointer rounded-md border border-overlay-track bg-overlay-elevated px-2.5 font-[inherit] text-[11.5px] text-overlay-text hover:bg-overlay-hover hover:text-overlay-strong" type="button" onClick={onChooseProviders}>Manage</button>
        </div>
      ) : status === 'connected' && limits.length > 0 ? (
        <div className="grid gap-2">
          {limits.map((limit) => {
            const details = limitDetails(limit, analytics?.trends.find((trend) => trend.limitId === limit.id))
            return (
              <div className="grid gap-[3px]" key={limit.id}>
                <div className="flex items-baseline justify-between gap-3 text-xs text-overlay-text">
                  <span>{limit.label}</span>
                  <strong className="font-semibold text-overlay-strong tabular-nums">{limit.unlimited ? 'Unlimited' : percentDescription(limit.percent)}</strong>
                </div>
                {!limit.unlimited && <UsageBar percent={limit.percent} />}
                {details && <small className="text-[11px] leading-[1.35] text-overlay-muted">{details}</small>}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="m-0 text-[11px] leading-[1.35] text-overlay-muted">{message}</p>
      )}
      {status === 'connected' && analytics?.localMetrics && analytics.localMetrics.length > 0 && (
        <dl className="m-0 flex flex-wrap gap-x-3 gap-y-1 border-t border-overlay-track pt-1.5 text-[11px]">
          {analytics.localMetrics.map((metric) => (
            <div className="flex gap-1" key={metric.label}>
              <dt className="text-overlay-muted">{metric.label}</dt>
              <dd className="m-0 text-overlay-strong tabular-nums">{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  )
}

interface OverviewPageProps {
  settings: AppSettings
  providers: ProviderView[]
  history: UsageHistory
  onChooseProviders: () => void
}

export function OverviewPage({ settings, providers, history, onChooseProviders }: OverviewPageProps): React.JSX.Element {
  const [filter, setFilter] = useState('')
  const ordered = [...settings.providers].sort((a, b) => a.order - b.order)
  const series = filterUsageSeries(history, providers, settings.providers, filter)
  const metrics = useMemo(
    () => overviewMetrics(settings.providers, providers, history, Date.now()),
    [settings.providers, providers, history]
  )
  const { providers: counts, highest, nextReset } = metrics
  const providerIssues = [
    counts.unavailable > 0 ? `${counts.unavailable} unavailable` : undefined,
    counts.off > 0 ? `${counts.off} off` : undefined
  ].filter(Boolean).join(' · ')

  return (
    <SettingsSection title="Dashboard" description="Usage across every provider Widoken supports.">
      <div className="grid gap-2.5">
        <UsageHistoryChart history={history} series={series} providers={providers} filter={filter} onFilterChange={setFilter} />

        <div className="grid grid-cols-4 gap-2" aria-label="Usage metrics">
          <Metric
            label="Connected"
            value={`${counts.connected}/${counts.total}`}
            detail={providerIssues || 'Every provider is reporting'}
          />
          <Metric
            label="Highest usage"
            value={highest ? percentDescription(highest.percent) : '—'}
            detail={highest ? `${providerName(highest.providerId)} · ${highest.label}` : 'No metered limits'}
            tone={highest ? getUsageSeverity(highest.percent) : undefined}
          />
          <Metric
            label="Next reset"
            value={nextReset ? compactDuration(nextReset.inMilliseconds) : '—'}
            detail={nextReset ? `${providerName(nextReset.providerId)} · ${nextReset.label}` : 'No reset reported'}
          />
          <Metric
            label="Working now"
            value={String(metrics.activeProviderIds.length)}
            detail={metrics.activeProviderIds.length > 0
              ? metrics.activeProviderIds.map(providerName).join(', ')
              : 'No requests running'}
          />
          <Metric
            label="Today"
            value={`+${percentDescription(metrics.today)}`}
            detail={metrics.averagePerActiveDay === undefined ? 'Quota consumed today' : `Avg ${percentDescription(metrics.averagePerActiveDay)} per active day`}
          />
          <Metric
            label="Busiest day"
            value={metrics.busiest ? formatDay(metrics.busiest.day) : '—'}
            detail={metrics.busiest ? `+${percentDescription(metrics.busiest.quota)} quota` : 'No usage recorded'}
          />
          <Metric
            label="Tracking since"
            value={metrics.since ? formatDay(metrics.since) : '—'}
            detail={metrics.trackedDays > 0
              ? `${metrics.trackedDays} ${metrics.trackedDays === 1 ? 'day' : 'days'} of local history`
              : 'Nothing stored yet'}
          />
          <Metric
            label="Plans"
            value={metrics.listPrice ? `${priceFormat(metrics.listPrice.amount, metrics.listPrice.currency)}/mo` : '—'}
            detail={metrics.listPrice
              ? `List price of ${metrics.listPrice.plans} connected ${metrics.listPrice.plans === 1 ? 'plan' : 'plans'}`
              : 'No list price reported'}
          />
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2" aria-label="Providers">
          {ordered.map((setting) => (
            <ProviderUsageCard
              key={setting.id}
              setting={setting}
              view={providers.find((provider) => provider.id === setting.id)}
              onChooseProviders={onChooseProviders}
            />
          ))}
        </div>

        <UsageBreakdown history={history} series={series} providers={providers} />
      </div>
    </SettingsSection>
  )
}
