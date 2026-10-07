import { contextBridge, ipcRenderer, type Rectangle } from 'electron'
import type { DashboardRoute } from '@shared/dashboard'
import type { WidgetDesktopApi } from '@shared/ipc'
import type { ProviderView } from '@shared/provider'
import type { AppSettings, SettingsPatch } from '@shared/settings'

// Keep sandboxed preload bundles self-contained. Electron's sandboxed preload
// cannot require Rollup's generated local shared chunks.
const IPC = {
  overlayStartDragging: 'overlay:start-dragging',
  overlayEndDragging: 'overlay:end-dragging',
  overlaySetRegions: 'overlay:set-regions',
  providersList: 'providers:list',
  providersRefresh: 'providers:refresh',
  providersUpdated: 'providers:updated',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  settingsUpdated: 'settings:updated',
  dashboardWindowOpen: 'dashboard-window:open',
  dashboardWindowState: 'dashboard-window:state'
} as const

const widgetDesktopApi: WidgetDesktopApi = {
  overlay: {
    startDragging: () => {
      ipcRenderer.sendSync(IPC.overlayStartDragging)
      return Promise.resolve()
    },
    endDragging: (regions: Rectangle[], paintOutset?: number) =>
      ipcRenderer.invoke(IPC.overlayEndDragging, regions, paintOutset),
    setInteractionRegions: (regions: Rectangle[], paintOutset?: number) =>
      ipcRenderer.invoke(IPC.overlaySetRegions, regions, paintOutset)
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
    }
  },
  dashboard: {
    onWindowState: (callback: (open: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, open: boolean): void => callback(open)
      ipcRenderer.on(IPC.dashboardWindowState, listener)
      return () => ipcRenderer.removeListener(IPC.dashboardWindowState, listener)
    },
    open: (route?: DashboardRoute) => ipcRenderer.invoke(IPC.dashboardWindowOpen, route)
  }
}

contextBridge.exposeInMainWorld('widgetDesktop', widgetDesktopApi)
