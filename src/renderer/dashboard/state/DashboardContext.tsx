import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dashboardRouteFromSearch, sanitizeDashboardRoute, type DashboardRoute } from '@shared/dashboard'
import type { ProviderView } from '@shared/provider'
import { DEFAULT_SETTINGS, type AppSettings, type SettingsPatch } from '@shared/settings'
import { buildUsageHistory, type UsageHistory } from '@shared/usageHistory'
import { dashboardDesktop } from '../../services/desktop'

interface DashboardContextValue {
  settings: AppSettings
  settingsReady: boolean
  providers: ProviderView[]
  history: UsageHistory
  route: DashboardRoute
  navigate(route: DashboardRoute): void
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
  const [providers, setProviders] = useState<ProviderView[]>([])
  const [history, setHistory] = useState<UsageHistory>(() => buildUsageHistory([], Date.now()))
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
    return () => {
      active = false
    }
  }, [])

  useEffect(() => dashboardDesktop.settings.onUpdated((updatedSettings) => {
    setSettings(updatedSettings)
    setSettingsReady(true)
  }), [])

  useEffect(() => dashboardDesktop.providers.onUpdated(setProviders), [])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = (): void => {
      void dashboardDesktop.analytics.history().then((next) => {
        if (active) setHistory(next)
      }).catch(() => undefined)
    }
    load()
    const unsubscribe = dashboardDesktop.providers.onUpdated(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(load, 1500)
    })
    return () => {
      active = false
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [])

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

  const value = useMemo(
    () => ({ settings, settingsReady, providers, history, route, navigate, updateSettings }),
    [settings, settingsReady, providers, history, route, navigate, updateSettings]
  )
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard(): DashboardContextValue {
  const value = useContext(DashboardContext)
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider')
  return value
}
