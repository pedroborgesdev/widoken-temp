import type { ProviderSnapshot } from '@shared/provider'

export interface ProviderAdapter {
  readonly id: string
  readonly name: string
  connect(): Promise<void>
  disconnect(): Promise<void>
  getUsage(): Promise<ProviderSnapshot>
  isConnected(): Promise<boolean>
}
