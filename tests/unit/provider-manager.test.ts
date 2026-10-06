import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderSnapshot } from '../../src/shared/provider'
import { ProviderManager } from '../../src/main/providers/ProviderManager'
import type { ProviderAdapter } from '../../src/main/providers/ProviderAdapter'

afterEach(() => vi.useRealTimers())

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

    manager.configure([{ id: 'instant', enabled: true, order: 0 }], 30)

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
    manager.configure([{ id: 'broken', enabled: true, order: 0 }], 30)

    const [provider] = await manager.refresh()
    expect(provider.snapshot.status).toBe('error')
    expect(provider.snapshot.error).toBe('provider offline')
    manager.stop()
  })
})
