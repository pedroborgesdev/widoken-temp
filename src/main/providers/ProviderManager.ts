import type { ProviderSnapshot, ProviderView } from '@shared/provider'
import type { ProviderSetting } from '@shared/settings'
import type { ProviderAdapter } from './ProviderAdapter'
import type { AnalyticsService } from '../analytics/AnalyticsService'

type UpdateListener = (providers: ProviderView[]) => void

export class ProviderManager {
  private enabled: ProviderSetting[] = []
  private readonly snapshots = new Map<string, ProviderSnapshot>()
  private pollTimer?: NodeJS.Timeout
  private intervalSeconds = 45
  private localInsights = false
  private inFlight?: Promise<ProviderView[]>

  constructor(
    private readonly adapters: Map<string, ProviderAdapter>,
    private readonly onUpdate: UpdateListener,
    private readonly analytics?: AnalyticsService
  ) {}

  start(providers: ProviderSetting[], intervalSeconds: number, localInsights = false): void {
    this.configure(providers, intervalSeconds, localInsights)
    void this.refresh()
  }

  configure(providers: ProviderSetting[], intervalSeconds: number, localInsights = this.localInsights): void {
    this.enabled = providers
      .filter((provider) => provider.enabled && this.adapters.has(provider.id))
      .sort((a, b) => a.order - b.order)
    this.intervalSeconds = Math.min(3600, Math.max(30, intervalSeconds))
    this.localInsights = localInsights
    this.analytics?.setLocalInsights(localInsights)
    this.scheduleNext()
    this.onUpdate(this.list())
  }

  stop(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer)
    this.pollTimer = undefined
  }

  list(): ProviderView[] {
    return this.enabled.flatMap((setting) => {
      const adapter = this.adapters.get(setting.id)
      if (!adapter) return []

      return [
        {
          id: adapter.id,
          name: adapter.name,
          snapshot:
            this.snapshots.get(adapter.id) ??
            ({
              providerId: adapter.id,
              status: 'loading',
              limits: [],
              lastUpdatedAt: new Date(0).toISOString()
            } satisfies ProviderSnapshot)
        }
      ]
    })
  }

  async refresh(id?: string): Promise<ProviderView[]> {
    if (this.inFlight && !id) return this.inFlight

    const task = this.performRefresh(id)
    if (!id) this.inFlight = task

    try {
      return await task
    } finally {
      if (!id) this.inFlight = undefined
      this.scheduleNext()
    }
  }

  private async performRefresh(id?: string): Promise<ProviderView[]> {
    const selected = this.enabled.filter((setting) => !id || setting.id === id)

    await Promise.all(
      selected.map(async ({ id: providerId }) => {
        const adapter = this.adapters.get(providerId)
        if (!adapter) return

        try {
          const snapshot = await adapter.getUsage()
          this.snapshots.set(providerId, this.analytics ? await this.analytics.enhance(snapshot) : snapshot)
        } catch (error) {
          this.snapshots.set(providerId, {
            providerId,
            status: 'error',
            limits: [],
            lastUpdatedAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown provider error'
          })
        }
      })
    )

    const providers = this.list()
    this.onUpdate(providers)
    return providers
  }

  private scheduleNext(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer)
    this.pollTimer = setTimeout(() => void this.refresh(), this.intervalSeconds * 1000)
  }
}
