import { app, BrowserWindow, ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type { SettingsPatch } from '@shared/settings'
import type { ProviderManager } from '../providers/ProviderManager'
import type { SettingsRepository } from '../settings/SettingsRepository'

interface SettingsWindowActions {
  close: () => void
  minimize: () => void
  open: () => void
  resizeToContent: (height: number) => void
}

export function registerSettingsIpc(
  repository: SettingsRepository,
  providers: ProviderManager,
  settingsWindow: SettingsWindowActions
): void {
  ipcMain.handle(IPC.settingsGet, () => repository.get())
  ipcMain.handle(IPC.settingsUpdate, async (_event, patch: SettingsPatch) => {
    const settings = await repository.update(patch && typeof patch === 'object' ? patch : {})
    providers.configure(settings.providers, settings.refreshIntervalSeconds, settings.analytics.localInsights)
    app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send(IPC.settingsUpdated, settings)
    }
    void providers.refresh()
    return settings
  })
  ipcMain.handle(IPC.settingsWindowOpen, () => settingsWindow.open())
  ipcMain.handle(IPC.settingsWindowClose, () => settingsWindow.close())
  ipcMain.handle(IPC.settingsWindowMinimize, () => settingsWindow.minimize())
  ipcMain.handle(IPC.settingsWindowResizeToContent, (_event, height: number) => settingsWindow.resizeToContent(height))
  ipcMain.handle(IPC.appQuit, () => app.quit())
}
