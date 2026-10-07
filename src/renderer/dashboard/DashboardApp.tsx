import { useCallback, type CSSProperties } from 'react'
import { dashboardDesktop } from '../services/desktop'
import { DashboardPanel } from './DashboardPanel'
import { useDashboard } from './state/DashboardContext'

export function DashboardApp(): React.JSX.Element {
  const { settings, settingsReady, providers, route, navigate, updateSettings } = useDashboard()

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
        <DashboardPanel
          settings={settings}
          providers={providers}
          route={route}
          onNavigate={navigate}
          onUpdate={(patch) => void updateSettings(patch)}
          onSyncVsCodeTheme={syncVsCodeTheme}
          onClose={() => void dashboardDesktop.dashboard.close()}
          onMinimize={() => void dashboardDesktop.dashboard.minimize()}
        />
      )}
    </main>
  )
}
