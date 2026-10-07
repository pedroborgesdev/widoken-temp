import type { AppSettings, SettingsPatch } from '@shared/settings'
import { SettingsCheckbox, SettingsSection } from '../../components/Settings/SettingsControls'
import { SettingsSelect } from '../../components/Settings/SettingsSelect'

interface GeneralPageProps {
  settings: AppSettings
  onUpdate: (patch: SettingsPatch) => void
}

export function GeneralPage({ settings, onUpdate }: GeneralPageProps): React.JSX.Element {
  return (
    <SettingsSection title="General" description="Settings for the whole app.">
      <div className="settings-panel__groups">
        <div className="settings-panel__group">
          <h3>Interface</h3>
          <div className="settings-panel__grid">
            <SettingsCheckbox
              checked={settings.dashboardFollowsWidgetTheme}
              label="Use the widget theme for the whole interface"
              onChange={(dashboardFollowsWidgetTheme) => onUpdate({ dashboardFollowsWidgetTheme })}
            />
          </div>
        </div>
        <div className="settings-panel__group">
          <h3>Startup</h3>
          <div className="settings-panel__grid">
            <SettingsCheckbox
              checked={settings.launchAtStartup}
              label="Launch at startup"
              onChange={(launchAtStartup) => onUpdate({ launchAtStartup })}
            />
            <SettingsCheckbox
              checked={settings.openDashboardAtStartup}
              label="Open the dashboard at startup"
              onChange={(openDashboardAtStartup) => onUpdate({ openDashboardAtStartup })}
            />
          </div>
        </div>
        <div className="settings-panel__group">
          <h3>Data</h3>
          <div className="settings-panel__grid">
            <SettingsSelect
              label="Refresh interval"
              value={settings.refreshIntervalSeconds}
              options={[{ value: 30, label: '30 seconds' }, { value: 45, label: '45 seconds' }, { value: 60, label: '1 minute' }, { value: 300, label: '5 minutes' }]}
              onChange={(value) => onUpdate({ refreshIntervalSeconds: Number(value) })}
            />
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
