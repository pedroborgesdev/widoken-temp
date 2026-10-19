import { createContext, useContext } from 'react'
import type { DashboardRoute } from '@shared/dashboard'
import type { BrowserSessionStatus, DeepSeekCredentialStatus } from '@shared/ipc'
import type { ProviderView } from '@shared/provider'
import type { AppSettings, SettingsPatch } from '@shared/settings'

export interface DashboardContextValue {
  settings: AppSettings
  settingsReady: boolean
  providers: ProviderView[]
  deepSeekCredentials: DeepSeekCredentialStatus
  browserSessions: BrowserSessionStatus[]
  route: DashboardRoute
  navigate(route: DashboardRoute): void
  updateSettings(patch: SettingsPatch): Promise<AppSettings>
  resetSettings(): Promise<AppSettings>
  saveDeepSeekApiKey(apiKey: string): Promise<DeepSeekCredentialStatus>
  clearDeepSeekApiKey(): Promise<DeepSeekCredentialStatus>
  loginBrowserSession(providerId: string): Promise<BrowserSessionStatus>
  logoutBrowserSession(providerId: string): Promise<BrowserSessionStatus>
}

export const DashboardContext = createContext<DashboardContextValue | undefined>(undefined)

export function useDashboard(): DashboardContextValue {
  const value = useContext(DashboardContext)
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider')
  return value
}
