import { createContext, useContext } from 'react'
import type { DashboardRoute } from '@shared/dashboard'
import type { DeepSeekCredentialStatus } from '@shared/ipc'
import type { ProviderView } from '@shared/provider'
import type { AppSettings, SettingsPatch } from '@shared/settings'
import type { UsageHistory } from '@shared/usageHistory'

export interface DashboardContextValue {
  settings: AppSettings
  settingsReady: boolean
  providers: ProviderView[]
  history: UsageHistory
  deepSeekCredentials: DeepSeekCredentialStatus
  route: DashboardRoute
  navigate(route: DashboardRoute): void
  updateSettings(patch: SettingsPatch): Promise<AppSettings>
  saveDeepSeekApiKey(apiKey: string): Promise<DeepSeekCredentialStatus>
  clearDeepSeekApiKey(): Promise<DeepSeekCredentialStatus>
}

export const DashboardContext = createContext<DashboardContextValue | undefined>(undefined)

export function useDashboard(): DashboardContextValue {
  const value = useContext(DashboardContext)
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider')
  return value
}
