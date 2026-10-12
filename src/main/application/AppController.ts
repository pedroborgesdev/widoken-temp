import { app } from 'electron'
import { join } from 'node:path'
import { IPC } from '@shared/ipc'
import type { ProviderView } from '@shared/provider'
import type { AppSettings } from '@shared/settings'
import { DeepSeekCredentialService } from '../credentials/DeepSeekCredentialService'
import { ProviderCredentialRepository, repositoryApiKeyStore } from '../credentials/ProviderCredentialRepository'
import { safeStorageCodec } from '../credentials/safeStorageCodec'
import { registerDeepSeekCredentialsIpc } from '../ipc/deepseekCredentials.ipc'
import { registerOverlayIpc } from '../ipc/overlay.ipc'
import { registerProvidersIpc } from '../ipc/providers.ipc'
import { registerSettingsIpc } from '../ipc/settings.ipc'
import { ProviderManager } from '../providers/ProviderManager'
import { createProviderRegistry } from '../providers/registry'
import { SettingsRepository } from '../settings/SettingsRepository'
import { DashboardWindowManager } from '../windows/DashboardWindowManager'
import { WidgetWindowManager } from '../windows/WidgetWindowManager'
import { completeInitialWidgetProviderDiscovery, hideProvidersUntilInitialDiscovery } from './initialWidgetProviderDiscovery'

export class AppController {
  private credentialRepository: ProviderCredentialRepository | undefined
  private providerManager: ProviderManager | undefined
  private widgetWindows: WidgetWindowManager | undefined
  private dashboardWindows: DashboardWindowManager | undefined

  async start(): Promise<void> {
    const userDataPath = app.getPath('userData')
    const settingsRepository = new SettingsRepository(join(userDataPath, 'settings.json'))
    let settings = await settingsRepository.get()
    if (!settings.widgetProviderDiscoveryCompleted) {
      settings = await settingsRepository.update({
        providers: hideProvidersUntilInitialDiscovery(settings).providers
      })
    }
    // The sqlite file keeps its historical name; it now stores only credentials.
    const credentialsDatabasePath = join(userDataPath, 'analytics.sqlite')
    const credentialRepository = new ProviderCredentialRepository(credentialsDatabasePath, { codec: safeStorageCodec })
    const widgetWindows = new WidgetWindowManager(settingsRepository)
    const dashboardWindows = new DashboardWindowManager(
      settingsRepository,
      () => widgetWindows.window,
      (open) => widgetWindows.sendDashboardWindowState(open)
    )
    const providerManager = new ProviderManager(
      createProviderRegistry({
        deepSeekStatePath: join(userDataPath, 'deepseek-balance.json'),
        deepSeekApiKeys: repositoryApiKeyStore(credentialRepository),
        huggingFaceStatePath: join(userDataPath, 'huggingface-balance.json'),
        huggingFaceScriptRoot: app.isPackaged
          ? join(process.resourcesPath, 'huggingface')
          : join(app.getAppPath(), 'resources', 'huggingface')
      }),
      (providers) => this.publishProviders(providers)
    )

    this.credentialRepository = credentialRepository
    this.widgetWindows = widgetWindows
    this.dashboardWindows = dashboardWindows
    this.providerManager = providerManager

    registerOverlayIpc(widgetWindows)
    registerProvidersIpc(providerManager)
    registerDeepSeekCredentialsIpc(new DeepSeekCredentialService(credentialRepository), providerManager)
    registerSettingsIpc(
      settingsRepository,
      providerManager,
      {
        open: (route) => dashboardWindows.open(route),
        close: () => dashboardWindows.close(),
        minimize: () => dashboardWindows.minimize(),
        resizeToContent: (height) => dashboardWindows.resizeToContent(height)
      },
      (updatedSettings) => this.applySettings(updatedSettings)
    )

    providerManager.start(settings.providers, settings.refreshIntervalSeconds)
    app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
    await widgetWindows.applySettings(settings)
    if (!settings.widget.enabled) await dashboardWindows.open()
    if (!settings.widgetProviderDiscoveryCompleted) {
      void this.finishInitialWidgetProviderDiscovery(settingsRepository, providerManager)
    }
  }

  async handleSecondInstance(): Promise<void> {
    await this.dashboardWindows?.open()
  }

  async stop(): Promise<void> {
    this.providerManager?.stop()
    this.dashboardWindows?.destroy()
    await this.widgetWindows?.destroy()
    this.credentialRepository?.close()
    this.providerManager = undefined
    this.dashboardWindows = undefined
    this.widgetWindows = undefined
    this.credentialRepository = undefined
  }

  private async applySettings(settings: AppSettings): Promise<AppSettings> {
    return (await this.widgetWindows?.applySettings(settings)) ?? settings
  }

  private async finishInitialWidgetProviderDiscovery(
    settingsRepository: SettingsRepository,
    providerManager: ProviderManager
  ): Promise<void> {
    try {
      const providers = await providerManager.refresh()
      const current = await settingsRepository.get()
      if (current.widgetProviderDiscoveryCompleted) return

      const discovered = completeInitialWidgetProviderDiscovery(current, providers)
      const updated = await settingsRepository.update({
        providers: discovered.providers,
        widgetProviderDiscoveryCompleted: true
      })
      providerManager.configure(updated.providers, updated.refreshIntervalSeconds)
      await this.applySettings(updated)
    } catch (error) {
      console.warn('Failed to complete initial widget provider discovery:', error)
    }
  }

  private publishProviders(providers: ProviderView[]): void {
    const windows = [...(this.widgetWindows?.overlayWindows() ?? []), this.dashboardWindows?.window]
    for (const window of windows) {
      if (window && !window.isDestroyed()) window.webContents.send(IPC.providersUpdated, providers)
    }
  }
}
