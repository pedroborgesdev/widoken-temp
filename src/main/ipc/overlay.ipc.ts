import { ipcMain, screen, type BrowserWindow, type Rectangle, type WebContents } from 'electron'
import { IPC } from '@shared/ipc'
import { sanitizePaintOutset } from '../window/interactionRegionAdapters'
import {
  applyInteractionRegions,
  endFullInteraction,
  sanitizeRegions,
  updateInteractionCursor
} from '../window/interactionRegions'

export interface OverlayWindowController {
  overlayWindows(): BrowserWindow[]
  windowForContents(contents: WebContents): BrowserWindow | undefined
  beginDrag(offsetX: number, offsetY: number): void
  completeDrag(): void
}

function refreshWindowsCursor(window: BrowserWindow): void {
  if (process.platform !== 'win32' || window.isDestroyed()) return
  updateInteractionCursor(window, screen.getCursorScreenPoint())
}

export function registerOverlayIpc(controller: OverlayWindowController): void {
  ipcMain.on(IPC.overlayStartDragging, (event, payload?: { offsetX?: unknown; offsetY?: unknown }) => {
    const window = controller.windowForContents(event.sender)
    const offsetX = Number(payload?.offsetX)
    const offsetY = Number(payload?.offsetY)
    if (!window || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
      event.returnValue = undefined
      return
    }
    for (const overlay of controller.overlayWindows()) refreshWindowsCursor(overlay)
    controller.beginDrag(offsetX, offsetY)
    event.returnValue = undefined
  })

  ipcMain.on(IPC.overlayDragPointerUp, (event) => {
    if (!controller.windowForContents(event.sender)) {
      event.returnValue = undefined
      return
    }
    controller.completeDrag()
    event.returnValue = undefined
  })

  ipcMain.handle(IPC.overlayEndDragging, (event, regions: Rectangle[], paintOutset?: number) => {
    const sender = controller.windowForContents(event.sender)
    if (!sender) return
    const outset = sanitizePaintOutset(Number(paintOutset))
    for (const overlay of controller.overlayWindows()) {
      if (overlay === sender) continue
      endFullInteraction(overlay)
      applyInteractionRegions(overlay, [])
    }
    refreshWindowsCursor(sender)
    endFullInteraction(sender)
    applyInteractionRegions(sender, sanitizeRegions(regions, sender.getContentBounds()), outset)
  })

  ipcMain.handle(IPC.overlaySetRegions, (event, regions: Rectangle[], paintOutset?: number) => {
    const window = controller.windowForContents(event.sender)
    if (!window) return
    refreshWindowsCursor(window)
    applyInteractionRegions(
      window,
      sanitizeRegions(regions, window.getContentBounds()),
      sanitizePaintOutset(Number(paintOutset))
    )
  })
}
