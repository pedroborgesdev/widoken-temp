import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderSnapshot } from '../../src/shared/provider'
import { ProviderManager } from '../../src/main/providers/ProviderManager'
import type { ProviderAdapter } from '../../src/main/providers/ProviderAdapter'

afterEach(() => vi.useRealTimers())
const usageDisplay = { split: false }

describe('ProviderManager', () => {
  it('does not claim idle activity when an adapter has no activity probe', () => {
    const adapter: ProviderAdapter = {
      id: 'quota-only',
      name: 'Quota only',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      getUsage: async () => ({
        providerId: 'quota-only',
        status: 'connected',
        limits: [],
        lastUpdatedAt: new Date().toISOString()
      })
    }
    const manager = new ProviderManager(new Map([[adapter.id, adapter]]), () => undefined)

    manager.configure([{ id: adapter.id, enabled: true, order: 0, usageDisplay }], 30)

    expect(manager.list()[0]).not.toHaveProperty('activity')
    manager.stop()
  })

  it('connects and disconnects adapters as provider settings change', async () => {
    const connect = vi.fn(async () => undefined)
    const disconnect = vi.fn(async () => undefined)
    const adapter: ProviderAdapter = {
      id: 'lifecycle',
      name: 'Lifecycle',
      connect,
      disconnect,
      isConnected: async () => true,
      getUsage: async () => ({
        providerId: 'lifecycle',
        status: 'connected',
        limits: [],
        lastUpdatedAt: new Date().toISOString()
      })
    }
    const manager = new ProviderManager(new Map([[adapter.id, adapter]]), () => undefined)

    manager.configure([{ id: adapter.id, enabled: true, order: 0, usageDisplay }], 30)
    manager.configure([{ id: adapter.id, enabled: false, order: 0, usageDisplay }], 30)
    manager.configure([{ id: adapter.id, enabled: true, order: 0, usageDisplay }], 30)
    await Promise.resolve()

    expect(connect).toHaveBeenCalledTimes(2)
    expect(disconnect).toHaveBeenCalledTimes(1)
    manager.stop()
  })

  it('does not restart quota polling when an in-flight refresh finishes after stop', async () => {
    vi.useFakeTimers()
    let finishRefresh!: () => void
    const adapter: ProviderAdapter = {
      id: 'slow',
      name: 'Slow',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      getUsage: async () => {
        await new Promise<void>((resolve) => { finishRefresh = resolve })
        return {
          providerId: 'slow',
          status: 'connected' as const,
          limits: [],
          lastUpdatedAt: new Date().toISOString()
        }
      }
    }
    const manager = new ProviderManager(new Map([[adapter.id, adapter]]), () => undefined)

    manager.start([{ id: adapter.id, enabled: true, order: 0, usageDisplay }], 30)
    await vi.advanceTimersByTimeAsync(0)
    manager.stop()
    finishRefresh()
    await vi.runAllTimersAsync()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not let an older overlapping refresh overwrite a newer snapshot', async () => {
    let finishFirst!: (snapshot: ProviderSnapshot) => void
    let markFirstStarted!: () => void
    const firstStarted = new Promise<void>((resolve) => { markFirstStarted = resolve })
    let calls = 0
    const adapter: ProviderAdapter = {
      id: 'overlap',
      name: 'Overlap',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      getUsage: async () => {
        calls += 1
        if (calls === 1) {
          markFirstStarted()
          return new Promise<ProviderSnapshot>((resolve) => { finishFirst = resolve })
        }
        return {
          providerId: 'overlap',
          status: 'connected',
          limits: [{ id: 'quota', label: 'Quota', percent: 20 }],
          lastUpdatedAt: '2026-10-14T12:00:01.000Z'
        }
      }
    }
    const manager = new ProviderManager(new Map([[adapter.id, adapter]]), () => undefined)
    manager.configure([{ id: adapter.id, enabled: true, order: 0, usageDisplay }], 30)

    const older = manager.refresh(adapter.id)
    await firstStarted
    const newer = manager.refresh(adapter.id)
    finishFirst({
      providerId: adapter.id,
      status: 'connected',
      limits: [{ id: 'quota', label: 'Quota', percent: 10 }],
      lastUpdatedAt: '2026-10-14T12:00:00.000Z'
    })
    await Promise.all([older, newer])

    expect(manager.list()[0]?.snapshot.limits[0]?.percent).toBe(20)
    manager.stop()
  })

  it('keeps the full refresh cadence after a targeted refresh', async () => {
    vi.useFakeTimers()
    const firstUsage = vi.fn(async () => ({
      providerId: 'first',
      status: 'connected' as const,
      limits: [],
      lastUpdatedAt: new Date().toISOString()
    }))
    const secondUsage = vi.fn(async () => ({
      providerId: 'second',
      status: 'connected' as const,
      limits: [],
      lastUpdatedAt: new Date().toISOString()
    }))
    const adapter = (id: string, getUsage: ProviderAdapter['getUsage']): ProviderAdapter => ({
      id,
      name: id,
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      getUsage
    })
    const manager = new ProviderManager(new Map([
      ['first', adapter('first', firstUsage)],
      ['second', adapter('second', secondUsage)]
    ]), () => undefined)
    manager.start([
      { id: 'first', enabled: true, order: 0, usageDisplay },
      { id: 'second', enabled: true, order: 1, usageDisplay }
    ], 30)
    await vi.advanceTimersByTimeAsync(0)

    await vi.advanceTimersByTimeAsync(20_000)
    await manager.refresh('first')
    await vi.advanceTimersByTimeAsync(10_000)

    expect(firstUsage).toHaveBeenCalledTimes(3)
    expect(secondUsage).toHaveBeenCalledTimes(2)
    manager.stop()
  })

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

  it('continues collecting a globally enabled provider hidden from the widget', async () => {
    const getUsage = vi.fn(async (): Promise<ProviderSnapshot> => ({
      providerId: 'hidden',
      status: 'connected',
      limits: [],
      lastUpdatedAt: new Date().toISOString()
    }))
    const adapter: ProviderAdapter = {
      id: 'hidden',
      name: 'Hidden',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      getUsage
    }
    const manager = new ProviderManager(new Map([['hidden', adapter]]), () => undefined)

    manager.configure([{
      id: 'hidden',
      enabled: true,
      visibleInWidget: false,
      order: 0,
      usageDisplay
    }], 30)

    await expect(manager.refresh()).resolves.toMatchObject([
      { id: 'hidden', snapshot: { status: 'connected' } }
    ])
    expect(getUsage).toHaveBeenCalledOnce()
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

  it('keeps an active provider stable through a transient activity probe failure', async () => {
    vi.useFakeTimers()
    let fails = false
    const adapter: ProviderAdapter = {
      id: 'active',
      name: 'Active',
      connect: async () => undefined,
      disconnect: async () => undefined,
      isConnected: async () => true,
      isActive: async () => {
        if (fails) throw new Error('temporary read failure')
        return true
      },
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
    expect(manager.list()[0]?.activity).toBe('active')

    fails = true
    await vi.advanceTimersByTimeAsync(750)
    expect(manager.list()[0]?.activity).toBe('active')
    await vi.advanceTimersByTimeAsync(5_250)
    expect(manager.list()[0]?.activity).toBe('idle')
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
