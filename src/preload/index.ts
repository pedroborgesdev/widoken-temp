import { contextBridge, ipcRenderer, type Rectangle } from 'electron'
import { IPC, type DesktopApi } from '@shared/ipc'
import type { ProviderView } from '@shared/provider'
import type { AppSettings, SettingsPatch } from '@shared/settings'

const desktopApi: DesktopApi = {
  overlay: {
    startDragging: () => ipcRenderer.invoke(IPC.overlayStartDragging),
    endDragging: (regions: Rectangle[]) => ipcRenderer.invoke(IPC.overlayEndDragging, regions),
    setInteractionRegions: (regions: Rectangle[]) => ipcRenderer.invoke(IPC.overlaySetRegions, regions)
  },
  providers: {
    list: () => ipcRenderer.invoke(IPC.providersList),
    refresh: (id?: string) => ipcRenderer.invoke(IPC.providersRefresh, id),
    onUpdated: (callback: (providers: ProviderView[]) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, providers: ProviderView[]): void => callback(providers)
      ipcRenderer.on(IPC.providersUpdated, listener)
      return () => ipcRenderer.removeListener(IPC.providersUpdated, listener)
    }
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    update: (patch: SettingsPatch) => ipcRenderer.invoke(IPC.settingsUpdate, patch),
    onUpdated: (callback: (settings: AppSettings) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, settings: AppSettings): void => callback(settings)
      ipcRenderer.on(IPC.settingsUpdated, listener)
      return () => ipcRenderer.removeListener(IPC.settingsUpdated, listener)
    },
    onWindowState: (callback: (open: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, open: boolean): void => callback(open)
      ipcRenderer.on(IPC.settingsWindowState, listener)
      return () => ipcRenderer.removeListener(IPC.settingsWindowState, listener)
    },
    openWindow: () => ipcRenderer.invoke(IPC.settingsWindowOpen),
    closeWindow: () => ipcRenderer.invoke(IPC.settingsWindowClose),
    minimizeWindow: () => ipcRenderer.invoke(IPC.settingsWindowMinimize),
    resizeWindowToContent: (height) => ipcRenderer.invoke(IPC.settingsWindowResizeToContent, height)
  },
  app: {
    quit: () => ipcRenderer.invoke(IPC.appQuit)
  }
}

contextBridge.exposeInMainWorld('desktop', desktopApi)
