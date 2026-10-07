import type { ProviderSnapshot, ProviderView } from '@shared/provider'
import type { ProviderSetting } from '@shared/settings'
import type { ProviderAdapter } from './ProviderAdapter'
import type { AnalyticsService } from '../analytics/AnalyticsService'

type UpdateListener = (providers: ProviderView[]) => void
const ACTIVITY_POLL_INTERVAL_MS = 750

export class ProviderManager {
  private enabled: ProviderSetting[] = []
  private readonly snapshots = new Map<string, ProviderSnapshot>()
  private pollTimer?: NodeJS.Timeout
  private intervalSeconds = 45
  private localInsights = false
  private inFlight?: Promise<ProviderView[]>
  private configurationRevision = 0
  private inFlightRevision = 0
  private readonly activity = new Map<string, boolean>()
  private activityTimer?: NodeJS.Timeout
  private activityPolling = false

  constructor(
    private readonly adapters: Map<string, ProviderAdapter>,
    private readonly onUpdate: UpdateListener,
    private readonly analytics?: AnalyticsService
  ) {}

  start(providers: ProviderSetting[], intervalSeconds: number, localInsights = false): void {
    this.configure(providers, intervalSeconds, localInsights)
    void this.refresh()
    this.activityPolling = true
    void this.pollActivity()
  }

  configure(providers: ProviderSetting[], intervalSeconds: number, localInsights = this.localInsights): void {
    this.configurationRevision += 1
    this.enabled = providers
      .filter((provider) => provider.enabled && this.adapters.has(provider.id))
      .sort((a, b) => a.order - b.order)
    const enabledIds = new Set(this.enabled.map((provider) => provider.id))
    for (const id of this.activity.keys()) {
      if (!enabledIds.has(id)) this.activity.delete(id)
    }
    this.intervalSeconds = Math.min(3600, Math.max(30, intervalSeconds))
    this.localInsights = localInsights
    this.analytics?.setLocalInsights(localInsights)
    this.scheduleNext()
    this.onUpdate(this.list())
  }

  stop(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer)
    this.pollTimer = undefined
    this.activityPolling = false
    if (this.activityTimer) clearTimeout(this.activityTimer)
    this.activityTimer = undefined
  }

  list(): ProviderView[] {
    return this.enabled.flatMap((setting) => {
      const adapter = this.adapters.get(setting.id)
      if (!adapter) return []

      return [
        {
          id: adapter.id,
          name: adapter.name,
          activity: this.activity.get(adapter.id) ? 'active' : 'idle',
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
    if (this.inFlight && !id) {
      const activeRefresh = this.inFlight
      const activeRevision = this.inFlightRevision
      const providers = await activeRefresh
      return this.configurationRevision !== activeRevision ? this.refresh() : providers
    }

    const task = this.performRefresh(id)
    const revision = this.configurationRevision
    if (!id) {
      this.inFlight = task
      this.inFlightRevision = revision
    }

    let providers: ProviderView[]
    try {
      providers = await task
    } finally {
      if (!id && this.inFlight === task) this.inFlight = undefined
      this.scheduleNext()
    }
    return !id && this.configurationRevision !== revision ? this.refresh() : providers
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

  private async pollActivity(): Promise<void> {
    const enabled = [...this.enabled]
    const results = await Promise.all(enabled.map(async ({ id }) => {
      const adapter = this.adapters.get(id)
      if (!adapter?.isActive) return { active: false, id }
      try {
        return { active: await adapter.isActive(), id }
      } catch {
        return { active: false, id }
      }
    }))
    if (!this.activityPolling) return

    let changed = false
    const completed: string[] = []
    for (const { active, id } of results) {
      const previous = this.activity.get(id) ?? false
      this.activity.set(id, active)
      if (previous === active) continue
      changed = true
      if (previous && !active) completed.push(id)
    }
    if (changed) this.onUpdate(this.list())
    for (const id of completed) void this.refresh(id)

    this.activityTimer = setTimeout(() => void this.pollActivity(), ACTIVITY_POLL_INTERVAL_MS)
  }
}
