import { screen, type BrowserWindow, type Rectangle } from 'electron'
import { IPC } from '@shared/ipc'
import type { AppSettings } from '@shared/settings'
import type { SettingsRepository } from '../settings/SettingsRepository'
import { createOverlayWindow, resolveTargetDisplay } from '../window/createOverlayWindow'
import { watchTargetDisplay } from '../window/displays'
import { updateInteractionCursor, updateInteractionWindowBounds } from '../window/interactionRegions'
import { startKWinCursorBridge, type KWinCursorBridge } from '../window/kwinCursorBridge'
import { isNativeWayland } from '../window/platform'

const WINDOWS_CURSOR_INTERVAL_MS = 16

function startWindowsCursorTracking(window: BrowserWindow): () => void {
  if (process.platform !== 'win32') return () => undefined

  let lastX = Number.NaN
  let lastY = Number.NaN
  const track = (): void => {
    if (window.isDestroyed()) return
    const point = screen.getCursorScreenPoint()
    if (point.x === lastX && point.y === lastY) return
    lastX = point.x
    lastY = point.y
    updateInteractionCursor(window, point)
  }

  track()
  const timer = setInterval(track, WINDOWS_CURSOR_INTERVAL_MS)
  return () => clearInterval(timer)
}

export class WidgetWindowManager {
  private widgetWindow: BrowserWindow | undefined
  private stopWatchingDisplays: (() => void) | undefined
  private stopWindowsCursorTracking: (() => void) | undefined
  private cursorBridge: KWinCursorBridge | undefined
  private generation = 0
  private dashboardWindowOpen = false

  constructor(private readonly settingsRepository: SettingsRepository) {}

  get window(): BrowserWindow | undefined {
    return this.widgetWindow && !this.widgetWindow.isDestroyed() ? this.widgetWindow : undefined
  }

  async applySettings(settings: AppSettings): Promise<void> {
    if (settings.widget.enabled) {
      await this.enable(settings)
    } else {
      await this.disable()
    }
  }

  send(channel: string, ...args: unknown[]): void {
    const window = this.window
    if (window) window.webContents.send(channel, ...args)
  }

  sendDashboardWindowState(open: boolean): void {
    this.dashboardWindowOpen = open
    this.send(IPC.dashboardWindowState, open)
  }

  async disable(): Promise<void> {
    this.generation += 1
    this.stopWatchingDisplays?.()
    this.stopWatchingDisplays = undefined
    this.stopWindowsCursorTracking?.()
    this.stopWindowsCursorTracking = undefined

    const window = this.window
    this.widgetWindow = undefined
    if (window) window.destroy()

    const bridge = this.cursorBridge
    this.cursorBridge = undefined
    if (bridge) {
      try {
        await bridge.stop()
      } catch (error) {
        console.warn('Could not stop the KWin cursor bridge:', error)
      }
    }
  }

  async destroy(): Promise<void> {
    await this.disable()
  }

  private async enable(settings: AppSettings): Promise<void> {
    if (this.window) return
    const generation = ++this.generation
    const targetDisplay = resolveTargetDisplay(settings)
    const window = createOverlayWindow(settings, targetDisplay)
    this.widgetWindow = window
    window.webContents.once('did-finish-load', () => {
      if (!window.isDestroyed()) window.webContents.send(IPC.dashboardWindowState, this.dashboardWindowOpen)
    })
    window.once('closed', () => {
      if (this.widgetWindow === window) this.widgetWindow = undefined
    })

    this.stopWindowsCursorTracking = startWindowsCursorTracking(window)
    this.stopWatchingDisplays = watchTargetDisplay(
      window,
      () => this.settingsRepository.get(),
      async (bounds, force) => this.cursorBridge?.refreshTargetBounds(bounds, force)
    )

    if (!isNativeWayland() || !(process.env.XDG_CURRENT_DESKTOP ?? '').toLowerCase().includes('kde')) return
    try {
      const bridge = await startKWinCursorBridge(
        (point) => {
          if (!window.isDestroyed()) updateInteractionCursor(window, point)
        },
        (bounds: Rectangle) => {
          if (!window.isDestroyed()) updateInteractionWindowBounds(window, bounds)
        },
        targetDisplay.bounds
      )
      if (generation !== this.generation || this.window !== window) {
        await bridge.stop()
        return
      }
      this.cursorBridge = bridge
    } catch (error) {
      console.warn('KWin cursor bridge unavailable; transparent areas will remain interactive:', error)
    }
  }
}
