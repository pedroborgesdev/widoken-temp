import { useCallback, type CSSProperties } from 'react'
import type { SettingsPatch } from '@shared/settings'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { desktop } from './services/desktop'
import { useOverlay } from './state/OverlayContext'

export function SettingsWindow(): React.JSX.Element {
  const { state, dispatch } = useOverlay()

  const updateSettings = useCallback(async (patch: SettingsPatch): Promise<void> => {
    dispatch({
      type: 'settings-updated',
      settings: {
        ...state.settings,
        ...patch,
        widget: { ...state.settings.widget, ...patch.widget },
        analytics: { ...state.settings.analytics, ...patch.analytics },
        providers: patch.providers ?? state.settings.providers
      }
    })
    const settings = await desktop.settings.update(patch)
    dispatch({ type: 'settings-updated', settings })
  }, [dispatch, state.settings])

  return (
    <main
      className={`settings-window overlay-root--theme-dark-pastel overlay-root--shadows-${state.settings.widget.shadows ? 'enabled' : 'disabled'}`}
      style={{ '--shadow-opacity': `${state.settings.widget.shadowOpacity}%` } as CSSProperties}
    >
      {state.settingsReady && (
        <SettingsPanel
          variant="window"
          settings={state.settings}
          onUpdate={(patch) => void updateSettings(patch)}
          onClose={() => void desktop.settings.closeWindow()}
          onMinimize={() => void desktop.settings.minimizeWindow()}
        />
      )}
    </main>
  )
}
