import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { IPC } from '@shared/ipc'
import type { AppSettings, SettingsPatch } from '@shared/settings'
import type { ProviderManager } from '../providers/ProviderManager'
import type { SettingsRepository } from '../settings/SettingsRepository'
import { syncVsCodeTheme } from '../themes/VsCodeThemeService'

interface DashboardWindowActions {
  close: () => void
  minimize: () => void
  open: () => void
  resizeToContent: (height: number) => void
}

export function registerSettingsIpc(
  repository: SettingsRepository,
  providers: ProviderManager,
  dashboardWindow: DashboardWindowActions,
  onSettingsUpdated: (settings: AppSettings) => void | Promise<void>
): void {
  ipcMain.handle(IPC.settingsGet, () => repository.get())
  ipcMain.handle(IPC.settingsUpdate, async (_event, patch: SettingsPatch) => {
    const settings = await repository.update(patch && typeof patch === 'object' ? patch : {})
    providers.configure(settings.providers, settings.refreshIntervalSeconds, settings.analytics.localInsights)
    app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
    await onSettingsUpdated(settings)
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send(IPC.settingsUpdated, settings)
    }
    void providers.refresh()
    return settings
  })
  ipcMain.handle(IPC.dashboardWindowOpen, () => dashboardWindow.open())
  ipcMain.handle(IPC.dashboardWindowClose, () => dashboardWindow.close())
  ipcMain.handle(IPC.dashboardWindowMinimize, () => dashboardWindow.minimize())
  ipcMain.handle(IPC.dashboardWindowResizeToContent, (_event, height: number) => dashboardWindow.resizeToContent(height))
  ipcMain.handle(IPC.themeSyncVsCode, () => syncVsCodeTheme({
    preferredColorScheme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }))
  ipcMain.handle(IPC.appQuit, () => app.quit())
}
