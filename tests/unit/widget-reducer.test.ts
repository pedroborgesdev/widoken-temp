import { describe, expect, it } from 'vitest'
import type { ProviderView } from '../../src/shared/provider'
import { DEFAULT_SETTINGS } from '../../src/shared/settings'
import { initialWidgetState, widgetReducer } from '../../src/renderer/widget/state/widgetReducer'

function provider(status: ProviderView['snapshot']['status']): ProviderView {
  return {
    id: 'openai',
    name: 'ChatGPT',
    snapshot: {
      providerId: 'openai',
      status,
      limits: [],
      lastUpdatedAt: new Date(0).toISOString()
    }
  }
}

describe('widget startup readiness', () => {
  it('waits for settings and a settled provider snapshot', () => {
    const withSettings = widgetReducer(initialWidgetState, {
      type: 'settings-loaded',
      settings: DEFAULT_SETTINGS
    })
    expect(withSettings.settingsReady).toBe(true)
    expect(withSettings.providersReady).toBe(false)

    const loading = widgetReducer(withSettings, {
      type: 'providers-updated',
      providers: [provider('loading')]
    })
    expect(loading.providersReady).toBe(false)

    const ready = widgetReducer(loading, {
      type: 'providers-updated',
      providers: [provider('connected')]
    })
    expect(ready.providersReady).toBe(true)
  })

  it('does not hide the widget again during later refreshes', () => {
    const ready = widgetReducer(initialWidgetState, {
      type: 'providers-updated',
      providers: [provider('connected')]
    })
    const refreshing = widgetReducer(ready, {
      type: 'providers-updated',
      providers: [provider('loading')]
    })

    expect(refreshing.providersReady).toBe(true)
  })
})
