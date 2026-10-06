import { ipcMain, screen, type BrowserWindow, type Rectangle } from 'electron'
import { IPC } from '@shared/ipc'
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

export function registerOverlayIpc(window: BrowserWindow): void {
  ipcMain.on(IPC.overlayStartDragging, (event) => {
    refreshWindowsCursor(window)
    makeWindowFullyInteractive(window)
    event.returnValue = undefined
  })

  ipcMain.handle(IPC.overlayEndDragging, (_event, regions: Rectangle[]) => {
    refreshWindowsCursor(window)
    endFullInteraction(window)
    applyInteractionRegions(window, sanitizeRegions(regions, window.getContentBounds()))
  })

  ipcMain.handle(IPC.overlaySetRegions, (_event, regions: Rectangle[]) => {
    refreshWindowsCursor(window)
    applyInteractionRegions(window, sanitizeRegions(regions, window.getContentBounds()))
  })
}
