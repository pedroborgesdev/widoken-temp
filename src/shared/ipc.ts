import type { Rectangle } from 'electron'
import type { ProviderView } from './provider'
import type { AppSettings, SettingsPatch } from './settings'

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
  settingsWindowOpen: 'settings-window:open',
  settingsWindowClose: 'settings-window:close',
  settingsWindowMinimize: 'settings-window:minimize',
  settingsWindowResizeToContent: 'settings-window:resize-to-content',
  settingsWindowState: 'settings-window:state',
  appQuit: 'app:quit'
} as const

export interface DesktopApi {
  overlay: {
    startDragging(): Promise<void>
    endDragging(regions: Rectangle[]): Promise<void>
    setInteractionRegions(regions: Rectangle[]): Promise<void>
  }
  providers: {
    list(): Promise<ProviderView[]>
    refresh(id?: string): Promise<ProviderView[]>
    onUpdated(callback: (providers: ProviderView[]) => void): () => void
  }
  settings: {
    get(): Promise<AppSettings>
    update(patch: SettingsPatch): Promise<AppSettings>
    onUpdated(callback: (settings: AppSettings) => void): () => void
    onWindowState(callback: (open: boolean) => void): () => void
    openWindow(): Promise<void>
    closeWindow(): Promise<void>
    minimizeWindow(): Promise<void>
    resizeWindowToContent(height: number): Promise<void>
  }
  app: {
    quit(): Promise<void>
  }
}
