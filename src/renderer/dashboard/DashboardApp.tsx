import { useCallback, type CSSProperties } from 'react'
import { dashboardDesktop } from '../services/desktop'
import { activeSyncedTheme, syncedThemeStyle } from '../utils/theme'
import { DashboardPanel } from './DashboardPanel'
import { useDashboard } from './state/DashboardContext'

export function DashboardApp(): React.JSX.Element {
  const { settings, settingsReady, providers, history, route, navigate, updateSettings } = useDashboard()

  const syncVsCodeTheme = useCallback(async (): Promise<string> => {
    const theme = await dashboardDesktop.themes.syncVsCode()
    await updateSettings({ widget: { themeMode: 'vscode', vscodeTheme: theme } })
    return theme.name
  }, [updateSettings])

  const followsWidget = settings.dashboardFollowsWidgetTheme
  const theme = followsWidget ? settings.widget.theme : 'dark-pastel'

  return (
    <main
      className={`settings-window overlay-root--theme-${theme} overlay-root--shadows-${settings.widget.shadows ? 'enabled' : 'disabled'}`}
      style={{
        ...(followsWidget ? syncedThemeStyle(activeSyncedTheme(settings)) : {}),
        '--shadow-opacity': `${settings.widget.shadowOpacity}%`
      } as CSSProperties}
    >
      {settingsReady && (
        <DashboardPanel
          settings={settings}
          providers={providers}
          history={history}
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
