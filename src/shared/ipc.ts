import type { Rectangle } from 'electron'
import type { ProviderView } from './provider'
import type { AppSettings, SettingsPatch } from './settings'
import type { SyncedVsCodeTheme } from './settings'

export const IPC = {
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
  dashboardWindowClose: 'dashboard-window:close',
  dashboardWindowMinimize: 'dashboard-window:minimize',
  dashboardWindowResizeToContent: 'dashboard-window:resize-to-content',
  dashboardWindowState: 'dashboard-window:state',
  themeSyncVsCode: 'theme:sync-vscode',
  appQuit: 'app:quit'
} as const

interface ProvidersApi {
  list(): Promise<ProviderView[]>
  refresh(id?: string): Promise<ProviderView[]>
  onUpdated(callback: (providers: ProviderView[]) => void): () => void
}

interface SettingsApi {
  get(): Promise<AppSettings>
  update(patch: SettingsPatch): Promise<AppSettings>
  onUpdated(callback: (settings: AppSettings) => void): () => void
}

export interface WidgetDesktopApi {
  overlay: {
    startDragging(): Promise<void>
    endDragging(regions: Rectangle[], paintOutset?: number): Promise<void>
    setInteractionRegions(regions: Rectangle[], paintOutset?: number): Promise<void>
  }
  providers: ProvidersApi
  settings: SettingsApi
  dashboard: {
    onWindowState(callback: (open: boolean) => void): () => void
    open(): Promise<void>
  }
}

export interface DashboardDesktopApi {
  providers: ProvidersApi
  settings: SettingsApi
  dashboard: {
    close(): Promise<void>
    minimize(): Promise<void>
    resizeToContent(height: number): Promise<void>
  }
  themes: {
    syncVsCode(): Promise<SyncedVsCodeTheme>
  }
  app: {
    quit(): Promise<void>
  }
}

/** Full API used only by the browser preview adapter. Electron exposes a role-specific subset. */
export type DesktopApi = WidgetDesktopApi & DashboardDesktopApi
