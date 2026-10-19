import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type { ProviderBrowserSessionManager } from '../browserSessions/ProviderBrowserSessionManager'
import type { ProviderManager } from '../providers/ProviderManager'

function providerId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error('A browser-session provider id is required.')
  return value
}

export function registerBrowserSessionsIpc(
  browserSessions: ProviderBrowserSessionManager,
  providers: ProviderManager
): void {
  ipcMain.handle(IPC.browserSessionsList, () => browserSessions.list())
  ipcMain.handle(IPC.browserSessionLogin, async (_event, value: unknown) => {
    const id = providerId(value)
    const status = await browserSessions.login(id)
    await providers.refresh(id)
    return status
  })
  ipcMain.handle(IPC.browserSessionLogout, async (_event, value: unknown) => {
    const id = providerId(value)
    const status = await browserSessions.logout(id)
    await providers.refresh(id)
    return status
  })
  ipcMain.handle(IPC.browserSessionWindowClose, (event) => {
    browserSessions.closeLoginWindow(event.sender.id)
  })
  ipcMain.handle(IPC.browserSessionWindowMinimize, (event) => {
    browserSessions.minimizeLoginWindow(event.sender.id)
  })
}
