import { contextBridge, ipcRenderer } from 'electron'
import type { DashboardRoute } from '@shared/dashboard'
import type { DashboardDesktopApi } from '@shared/ipc'
import type { UsageHistory } from '@shared/usageHistory'
import type { ProviderView } from '@shared/provider'
import type { AppSettings, SettingsPatch } from '@shared/settings'

// Keep sandboxed preload bundles self-contained. Electron's sandboxed preload
// cannot require Rollup's generated local shared chunks.
const IPC = {
  providersList: 'providers:list',
  providersRefresh: 'providers:refresh',
  providersUpdated: 'providers:updated',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  settingsUpdated: 'settings:updated',
  dashboardWindowClose: 'dashboard-window:close',
  dashboardWindowMinimize: 'dashboard-window:minimize',
  dashboardWindowResizeToContent: 'dashboard-window:resize-to-content',
  dashboardNavigate: 'dashboard:navigate',
  analyticsHistory: 'analytics:history',
  themeSyncVsCode: 'theme:sync-vscode',
  appQuit: 'app:quit'
} as const

const dashboardDesktopApi: DashboardDesktopApi = {
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
    close: () => ipcRenderer.invoke(IPC.dashboardWindowClose),
    minimize: () => ipcRenderer.invoke(IPC.dashboardWindowMinimize),
    resizeToContent: (height: number) => ipcRenderer.invoke(IPC.dashboardWindowResizeToContent, height),
    onNavigate: (callback: (route: DashboardRoute) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, route: DashboardRoute): void => callback(route)
      ipcRenderer.on(IPC.dashboardNavigate, listener)
      return () => ipcRenderer.removeListener(IPC.dashboardNavigate, listener)
    }
  },
  themes: {
    syncVsCode: () => ipcRenderer.invoke(IPC.themeSyncVsCode)
  },
  analytics: {
    history: (): Promise<UsageHistory> => ipcRenderer.invoke(IPC.analyticsHistory)
  },
  app: {
    quit: () => ipcRenderer.invoke(IPC.appQuit)
  }
}

contextBridge.exposeInMainWorld('dashboardDesktop', dashboardDesktopApi)
