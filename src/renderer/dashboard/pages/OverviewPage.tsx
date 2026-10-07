import { useMemo, useState } from 'react'
import { getUsageSeverity, type ProviderStatus, type ProviderView, type UsageLimit, type UsageTrend } from '@shared/provider'
import type { AppSettings, ProviderSetting } from '@shared/settings'
import type { UsageHistory } from '@shared/usageHistory'
import { filterUsageSeries, formatDay, UsageBreakdown, UsageHistoryChart } from '../components/UsageHistoryChart'
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
    <div className={`dashboard-metric${tone ? ` dashboard-metric--${tone}` : ''}`} role="group" aria-label={label}>
      <span className="dashboard-metric__label">{label}</span>
      <strong className="dashboard-metric__value">{value}</strong>
      <span className="dashboard-metric__detail" title={detail}>{detail}</span>
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
    <article className={`dashboard-provider-card dashboard-provider-card--${status}`} data-provider-id={setting.id} aria-label={name}>
      <header className="dashboard-provider-card__header">
        <span className="provider-setting__icon-shell" aria-hidden="true">
          <img src={providerLogos[setting.id]} alt="" draggable={false} />
        </span>
        <span className="provider-setting__identity">
          <strong>{name}</strong>
          {subtitle && <span>{subtitle}</span>}
        </span>
        {status !== 'off' && view?.activity === 'active' && <span className="dashboard-provider-card__activity">Working</span>}
        <span className={`dashboard-provider-card__status dashboard-provider-card__status--${status}`}>
          {statusLabels[status]}
        </span>
      </header>
      {status === 'off' ? (
        <div className="dashboard-provider-card__off">
          <p className="dashboard-provider-card__message">Hidden from the widget, so Widoken is not checking its usage.</p>
          <button className="dashboard-provider-card__action" type="button" onClick={onChooseProviders}>Manage</button>
        </div>
      ) : status === 'connected' && limits.length > 0 ? (
        <div className="dashboard-provider-card__limits">
          {limits.map((limit) => {
            const details = limitDetails(limit, analytics?.trends.find((trend) => trend.limitId === limit.id))
            return (
              <div className="dashboard-provider-card__limit" key={limit.id}>
                <div className="dashboard-provider-card__limit-heading">
                  <span>{limit.label}</span>
                  <strong>{limit.unlimited ? 'Unlimited' : percentDescription(limit.percent)}</strong>
                </div>
                {!limit.unlimited && <UsageBar percent={limit.percent} />}
                {details && <small>{details}</small>}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="dashboard-provider-card__message">{message}</p>
      )}
      {status === 'connected' && analytics?.localMetrics && analytics.localMetrics.length > 0 && (
        <dl className="dashboard-provider-card__local">
          {analytics.localMetrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
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
      <div className="dashboard-overview">
        <UsageHistoryChart history={history} series={series} providers={providers} filter={filter} onFilterChange={setFilter} />

        <div className="dashboard-metrics" aria-label="Usage metrics">
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

        <div className="dashboard-overview__providers" aria-label="Providers">
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
