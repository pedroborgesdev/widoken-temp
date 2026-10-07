import { useCallback, type CSSProperties } from 'react'
import { SettingsPanel } from '../components/Settings/SettingsPanel'
import { dashboardDesktop } from '../services/desktop'
import { useDashboard } from './state/DashboardContext'

export function DashboardApp(): React.JSX.Element {
  const { settings, settingsReady, updateSettings } = useDashboard()

  const syncVsCodeTheme = useCallback(async (): Promise<string> => {
    const theme = await dashboardDesktop.themes.syncVsCode()
    await updateSettings({ widget: { themeMode: 'vscode', vscodeTheme: theme } })
    return theme.name
  }, [updateSettings])

  return (
    <main
      className={`settings-window overlay-root--theme-dark-pastel overlay-root--shadows-${settings.widget.shadows ? 'enabled' : 'disabled'}`}
      style={{ '--shadow-opacity': `${settings.widget.shadowOpacity}%` } as CSSProperties}
    >
      {settingsReady && (
        <SettingsPanel
          variant="window"
          settings={settings}
          onUpdate={(patch) => void updateSettings(patch)}
          onSyncVsCodeTheme={syncVsCodeTheme}
          onClose={() => void dashboardDesktop.dashboard.close()}
          onMinimize={() => void dashboardDesktop.dashboard.minimize()}
        />
      )}
    </main>
  )
}
