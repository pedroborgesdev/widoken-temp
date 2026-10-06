import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type { ProviderManager } from '../providers/ProviderManager'

export function registerProvidersIpc(manager: ProviderManager): void {
  ipcMain.handle(IPC.providersList, () => manager.list())
  ipcMain.handle(IPC.providersRefresh, (_event, id?: unknown) =>
    manager.refresh(typeof id === 'string' ? id : undefined)
  )
}
