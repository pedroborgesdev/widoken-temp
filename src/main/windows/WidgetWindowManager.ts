import { screen, type BrowserWindow, type Display, type Point, type Rectangle, type WebContents } from 'electron'
import { IPC, type OverlayDragRelay } from '@shared/ipc'
import { displayForPoint, displayIdFromOverlayTitle, unionBounds, WIDGET_OVERLAY_TITLE, overlayWindowTitle, type DisplayRect, type OverlayLayout } from '@shared/overlayDisplay'
import type { AppSettings } from '@shared/settings'
import type { SettingsRepository } from '../settings/SettingsRepository'
import { applyOverlayDisplayBounds, createOverlayWindow, resolveTargetDisplay } from '../window/createOverlayWindow'
import { watchDisplays } from '../window/displays'
import {
  makeWindowFullyInteractive,
  updateInteractionCursor,
  updateInteractionWindowBounds
} from '../window/interactionRegions'
import { startKWinCursorBridge, type KWinCursorBridge } from '../window/kwinCursorBridge'
import { isNativeWayland } from '../window/platform'

const CURSOR_INTERVAL_MS = 16

interface DragSession {
  offsetX: number
  offsetY: number
  hostId?: number
}

function isKdeWayland(): boolean {
  return isNativeWayland() && (process.env.XDG_CURRENT_DESKTOP ?? '').toLowerCase().includes('kde')
}

function spansDesktop(): boolean {
  return !isNativeWayland()
}

export class WidgetWindowManager {
  private widgetWindow: BrowserWindow | undefined
  private guides = new Map<number, BrowserWindow>()
  private hostDisplayId: number | undefined
  private stopWatchingDisplays: (() => void) | undefined
  private cursorTimer: ReturnType<typeof setInterval> | undefined
  private cursorBridge: KWinCursorBridge | undefined
  private kwinStarting = false
  private generation = 0
  private dashboardWindowOpen = false
  private dragSession: DragSession | undefined
  private lastCursor: Point | undefined
  private lastDragMoveKey = ''
  private kwinBounds = new Map<number, Rectangle>()
  private syncing: Promise<void> = Promise.resolve()

  constructor(private readonly settingsRepository: SettingsRepository) {}

  get window(): BrowserWindow | undefined {
    return this.widgetWindow && !this.widgetWindow.isDestroyed() ? this.widgetWindow : undefined
  }

  overlayWindows(): BrowserWindow[] {
    return [this.widgetWindow, ...this.guides.values()].filter(
      (overlay): overlay is BrowserWindow => overlay != null && !overlay.isDestroyed()
    )
  }

  windowForContents(contents: WebContents): BrowserWindow | undefined {
    return this.overlayWindows().find((overlay) => overlay.webContents === contents)
  }

  async applySettings(settings: AppSettings): Promise<AppSettings> {
    let applied = settings
    const run = this.syncing.then(async () => {
      if (!settings.widget.enabled) {
        await this.teardown()
        return
      }
      applied = await this.syncDisplays(settings)
    })
    this.syncing = run.then(() => undefined, () => undefined)
    await run
    return applied
  }

  send(channel: string, ...args: unknown[]): void {
    for (const overlay of this.overlayWindows()) overlay.webContents.send(channel, ...args)
  }

  sendDashboardWindowState(open: boolean): void {
    this.dashboardWindowOpen = open
    this.send(IPC.dashboardWindowState, open)
  }

  beginDrag(offsetX: number, offsetY: number): void {
    if (this.dragSession || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return
    this.lastDragMoveKey = ''
    this.dragSession = { offsetX, offsetY, hostId: this.hostDisplayId }
    for (const overlay of this.overlayWindows()) makeWindowFullyInteractive(overlay)
    this.window?.moveTop()
    this.startCursorTimer()
    const point = this.readCursor()
    if (!point) return
    this.lastCursor = point
    this.publish(point, IPC.overlayDragMove, this.dragSession)
  }

  completeDrag(): void {
    const session = this.dragSession
    if (!session) return
    const point = this.readCursor() ?? this.lastCursor ?? { x: 0, y: 0 }
    this.dragSession = undefined
    this.publish(point, IPC.overlayDragEnd, session)
  }

  async disable(): Promise<void> {
    const run = this.syncing.then(() => this.teardown())
    this.syncing = run.then(() => undefined, () => undefined)
    await run
  }

  private async teardown(): Promise<void> {
    this.generation += 1
    this.dragSession = undefined
    this.stopWatchingDisplays?.()
    this.stopWatchingDisplays = undefined
    this.stopCursorTimer()
    this.lastCursor = undefined
    this.kwinBounds.clear()
    this.hostDisplayId = undefined

    const windows = this.overlayWindows()
    this.widgetWindow = undefined
    this.guides.clear()
    for (const overlay of windows) {
      if (!overlay.isDestroyed()) overlay.destroy()
    }

    const bridge = this.cursorBridge
    this.cursorBridge = undefined
    if (!bridge) return
    try {
      await bridge.stop()
    } catch (error) {
      console.warn('Could not stop the KWin cursor bridge:', error)
    }
  }

  async destroy(): Promise<void> {
    await this.disable()
  }

  private async syncDisplays(settings: AppSettings): Promise<AppSettings> {
    if (!this.stopWatchingDisplays) {
      this.stopWatchingDisplays = watchDisplays(() => {
        void this.settingsRepository.get().then((current) => this.applySettings(current))
      })
    }

    const displays = screen.getAllDisplays()
    if (displays.length === 0) return settings

    let next = settings
    let relocated = false
    const liveIds = new Set(displays.map((display) => display.id))
    if (settings.display?.id != null && !liveIds.has(settings.display.id)) {
      const fallback = resolveTargetDisplay({ ...settings, display: undefined })
      next = await this.settingsRepository.update({ display: { id: fallback.id } })
      relocated = true
    }

    const host = resolveTargetDisplay(next)
    const coverage = this.coverageBounds(host)

    for (const [id, overlay] of this.guides) {
      if (!spansDesktop() && liveIds.has(id)) continue
      this.guides.delete(id)
      this.kwinBounds.delete(id)
      if (!overlay.isDestroyed()) overlay.destroy()
    }

    if (!this.window) {
      this.hostDisplayId = host.id
      this.widgetWindow = this.openOverlay(
        next,
        host,
        'widget',
        coverage,
        spansDesktop() ? this.relativeDisplays(coverage) : undefined
      )
    } else if (!this.dragSession) {
      if (spansDesktop()) this.placeWindow(this.window, coverage)
      else this.moveWidgetWindow(host.id)
    }

    if (!spansDesktop()) {
      for (const display of displays) {
        const existing = this.guides.get(display.id)
        if (existing && !existing.isDestroyed()) {
          this.placeWindow(existing, display.bounds)
          continue
        }
        this.guides.set(display.id, this.openOverlay(next, display, 'guides', display.bounds))
      }
    }
    if (this.dragSession) this.window?.moveTop()
    this.publishDisplays()

    if (relocated) this.send(IPC.settingsUpdated, next)
    this.startCursorTimer()
    await this.ensureKwinBridge()
    await this.cursorBridge?.refreshLayouts(this.currentLayouts(), false)
    return next
  }

  private coverageBounds(host: Display): Rectangle {
    if (!spansDesktop()) return host.bounds
    return unionBounds(screen.getAllDisplays().map((display) => display.bounds)) ?? host.bounds
  }

  private relativeDisplays(origin: Rectangle): DisplayRect[] {
    return this.displayRects().map((display) => ({
      ...display,
      x: display.x - origin.x,
      y: display.y - origin.y
    }))
  }

  private publishDisplays(): void {
    const widget = this.window
    if (!spansDesktop() || !widget || widget.isDestroyed() || widget.webContents.isLoading()) return
    widget.webContents.send(IPC.overlayDisplays, this.relativeDisplays(widget.getBounds()))
  }

  private openOverlay(
    settings: AppSettings,
    display: Display,
    role: 'widget' | 'guides',
    bounds: Rectangle,
    displays?: DisplayRect[]
  ): BrowserWindow {
    const overlay = createOverlayWindow(settings, display, {
      home: role === 'widget',
      role,
      bounds,
      displays
    })
    overlay.webContents.once('did-finish-load', () => {
      if (!overlay.isDestroyed()) overlay.webContents.send(IPC.dashboardWindowState, this.dashboardWindowOpen)
    })
    overlay.once('closed', () => {
      if (this.widgetWindow === overlay) this.widgetWindow = undefined
      if (this.guides.get(display.id) === overlay) this.guides.delete(display.id)
    })
    if (this.dragSession) makeWindowFullyInteractive(overlay)
    return overlay
  }

  private moveWidgetWindow(displayId: number): void {
    const widget = this.window
    if (!widget) return
    const display = screen.getAllDisplays().find((item) => item.id === displayId)
    if (!display) return
    const moved = this.hostDisplayId !== displayId
    this.hostDisplayId = displayId
    if (!moved && this.sameBounds(widget.getBounds(), display.bounds)) return
    this.lastDragMoveKey = ''
    applyOverlayDisplayBounds(widget, display.bounds)
    updateInteractionWindowBounds(widget, display.bounds)
    widget.setAlwaysOnTop(true, process.platform === 'win32' ? 'screen-saver' : 'floating')
    widget.moveTop()
    if (moved && isKdeWayland()) void this.cursorBridge?.refreshLayouts(this.currentLayouts(), true)
  }

  private sameBounds(current: Rectangle, next: Rectangle): boolean {
    return current.x === next.x && current.y === next.y && current.width === next.width && current.height === next.height
  }

  private placeWindow(overlay: BrowserWindow, bounds: Rectangle): void {
    const current = overlay.getBounds()
    if (
      current.x === bounds.x &&
      current.y === bounds.y &&
      current.width === bounds.width &&
      current.height === bounds.height
    ) return
    applyOverlayDisplayBounds(overlay, bounds)
    updateInteractionWindowBounds(overlay, bounds)
  }

  private currentLayouts(): OverlayLayout[] {
    const layouts = screen.getAllDisplays().map((display) => ({
      caption: overlayWindowTitle(display.id),
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height
    }))
    const host = screen.getAllDisplays().find((display) => display.id === this.hostDisplayId)
    if (host) {
      layouts.push({
        caption: WIDGET_OVERLAY_TITLE,
        x: host.bounds.x,
        y: host.bounds.y,
        width: host.bounds.width,
        height: host.bounds.height
      })
    }
    return layouts
  }

  private async ensureKwinBridge(): Promise<void> {
    if (this.cursorBridge || this.kwinStarting || !isKdeWayland()) return
    this.kwinStarting = true
    const generation = this.generation
    try {
      const bridge = await startKWinCursorBridge(
        (point) => this.onKwinCursor(point),
        (caption, bounds) => this.onKwinConfigured(caption, bounds),
        this.currentLayouts()
      )
      if (generation !== this.generation) {
        await bridge.stop()
        return
      }
      this.cursorBridge = bridge
    } catch (error) {
      console.warn('KWin cursor bridge unavailable; transparent areas will remain interactive:', error)
    } finally {
      this.kwinStarting = false
    }
  }

  private onKwinCursor(point: Point): void {
    this.lastCursor = point
    for (const overlay of this.overlayWindows()) updateInteractionCursor(overlay, point)
    if (this.dragSession) this.publish(point, IPC.overlayDragMove, this.dragSession)
  }

  private onKwinConfigured(caption: string, bounds: Rectangle): void {
    if (caption === WIDGET_OVERLAY_TITLE) {
      const widget = this.window
      if (widget) updateInteractionWindowBounds(widget, bounds)
      return
    }
    const id = displayIdFromOverlayTitle(caption)
    if (id == null) return
    this.kwinBounds.set(id, bounds)
    const overlay = this.guides.get(id)
    if (overlay && !overlay.isDestroyed()) updateInteractionWindowBounds(overlay, bounds)
  }

  private startCursorTimer(): void {
    if (this.cursorTimer) return
    const track = (): void => {
      const dragging = this.dragSession != null
      if (isNativeWayland()) {
        if (!dragging) return
        const point = this.readCursor()
        if (point && this.dragSession) this.publish(point, IPC.overlayDragMove, this.dragSession)
        return
      }

      const point = screen.getCursorScreenPoint()
      const moved = !this.lastCursor || point.x !== this.lastCursor.x || point.y !== this.lastCursor.y
      if (!moved && !dragging) return
      this.lastCursor = point
      if (process.platform === 'win32' && moved) {
        for (const overlay of this.overlayWindows()) updateInteractionCursor(overlay, point)
      }
      if (dragging && this.dragSession) this.publish(point, IPC.overlayDragMove, this.dragSession)
    }
    track()
    this.cursorTimer = setInterval(track, CURSOR_INTERVAL_MS)
  }

  private stopCursorTimer(): void {
    if (!this.cursorTimer) return
    clearInterval(this.cursorTimer)
    this.cursorTimer = undefined
  }

  private readCursor(): Point | undefined {
    if (isNativeWayland() && this.lastCursor) return this.lastCursor
    try {
      return screen.getCursorScreenPoint()
    } catch {
      return this.lastCursor
    }
  }

  private displayRects(): DisplayRect[] {
    return screen.getAllDisplays().map((display) => {
      const configured = isNativeWayland() ? this.kwinBounds.get(display.id) : undefined
      const bounds = configured ?? display.bounds
      return { id: display.id, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    })
  }

  private publish(point: Point, channel: string, session: DragSession): void {
    const displays = this.displayRects()
    const hit = displayForPoint(displays, point.x, point.y)
    const hostId = hit?.id ?? session.hostId
    if (channel === IPC.overlayDragMove && hostId != null && hostId !== session.hostId) {
      session.hostId = hostId
      if (!spansDesktop()) this.moveWidgetWindow(hostId)
    } else if (hostId != null) {
      session.hostId = hostId
    }
    if (channel === IPC.overlayDragMove) {
      const key = `${session.hostId}:${point.x}:${point.y}`
      if (key === this.lastDragMoveKey) return
      this.lastDragMoveKey = key
    }

    const widget = this.window
    const origin = displays.find((display) => display.id === session.hostId)
    if (widget && !widget.isDestroyed() && origin) {
      const windowBounds = widget.getBounds()
      const span = spansDesktop()
      const stage = span
        ? {
            id: origin.id,
            x: origin.x - windowBounds.x,
            y: origin.y - windowBounds.y,
            width: origin.width,
            height: origin.height
          }
        : undefined
      const relay: OverlayDragRelay = {
        hosting: true,
        x: Math.round(point.x - (span ? windowBounds.x : origin.x)),
        y: Math.round(point.y - (span ? windowBounds.y : origin.y)),
        offsetX: session.offsetX,
        offsetY: session.offsetY,
        displayId: session.hostId,
        showGrid: true,
        stage
      }
      widget.webContents.send(channel, relay)
    }
    for (const [id, guide] of this.guides) {
      if (guide.isDestroyed()) continue
      const relay: OverlayDragRelay = {
        hosting: false,
        x: 0,
        y: 0,
        offsetX: session.offsetX,
        offsetY: session.offsetY,
        displayId: id,
        showGrid: id !== session.hostId
      }
      guide.webContents.send(channel, relay)
    }
  }
}
