import { contextBridge, ipcRenderer } from 'electron'
import type { BrowserSessionConnectedStatus, BrowserSessionDesktopApi } from '@shared/ipc'

// Keep sandboxed preload bundles self-contained. Electron's sandboxed preload
// cannot require Rollup's generated local shared chunks.
const IPC = {
  browserSessionWindowClose: 'browser-session-window:close',
  browserSessionWindowMinimize: 'browser-session-window:minimize',
  browserSessionWindowConnected: 'browser-session-window:connected'
} as const

const browserSessionDesktopApi: BrowserSessionDesktopApi = {
  window: {
    close: () => ipcRenderer.invoke(IPC.browserSessionWindowClose),
    minimize: () => ipcRenderer.invoke(IPC.browserSessionWindowMinimize),
    onConnected: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, status: BrowserSessionConnectedStatus): void => callback(status)
      ipcRenderer.on(IPC.browserSessionWindowConnected, listener)
      return () => ipcRenderer.removeListener(IPC.browserSessionWindowConnected, listener)
    }
  }
}

contextBridge.exposeInMainWorld('browserSessionDesktop', browserSessionDesktopApi)
