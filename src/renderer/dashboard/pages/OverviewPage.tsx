import type { ProviderStatus, ProviderView } from '@shared/provider'
import type { AppSettings, ProviderSetting, SettingsPatch } from '@shared/settings'
import { SettingsCheckbox, SettingsSection } from '../../components/Settings/SettingsControls'
import { SettingsSelect } from '../../components/Settings/SettingsSelect'
import { UsageBar } from '../../components/UsagePopover/UsageBar'
import { providerLogos, providerName } from '../../utils/providerBranding'
import { percentDescription, readableName, resetDescription } from '../../utils/usageFormat'

const statusLabels: Record<ProviderStatus, string> = {
  loading: 'Loading',
  connected: 'Connected',
  disconnected: 'Signed out',
  unavailable: 'Unavailable',
  error: 'Error'
}

function ProviderUsageCard({ setting, view }: { setting: ProviderSetting; view?: ProviderView }): React.JSX.Element {
  const name = providerName(setting.id)
  const status = view?.snapshot.status ?? 'loading'
  const limits = view?.snapshot.limits ?? []
  const plan = view?.snapshot.plan
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
          {plan && <span>{readableName(plan)} plan</span>}
        </span>
        {view?.activity === 'active' && <span className="dashboard-provider-card__activity">Working</span>}
        <span className={`dashboard-provider-card__status dashboard-provider-card__status--${status}`}>
          {statusLabels[status]}
        </span>
      </header>
      {status === 'connected' && limits.length > 0 ? (
        <div className="dashboard-provider-card__limits">
          {limits.map((limit) => (
            <div className="dashboard-provider-card__limit" key={limit.id}>
              <div className="dashboard-provider-card__limit-heading">
                <span>{limit.label}</span>
                <strong>{limit.unlimited ? 'Unlimited' : percentDescription(limit.percent)}</strong>
              </div>
              {!limit.unlimited && <UsageBar percent={limit.percent} />}
              <small>{resetDescription(limit.resetsAt)}</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="dashboard-provider-card__message">{message}</p>
      )}
    </article>
  )
}

interface OverviewPageProps {
  settings: AppSettings
  providers: ProviderView[]
  onUpdate: (patch: SettingsPatch) => void
  onChooseProviders: () => void
}

export function OverviewPage({ settings, providers, onUpdate, onChooseProviders }: OverviewPageProps): React.JSX.Element {
  const visible = [...settings.providers]
    .sort((a, b) => a.order - b.order)
    .filter((provider) => provider.enabled)

  return (
    <SettingsSection title="Dashboard" description="Live usage from the providers shown in your widget.">
      <div className="dashboard-overview">
        {visible.length > 0 ? (
          <div className="dashboard-overview__providers">
            {visible.map((setting) => (
              <ProviderUsageCard
                key={setting.id}
                setting={setting}
                view={providers.find((provider) => provider.id === setting.id)}
              />
            ))}
          </div>
        ) : (
          <div className="dashboard-overview__empty">
            <p>No providers are visible in the widget.</p>
            <button className="settings-action-button" type="button" onClick={onChooseProviders}>Choose providers</button>
          </div>
        )}

        <div className="dashboard-overview__group">
          <h3>App</h3>
          <div className="settings-panel__grid">
            <SettingsSelect
              label="Refresh interval"
              value={settings.refreshIntervalSeconds}
              options={[{ value: 30, label: '30 seconds' }, { value: 45, label: '45 seconds' }, { value: 60, label: '1 minute' }, { value: 300, label: '5 minutes' }]}
              onChange={(value) => onUpdate({ refreshIntervalSeconds: Number(value) })}
            />
            <SettingsCheckbox checked={settings.launchAtStartup} label="Launch at startup" onChange={(checked) => onUpdate({ launchAtStartup: checked })} />
            <SettingsCheckbox
              checked={settings.analytics.localInsights}
              label="Local analytics"
              onChange={(localInsights) => onUpdate({ analytics: { localInsights } })}
            />
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
