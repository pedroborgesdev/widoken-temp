import type { ProviderSnapshot, ProviderStatus, UsageLimit } from '@shared/provider'
import type { ProviderAdapter } from '../ProviderAdapter'

interface MockProviderOptions {
  id: string
  name: string
  status?: ProviderStatus
  limits?: UsageLimit[]
  error?: string
  plan?: string
  isUnlimited?: boolean
}

export class MockProviderAdapter implements ProviderAdapter {
  readonly id: string
  readonly name: string
  private connected = true
  private readonly status: ProviderStatus
  private readonly limits: UsageLimit[]
  private readonly error?: string
  private readonly plan?: string
  private readonly isUnlimited?: boolean

  constructor(options: MockProviderOptions) {
    this.id = options.id
    this.name = options.name
    this.status = options.status ?? 'connected'
    this.limits = options.limits ?? []
    this.error = options.error
    this.plan = options.plan
    this.isUnlimited = options.isUnlimited
  }

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async isConnected(): Promise<boolean> {
    return this.connected
  }

  async getUsage(): Promise<ProviderSnapshot> {
    await new Promise((resolve) => setTimeout(resolve, 80))

    return {
      providerId: this.id,
      status: this.connected ? this.status : 'disconnected',
      limits: this.connected ? this.limits : [],
      lastUpdatedAt: new Date().toISOString(),
      plan: this.connected ? this.plan : undefined,
      isUnlimited: this.connected ? this.isUnlimited : undefined,
      error: this.connected ? this.error : undefined
    }
  }
}
