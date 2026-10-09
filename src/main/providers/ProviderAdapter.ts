import type { ProviderSnapshot } from '@shared/provider'
import type { ProviderSetting } from '@shared/settings'

export interface ProviderAdapter {
  readonly id: string
  readonly name: string
  connect(): Promise<void>
  disconnect(): Promise<void>
  getUsage(): Promise<ProviderSnapshot>
  isConnected(): Promise<boolean>
  isActive?(): Promise<boolean>
  configure?(setting: ProviderSetting): void
}
