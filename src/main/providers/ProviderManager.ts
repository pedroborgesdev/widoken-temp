import type { ProviderSnapshot, ProviderView } from '@shared/provider'
import type { ProviderSetting } from '@shared/settings'
import type { ProviderAdapter } from './ProviderAdapter'
import { planListPrice } from './planPricing'

type UpdateListener = (providers: ProviderView[]) => void
const ACTIVITY_POLL_INTERVAL_MS = 750
const ACTIVITY_FAILURE_GRACE_MS = 5_000

export class ProviderManager {
  private enabled: ProviderSetting[] = []
  private readonly snapshots = new Map<string, ProviderSnapshot>()
  private pollTimer?: NodeJS.Timeout
  private quotaPolling = false
  private stopped = false
  private intervalSeconds = 45
  private inFlight?: Promise<ProviderView[]>
  private configurationRevision = 0
  private inFlightRevision = 0
  private readonly refreshSequence = new Map<string, number>()
  private readonly providerRefreshes = new Map<string, Promise<void>>()
  private readonly activity = new Map<string, boolean>()
  private readonly activityFailureSince = new Map<string, number>()
  private activityTimer?: NodeJS.Timeout
  private activityPolling = false

  constructor(
    private readonly adapters: Map<string, ProviderAdapter>,
    private readonly onUpdate: UpdateListener
  ) {}

  start(providers: ProviderSetting[], intervalSeconds: number): void {
    this.stopped = false
    this.quotaPolling = true
    this.configure(providers, intervalSeconds)
    void this.refresh()
    if (!this.activityPolling) {
      this.activityPolling = true
      void this.pollActivity()
    }
  }

  configure(providers: ProviderSetting[], intervalSeconds: number): void {
    this.configurationRevision += 1
    const previouslyEnabled = new Set(this.enabled.map(({ id }) => id))
    for (const setting of providers) {
      this.adapters.get(setting.id)?.configure?.(setting)
    }
    this.enabled = providers
      .filter((provider) => provider.enabled && this.adapters.has(provider.id))
      .sort((a, b) => a.order - b.order)
    const enabledIds = new Set(this.enabled.map((provider) => provider.id))
    for (const [id, adapter] of this.adapters) {
      if (previouslyEnabled.has(id) && !enabledIds.has(id)) void adapter.disconnect().catch(() => undefined)
      if (!previouslyEnabled.has(id) && enabledIds.has(id)) void adapter.connect().catch(() => undefined)
    }
    for (const id of this.activity.keys()) {
      if (!enabledIds.has(id)) {
        this.activity.delete(id)
        this.activityFailureSince.delete(id)
      }
    }
    this.intervalSeconds = Math.min(3600, Math.max(30, intervalSeconds))
    this.scheduleNext()
    this.onUpdate(this.list())
  }

  stop(): void {
    this.stopped = true
    this.quotaPolling = false
    if (this.pollTimer) clearTimeout(this.pollTimer)
    this.pollTimer = undefined
    this.activityPolling = false
    if (this.activityTimer) clearTimeout(this.activityTimer)
    this.activityTimer = undefined
    for (const adapter of this.adapters.values()) void adapter.disconnect().catch(() => undefined)
  }

  list(): ProviderView[] {
    return this.enabled.flatMap((setting) => {
      const adapter = this.adapters.get(setting.id)
      if (!adapter) return []

      const view: ProviderView = {
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
      if (adapter.isActive) view.activity = this.activity.get(adapter.id) ? 'active' : 'idle'
      return [view]
    })
  }

  async refresh(id?: string): Promise<ProviderView[]> {
    if (this.stopped) return this.list()
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
      if (!id) this.scheduleNext()
    }
    return !id && this.configurationRevision !== revision ? this.refresh() : providers
  }

  private async performRefresh(id?: string): Promise<ProviderView[]> {
    const selected = this.enabled.filter((setting) => !id || setting.id === id)

    await Promise.all(
      selected.map(({ id: providerId }) => this.refreshProvider(providerId))
    )

    const providers = this.list()
    if (this.stopped) return providers
    this.onUpdate(providers)
    return providers
  }

  private refreshProvider(providerId: string): Promise<void> {
    const adapter = this.adapters.get(providerId)
    if (!adapter) return Promise.resolve()
    const sequence = (this.refreshSequence.get(providerId) ?? 0) + 1
    this.refreshSequence.set(providerId, sequence)
    const previous = this.providerRefreshes.get(providerId) ?? Promise.resolve()
    const operation = previous.catch(() => undefined).then(async () => {
      if (this.stopped) return
      try {
        const snapshot = await adapter.getUsage()
        if (this.stopped || this.refreshSequence.get(providerId) !== sequence) return
        const listPrice = planListPrice(providerId, snapshot.plan)
        this.snapshots.set(providerId, listPrice ? { ...snapshot, listPrice } : snapshot)
      } catch (error) {
        if (this.stopped || this.refreshSequence.get(providerId) !== sequence) return
        this.snapshots.set(providerId, {
          providerId,
          status: 'error',
          limits: [],
          lastUpdatedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown provider error'
        })
      }
    })
    this.providerRefreshes.set(providerId, operation)
    return operation.finally(() => {
      if (this.providerRefreshes.get(providerId) === operation) this.providerRefreshes.delete(providerId)
    })
  }

  private scheduleNext(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer)
    this.pollTimer = undefined
    if (!this.quotaPolling) return
    this.pollTimer = setTimeout(() => void this.refresh(), this.intervalSeconds * 1000)
  }

  private async pollActivity(): Promise<void> {
    const enabled = [...this.enabled]
    const results = await Promise.all(enabled.map(async ({ id }) => {
      const adapter = this.adapters.get(id)
      if (!adapter?.isActive) return { active: false, id }
      try {
        const active = await adapter.isActive()
        this.activityFailureSince.delete(id)
        return { active, id }
      } catch {
        const now = Date.now()
        const failedSince = this.activityFailureSince.get(id) ?? now
        this.activityFailureSince.set(id, failedSince)
        const keepActive = (this.activity.get(id) ?? false) && now - failedSince < ACTIVITY_FAILURE_GRACE_MS
        return { active: keepActive, id }
      }
    }))
    if (!this.activityPolling) return

    let changed = false
    const completed: string[] = []
    const enabledIds = new Set(this.enabled.map(({ id }) => id))
    for (const { active, id } of results) {
      if (!enabledIds.has(id)) continue
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
