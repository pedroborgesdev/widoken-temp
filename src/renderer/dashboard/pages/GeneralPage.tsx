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
      <div className="grid gap-[22px]">
        <div>
          <h3 className="m-0 mb-2 text-[13px] font-semibold text-overlay-strong">Interface</h3>
          <div className="grid border-t border-overlay-track">
            <SettingsCheckbox
              checked={settings.dashboardFollowsWidgetTheme}
              label="Use the widget theme for the whole interface"
              onChange={(dashboardFollowsWidgetTheme) => onUpdate({ dashboardFollowsWidgetTheme })}
            />
          </div>
        </div>
        <div>
          <h3 className="m-0 mb-2 text-[13px] font-semibold text-overlay-strong">Startup</h3>
          <div className="grid border-t border-overlay-track">
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
        <div>
          <h3 className="m-0 mb-2 text-[13px] font-semibold text-overlay-strong">Data</h3>
          <div className="grid border-t border-overlay-track">
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
