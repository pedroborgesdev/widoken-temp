import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dashboardRouteFromSearch, sanitizeDashboardRoute, type DashboardRoute } from '@shared/dashboard'
import type { DeepSeekCredentialStatus } from '@shared/ipc'
import type { ProviderView } from '@shared/provider'
import { DEFAULT_SETTINGS, type AppSettings, type SettingsPatch } from '@shared/settings'
import { dashboardDesktop } from '../../services/desktop'
import { DashboardContext } from './useDashboard'

const EMPTY_DEEPSEEK_CREDENTIALS: DeepSeekCredentialStatus = {
  storedApiKeyConfigured: false,
  environmentApiKeyAvailable: false,
  harnessAccountAvailable: false
}

function mergeSettings(settings: AppSettings, patch: SettingsPatch): AppSettings {
  return {
    ...settings,
    ...patch,
    widget: { ...settings.widget, ...patch.widget },
    providers: patch.providers ?? settings.providers
  }
}

export function DashboardProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsReady, setSettingsReady] = useState(false)
  const [providers, setProviders] = useState<ProviderView[]>([])
  const [deepSeekCredentials, setDeepSeekCredentials] = useState<DeepSeekCredentialStatus>(EMPTY_DEEPSEEK_CREDENTIALS)
  const [route, setRoute] = useState<DashboardRoute>(() => dashboardRouteFromSearch(window.location.search))

  useEffect(() => {
    let active = true
    void dashboardDesktop.settings.get().then((loadedSettings) => {
      if (!active) return
      setSettings(loadedSettings)
      setSettingsReady(true)
    })
    void dashboardDesktop.providers.list().then((loadedProviders) => {
      if (active) setProviders(loadedProviders)
    })
    void dashboardDesktop.deepseek.status().then((status) => {
      if (active) setDeepSeekCredentials(status)
    }).catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => dashboardDesktop.settings.onUpdated((updatedSettings) => {
    setSettings(updatedSettings)
    setSettingsReady(true)
  }), [])

  useEffect(() => dashboardDesktop.providers.onUpdated(setProviders), [])

  useEffect(() => dashboardDesktop.dashboard.onNavigate((nextRoute) => {
    setRoute(sanitizeDashboardRoute(nextRoute))
  }), [])

  const navigate = useCallback((nextRoute: DashboardRoute): void => {
    setRoute(sanitizeDashboardRoute(nextRoute))
  }, [])

  const updateSettings = useCallback(async (patch: SettingsPatch): Promise<AppSettings> => {
    setSettings((current) => mergeSettings(current, patch))
    const updatedSettings = await dashboardDesktop.settings.update(patch)
    setSettings(updatedSettings)
    return updatedSettings
  }, [])

  const resetSettings = useCallback(async (): Promise<AppSettings> => {
    const reset = await dashboardDesktop.settings.reset()
    setSettings(reset)
    return reset
  }, [])

  const saveDeepSeekApiKey = useCallback(async (apiKey: string): Promise<DeepSeekCredentialStatus> => {
    const status = await dashboardDesktop.deepseek.saveApiKey(apiKey)
    setDeepSeekCredentials(status)
    return status
  }, [])

  const clearDeepSeekApiKey = useCallback(async (): Promise<DeepSeekCredentialStatus> => {
    const status = await dashboardDesktop.deepseek.clearApiKey()
    setDeepSeekCredentials(status)
    return status
  }, [])

  const value = useMemo(
    () => ({
      settings,
      settingsReady,
      providers,
      deepSeekCredentials,
      route,
      navigate,
      updateSettings,
      resetSettings,
      saveDeepSeekApiKey,
      clearDeepSeekApiKey
    }),
    [
      settings,
      settingsReady,
      providers,
      deepSeekCredentials,
      route,
      navigate,
      updateSettings,
      resetSettings,
      saveDeepSeekApiKey,
      clearDeepSeekApiKey
    ]
  )
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}
