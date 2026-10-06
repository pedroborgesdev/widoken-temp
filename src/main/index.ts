import { app, BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { IPC } from '@shared/ipc'
import { registerOverlayIpc } from './ipc/overlay.ipc'
import { registerProvidersIpc } from './ipc/providers.ipc'
import { registerSettingsIpc } from './ipc/settings.ipc'
import { ProviderManager } from './providers/ProviderManager'
import { createProviderRegistry } from './providers/registry'
import { SettingsRepository } from './settings/SettingsRepository'
import { createOverlayWindow, resolveTargetDisplay } from './window/createOverlayWindow'
import { createSettingsWindow } from './window/createSettingsWindow'
import { watchTargetDisplay } from './window/displays'
import { updateInteractionWindowBounds, updateWaylandCursor } from './window/interactionRegions'
import { startKWinCursorBridge, type KWinCursorBridge } from './window/kwinCursorBridge'
import { isNativeWayland } from './window/platform'
import { AnalyticsService } from './analytics/AnalyticsService'

if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland') {
  app.commandLine.appendSwitch('ozone-platform', process.env.WIDOKEN_OZONE_PLATFORM ?? 'wayland')
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  let overlayWindow: BrowserWindow | undefined
  let settingsWindow: BrowserWindow | undefined
  let stopWatchingDisplays: (() => void) | undefined
  let cursorBridge: KWinCursorBridge | undefined
  let providerManager: ProviderManager | undefined
  let analyticsService: AnalyticsService | undefined
  let isFinishingQuit = false

  app.on('second-instance', () => overlayWindow?.showInactive())

  app.whenReady().then(async () => {
    const settingsRepository = new SettingsRepository(join(app.getPath('userData'), 'settings.json'))
    const settings = await settingsRepository.get()
    analyticsService = new AnalyticsService(join(app.getPath('userData'), 'analytics.sqlite'))
    const targetDisplay = resolveTargetDisplay(settings)
    overlayWindow = createOverlayWindow(settings, targetDisplay)

    providerManager = new ProviderManager(createProviderRegistry(), (providers) => {
      if (!overlayWindow?.isDestroyed()) overlayWindow?.webContents.send(IPC.providersUpdated, providers)
    }, analyticsService)

    registerOverlayIpc(overlayWindow)
    registerProvidersIpc(providerManager)
    registerSettingsIpc(settingsRepository, providerManager, {
      open: () => {
        if (settingsWindow && !settingsWindow.isDestroyed()) {
          if (settingsWindow.isMinimized()) settingsWindow.restore()
          settingsWindow.show()
          settingsWindow.focus()
          return
        }
        if (!overlayWindow || overlayWindow.isDestroyed()) return
        settingsWindow = createSettingsWindow(overlayWindow)
        overlayWindow.webContents.send(IPC.settingsWindowState, true)
        settingsWindow.once('closed', () => {
          settingsWindow = undefined
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send(IPC.settingsWindowState, false)
          }
        })
      },
      close: () => settingsWindow?.close(),
      minimize: () => settingsWindow?.minimize(),
      resizeToContent: (requestedHeight) => {
        if (!settingsWindow || settingsWindow.isDestroyed() || !Number.isFinite(requestedHeight)) return
        const bounds = settingsWindow.getBounds()
        const display = screen.getDisplayMatching(bounds)
        const height = Math.max(360, Math.min(Math.ceil(requestedHeight), display.workArea.height - 32))
        const centeredY = Math.round(bounds.y + (bounds.height - height) / 2)
        const y = Math.min(
          Math.max(centeredY, display.workArea.y + 16),
          display.workArea.y + display.workArea.height - height - 16
        )
        settingsWindow.setBounds({ ...bounds, y, height }, true)
      }
    })
    if (isNativeWayland() && (process.env.XDG_CURRENT_DESKTOP ?? '').toLowerCase().includes('kde')) {
      try {
        cursorBridge = await startKWinCursorBridge(
          (point) => {
            if (overlayWindow && !overlayWindow.isDestroyed()) updateWaylandCursor(overlayWindow, point)
          },
          (bounds) => {
            if (overlayWindow && !overlayWindow.isDestroyed()) updateInteractionWindowBounds(overlayWindow, bounds)
          },
          targetDisplay.bounds
        )
      } catch (error) {
        console.warn('KWin cursor bridge unavailable; transparent areas will remain interactive:', error)
      }
    }
    providerManager.start(settings.providers, settings.refreshIntervalSeconds, settings.analytics.localInsights)
    stopWatchingDisplays = watchTargetDisplay(
      overlayWindow,
      () => settingsRepository.get(),
      async (bounds, force) => cursorBridge?.refreshTargetBounds(bounds, force)
    )
    app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
  })

  app.on('window-all-closed', () => app.quit())
  app.on('before-quit', (event) => {
    stopWatchingDisplays?.()
    providerManager?.stop()
    analyticsService?.close()
    if (!cursorBridge || isFinishingQuit) return

    event.preventDefault()
    isFinishingQuit = true
    const bridge = cursorBridge
    cursorBridge = undefined
    void bridge.stop().finally(() => app.exit(0))
  })
}
