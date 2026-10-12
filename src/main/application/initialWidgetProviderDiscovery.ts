import type { ProviderView } from '@shared/provider'
import type { AppSettings } from '@shared/settings'

export function hideProvidersUntilInitialDiscovery(settings: AppSettings): AppSettings {
  return {
    ...settings,
    providers: settings.providers.map((provider) => ({ ...provider, visibleInWidget: false }))
  }
}

export function completeInitialWidgetProviderDiscovery(
  settings: AppSettings,
  providers: ProviderView[]
): AppSettings {
  const discovered = new Set(
    providers
      .filter(({ snapshot }) => snapshot.status === 'connected' && snapshot.limits.length > 0)
      .map(({ id }) => id)
  )

  return {
    ...settings,
    widgetProviderDiscoveryCompleted: true,
    providers: settings.providers.map((provider) => ({
      ...provider,
      visibleInWidget: provider.enabled && discovered.has(provider.id)
    }))
  }
}
