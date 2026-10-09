import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderSnapshot } from '../../src/shared/provider'
import { ProviderManager } from '../../src/main/providers/ProviderManager'
import type { ProviderAdapter } from '../../src/main/providers/ProviderAdapter'

afterEach(() => vi.useRealTimers())
const usageDisplay = { split: false }

describe('ProviderManager', () => {
  it('publishes newly enabled providers immediately without waiting for a refresh', () => {
    vi.useFakeTimers()
    const adapter: ProviderAdapter = {
      id: 'instant',
      name: 'Instant',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      getUsage: async () => new Promise<ProviderSnapshot>(() => undefined)
    }
    const onUpdate = vi.fn()
    const manager = new ProviderManager(new Map([['instant', adapter]]), onUpdate)

    manager.configure([{ id: 'instant', enabled: true, order: 0, usageDisplay }], 30)

    expect(onUpdate).toHaveBeenCalledOnce()
    expect(onUpdate.mock.calls[0][0]).toMatchObject([
      { id: 'instant', name: 'Instant', snapshot: { status: 'loading' } }
    ])
    manager.stop()
  })

  it('turns adapter failures into an error snapshot', async () => {
    vi.useFakeTimers()
    const broken: ProviderAdapter = {
      id: 'broken',
      name: 'Broken',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      getUsage: async (): Promise<ProviderSnapshot> => {
        throw new Error('provider offline')
      }
    }
    const manager = new ProviderManager(new Map([['broken', broken]]), () => undefined)
    manager.configure([{ id: 'broken', enabled: true, order: 0, usageDisplay }], 30)

    const [provider] = await manager.refresh()
    expect(provider.snapshot.status).toBe('error')
    expect(provider.snapshot.error).toBe('provider offline')
    manager.stop()
  })

  it('refreshes providers enabled while an older refresh is still running', async () => {
    vi.useFakeTimers()
    let finishFirst!: () => void
    const firstRefresh = new Promise<void>((resolve) => {
      finishFirst = resolve
    })
    const first: ProviderAdapter = {
      id: 'first',
      name: 'First',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      getUsage: async () => {
        await firstRefresh
        return { providerId: 'first', status: 'connected', limits: [], lastUpdatedAt: new Date().toISOString() }
      }
    }
    const secondUsage = vi.fn(async () => ({
      providerId: 'second',
      status: 'unavailable' as const,
      limits: [],
      lastUpdatedAt: new Date().toISOString()
    }))
    const second: ProviderAdapter = {
      id: 'second',
      name: 'Second',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      getUsage: secondUsage
    }
    const manager = new ProviderManager(new Map([['first', first], ['second', second]]), () => undefined)
    manager.configure([{ id: 'first', enabled: true, order: 0, usageDisplay }], 30)
    const activeRefresh = manager.refresh()

    manager.configure([
      { id: 'first', enabled: true, order: 0, usageDisplay },
      { id: 'second', enabled: true, order: 1, usageDisplay }
    ], 30)
    const reconfiguredRefresh = manager.refresh()
    finishFirst()

    await expect(activeRefresh).resolves.toHaveLength(2)
    await expect(reconfiguredRefresh).resolves.toHaveLength(2)
    expect(secondUsage).toHaveBeenCalledOnce()
    manager.stop()
  })

  it('publishes activity changes independently from the usage refresh interval', async () => {
    vi.useFakeTimers()
    let active = false
    const adapter: ProviderAdapter = {
      id: 'active',
      name: 'Active',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      isActive: async () => active,
      getUsage: async () => ({
        providerId: 'active',
        status: 'connected',
        limits: [],
        lastUpdatedAt: new Date().toISOString()
      })
    }
    const onUpdate = vi.fn()
    const manager = new ProviderManager(new Map([['active', adapter]]), onUpdate)
    manager.start([{ id: 'active', enabled: true, order: 0, usageDisplay }], 30)
    await vi.advanceTimersByTimeAsync(0)

    active = true
    await vi.advanceTimersByTimeAsync(750)
    expect(onUpdate.mock.calls.at(-1)?.[0]).toMatchObject([{ activity: 'active' }])

    active = false
    await vi.advanceTimersByTimeAsync(750)
    expect(onUpdate.mock.calls.at(-1)?.[0]).toMatchObject([{ activity: 'idle' }])
    manager.stop()
  })

  it('delivers each provider setting to the adapter before refreshing', () => {
    vi.useFakeTimers()
    const configure = vi.fn()
    const adapter: ProviderAdapter = {
      id: 'deepseek',
      name: 'DeepSeek',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      configure,
      getUsage: async () => ({
        providerId: 'deepseek',
        status: 'connected',
        limits: [],
        lastUpdatedAt: new Date().toISOString()
      })
    }
    const manager = new ProviderManager(new Map([['deepseek', adapter]]), () => undefined)
    const setting = {
      id: 'deepseek',
      enabled: true,
      order: 0,
      usageDisplay,
      credentialSource: 'api-key' as const
    }

    manager.configure([setting], 30)

    expect(configure).toHaveBeenCalledWith(setting)
    manager.stop()
  })
})
