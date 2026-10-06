import { ipcMain, type BrowserWindow, type Rectangle } from 'electron'
import { IPC } from '@shared/ipc'
import { applyInteractionRegions, makeWindowFullyInteractive, sanitizeRegions } from '../window/interactionRegions'

export function registerOverlayIpc(window: BrowserWindow): void {
  ipcMain.handle(IPC.overlayStartDragging, () => {
    makeWindowFullyInteractive(window)
  })

  ipcMain.handle(IPC.overlayEndDragging, (_event, regions: Rectangle[]) => {
    applyInteractionRegions(window, sanitizeRegions(regions, window.getContentBounds()))
  })

  ipcMain.handle(IPC.overlaySetRegions, (_event, regions: Rectangle[]) => {
    applyInteractionRegions(window, sanitizeRegions(regions, window.getContentBounds()))
  })
}
