import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type AppSettings, type SettingsPatch } from '@shared/settings'
import { dashboardDesktop } from '../../services/desktop'

interface DashboardContextValue {
  settings: AppSettings
  settingsReady: boolean
  updateSettings(patch: SettingsPatch): Promise<AppSettings>
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined)

function mergeSettings(settings: AppSettings, patch: SettingsPatch): AppSettings {
  return {
    ...settings,
    ...patch,
    widget: { ...settings.widget, ...patch.widget },
    analytics: { ...settings.analytics, ...patch.analytics },
    providers: patch.providers ?? settings.providers
  }
}

export function DashboardProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsReady, setSettingsReady] = useState(false)

  useEffect(() => {
    let active = true
    void dashboardDesktop.settings.get().then((loadedSettings) => {
      if (!active) return
      setSettings(loadedSettings)
      setSettingsReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => dashboardDesktop.settings.onUpdated((updatedSettings) => {
    setSettings(updatedSettings)
    setSettingsReady(true)
  }), [])

  const updateSettings = useCallback(async (patch: SettingsPatch): Promise<AppSettings> => {
    setSettings((current) => mergeSettings(current, patch))
    const updatedSettings = await dashboardDesktop.settings.update(patch)
    setSettings(updatedSettings)
    return updatedSettings
  }, [])

  const value = useMemo(
    () => ({ settings, settingsReady, updateSettings }),
    [settings, settingsReady, updateSettings]
  )
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard(): DashboardContextValue {
  const value = useContext(DashboardContext)
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider')
  return value
}
