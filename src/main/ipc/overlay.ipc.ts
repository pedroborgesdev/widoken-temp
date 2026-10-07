import { ipcMain, screen, type BrowserWindow, type Rectangle } from 'electron'
import { IPC } from '@shared/ipc'
import { sanitizePaintOutset } from '../window/interactionRegionAdapters'
import {
  applyInteractionRegions,
  endFullInteraction,
  makeWindowFullyInteractive,
  sanitizeRegions,
  updateInteractionCursor
} from '../window/interactionRegions'

function refreshWindowsCursor(window: BrowserWindow): void {
  if (process.platform !== 'win32' || window.isDestroyed()) return
  updateInteractionCursor(window, screen.getCursorScreenPoint())
}

export function registerOverlayIpc(getWindow: () => BrowserWindow | undefined): void {
  ipcMain.on(IPC.overlayStartDragging, (event) => {
    const window = getWindow()
    if (!window || event.sender !== window.webContents) {
      event.returnValue = undefined
      return
    }
    refreshWindowsCursor(window)
    makeWindowFullyInteractive(window)
    event.returnValue = undefined
  })

  ipcMain.handle(IPC.overlayEndDragging, (event, regions: Rectangle[], paintOutset?: number) => {
    const window = getWindow()
    if (!window || event.sender !== window.webContents) return
    refreshWindowsCursor(window)
    endFullInteraction(window)
    applyInteractionRegions(
      window,
      sanitizeRegions(regions, window.getContentBounds()),
      sanitizePaintOutset(Number(paintOutset))
    )
  })

  ipcMain.handle(IPC.overlaySetRegions, (event, regions: Rectangle[], paintOutset?: number) => {
    const window = getWindow()
    if (!window || event.sender !== window.webContents) return
    refreshWindowsCursor(window)
    applyInteractionRegions(
      window,
      sanitizeRegions(regions, window.getContentBounds()),
      sanitizePaintOutset(Number(paintOutset))
    )
  })
}
