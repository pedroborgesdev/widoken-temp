import type { Rectangle } from 'electron'
import type { DashboardRoute } from './dashboard'
import type { DisplayRect } from './overlayDisplay'
import type { ProviderView } from './provider'
import type { UsageHistory } from './usageHistory'
import type { AppSettings, SettingsPatch } from './settings'
import type { SyncedVsCodeTheme } from './settings'

export const IPC = {
  overlayStartDragging: 'overlay:start-dragging',
  overlayEndDragging: 'overlay:end-dragging',
  overlaySetRegions: 'overlay:set-regions',
  overlayDragPointerUp: 'overlay:drag-pointer-up',
  overlayDragMove: 'overlay:drag-move',
  overlayDragEnd: 'overlay:drag-end',
  overlayDisplays: 'overlay:displays',
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
  dashboardNavigate: 'dashboard:navigate',
  analyticsHistory: 'analytics:history',
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

export interface OverlayDragRelay {
  hosting: boolean
  x: number
  y: number
  offsetX: number
  offsetY: number
  displayId?: number
  showGrid?: boolean
  stage?: DisplayRect
}

export interface WidgetDesktopApi {
  overlay: {
    startDragging(offsetX: number, offsetY: number): Promise<void>
    endDragging(regions: Rectangle[], paintOutset?: number): Promise<void>
    setInteractionRegions(regions: Rectangle[], paintOutset?: number): Promise<void>
    dragPointerUp(): Promise<void>
    onDragMove(callback: (relay: OverlayDragRelay) => void): () => void
    onDragEnd(callback: (relay: OverlayDragRelay) => void): () => void
    onDisplays(callback: (displays: DisplayRect[]) => void): () => void
  }
  providers: ProvidersApi
  settings: SettingsApi
  dashboard: {
    onWindowState(callback: (open: boolean) => void): () => void
    open(route?: DashboardRoute): Promise<void>
  }
}

export interface DashboardDesktopApi {
  providers: ProvidersApi
  settings: SettingsApi
  dashboard: {
    close(): Promise<void>
    minimize(): Promise<void>
    resizeToContent(height: number): Promise<void>
    onNavigate(callback: (route: DashboardRoute) => void): () => void
  }
  themes: {
    syncVsCode(): Promise<SyncedVsCodeTheme>
  }
  analytics: {
    history(): Promise<UsageHistory>
  }
  app: {
    quit(): Promise<void>
  }
}

/** Full API used only by the browser preview adapter. Electron exposes a role-specific subset. */
export type DesktopApi = WidgetDesktopApi & DashboardDesktopApi
