import { screen, type BrowserWindow } from 'electron'
import { DEFAULT_DASHBOARD_ROUTE, type DashboardRoute } from '@shared/dashboard'
import { IPC } from '@shared/ipc'
import { createDashboardWindow } from '../window/createDashboardWindow'
import { resolveTargetDisplay } from '../window/createOverlayWindow'
import type { SettingsRepository } from '../settings/SettingsRepository'

export class DashboardWindowManager {
  private dashboardWindow: BrowserWindow | undefined
  private opening: Promise<void> | undefined

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly getWidgetWindow: () => BrowserWindow | undefined,
    private readonly onWindowStateChanged: (open: boolean) => void
  ) {}

  get window(): BrowserWindow | undefined {
    return this.dashboardWindow && !this.dashboardWindow.isDestroyed() ? this.dashboardWindow : undefined
  }

  /** Without a route an already open dashboard keeps its current page. */
  async open(route?: DashboardRoute): Promise<void> {
    if (this.opening) await this.opening
    const existing = this.window
    if (existing) {
      if (existing.isMinimized()) existing.restore()
      existing.show()
      existing.focus()
      if (route) this.navigate(existing, route)
      return
    }

    this.opening = this.create(route ?? DEFAULT_DASHBOARD_ROUTE)
    try {
      await this.opening
    } finally {
      this.opening = undefined
    }
  }

  close(): void {
    this.window?.close()
  }

  minimize(): void {
    this.window?.minimize()
  }

  resizeToContent(requestedHeight: number): void {
    const window = this.window
    if (!window || !Number.isFinite(requestedHeight)) return
    const bounds = window.getBounds()
    const display = screen.getDisplayMatching(bounds)
    const height = Math.max(360, Math.min(Math.ceil(requestedHeight), display.workArea.height - 32))
    const centeredY = Math.round(bounds.y + (bounds.height - height) / 2)
    const y = Math.min(
      Math.max(centeredY, display.workArea.y + 16),
      display.workArea.y + display.workArea.height - height - 16
    )
    window.setBounds({ ...bounds, y, height }, true)
  }

  destroy(): void {
    const window = this.window
    this.dashboardWindow = undefined
    if (window) window.destroy()
  }

  private navigate(window: BrowserWindow, route: DashboardRoute): void {
    const send = (): void => {
      if (!window.isDestroyed()) window.webContents.send(IPC.dashboardNavigate, route)
    }
    if (window.webContents.isLoading()) window.webContents.once('did-finish-load', send)
    else send()
  }

  private async create(route: DashboardRoute): Promise<void> {
    const settings = await this.settingsRepository.get()
    if (this.window) return
    const widgetWindow = this.getWidgetWindow()
    const display = widgetWindow
      ? screen.getDisplayMatching(widgetWindow.getBounds())
      : resolveTargetDisplay(settings)
    const window = createDashboardWindow(display, route)
    this.dashboardWindow = window
    this.onWindowStateChanged(true)
    window.once('closed', () => {
      if (this.dashboardWindow !== window) return
      this.dashboardWindow = undefined
      this.onWindowStateChanged(false)
    })
  }
}
