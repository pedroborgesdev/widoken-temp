import { app } from 'electron'
import { join } from 'node:path'
import { IPC } from '@shared/ipc'
import type { ProviderView } from '@shared/provider'
import type { AppSettings } from '@shared/settings'
import { AnalyticsService } from '../analytics/AnalyticsService'
import { registerAnalyticsIpc } from '../ipc/analytics.ipc'
import { registerOverlayIpc } from '../ipc/overlay.ipc'
import { registerProvidersIpc } from '../ipc/providers.ipc'
import { registerSettingsIpc } from '../ipc/settings.ipc'
import { ProviderManager } from '../providers/ProviderManager'
import { createProviderRegistry } from '../providers/registry'
import { SettingsRepository } from '../settings/SettingsRepository'
import { DashboardWindowManager } from '../windows/DashboardWindowManager'
import { WidgetWindowManager } from '../windows/WidgetWindowManager'

export class AppController {
  private analyticsService: AnalyticsService | undefined
  private providerManager: ProviderManager | undefined
  private widgetWindows: WidgetWindowManager | undefined
  private dashboardWindows: DashboardWindowManager | undefined

  async start(): Promise<void> {
    const userDataPath = app.getPath('userData')
    const settingsRepository = new SettingsRepository(join(userDataPath, 'settings.json'))
    const settings = await settingsRepository.get()
    const analyticsService = new AnalyticsService(join(userDataPath, 'analytics.sqlite'))
    const widgetWindows = new WidgetWindowManager(settingsRepository)
    const dashboardWindows = new DashboardWindowManager(
      settingsRepository,
      () => widgetWindows.window,
      (open) => widgetWindows.sendDashboardWindowState(open)
    )
    const providerManager = new ProviderManager(
      createProviderRegistry(),
      (providers) => this.publishProviders(providers),
      analyticsService
    )

    this.analyticsService = analyticsService
    this.widgetWindows = widgetWindows
    this.dashboardWindows = dashboardWindows
    this.providerManager = providerManager

    registerOverlayIpc(() => widgetWindows.window)
    registerAnalyticsIpc(analyticsService)
    registerProvidersIpc(providerManager)
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

    providerManager.start(settings.providers, settings.refreshIntervalSeconds, settings.analytics.localInsights)
    app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
    await widgetWindows.applySettings(settings)
    if (!settings.widget.enabled || settings.openDashboardAtStartup) await dashboardWindows.open()
  }

  async handleSecondInstance(): Promise<void> {
    await this.dashboardWindows?.open()
  }

  async stop(): Promise<void> {
    this.providerManager?.stop()
    this.dashboardWindows?.destroy()
    await this.widgetWindows?.destroy()
    this.analyticsService?.close()
    this.providerManager = undefined
    this.dashboardWindows = undefined
    this.widgetWindows = undefined
    this.analyticsService = undefined
  }

  private async applySettings(settings: AppSettings): Promise<void> {
    await this.widgetWindows?.applySettings(settings)
  }

  private publishProviders(providers: ProviderView[]): void {
    const windows = [this.widgetWindows?.window, this.dashboardWindows?.window]
    for (const window of windows) {
      if (window && !window.isDestroyed()) window.webContents.send(IPC.providersUpdated, providers)
    }
  }
}
