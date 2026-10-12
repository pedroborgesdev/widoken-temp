import { describe, expect, it } from 'vitest'
import type { ProviderView } from '../../src/shared/provider'
import { DEFAULT_SETTINGS } from '../../src/shared/settings'
import {
  completeInitialWidgetProviderDiscovery,
  hideProvidersUntilInitialDiscovery
} from '../../src/main/application/initialWidgetProviderDiscovery'

function view(id: string, status: ProviderView['snapshot']['status'], limits = 1): ProviderView {
  return {
    id,
    name: id,
    snapshot: {
      providerId: id,
      status,
      limits: Array.from({ length: limits }, (_, index) => ({ id: String(index), label: String(index), percent: 0 })),
      lastUpdatedAt: new Date().toISOString()
    }
  }
}

describe('initial widget provider discovery', () => {
  it('hides every provider while the first collection is pending', () => {
    const settings = hideProvidersUntilInitialDiscovery(DEFAULT_SETTINGS)

    expect(settings.providers.every(({ enabled }) => enabled)).toBe(true)
    expect(settings.providers.every(({ visibleInWidget }) => visibleInWidget === false)).toBe(true)
    expect(settings.widgetProviderDiscoveryCompleted).toBe(false)
  })

  it('shows only enabled providers that successfully returned usage data', () => {
    const pending = hideProvidersUntilInitialDiscovery(DEFAULT_SETTINGS)
    pending.providers = pending.providers.map((provider) =>
      provider.id === 'cursor' ? { ...provider, enabled: false } : provider
    )

    const completed = completeInitialWidgetProviderDiscovery(pending, [
      view('claude', 'connected'),
      view('openai', 'connected', 0),
      view('cursor', 'connected'),
      view('antigravity', 'unavailable')
    ])

    expect(completed.widgetProviderDiscoveryCompleted).toBe(true)
    expect(completed.providers.filter(({ visibleInWidget }) => visibleInWidget).map(({ id }) => id)).toEqual(['claude'])
  })
})
