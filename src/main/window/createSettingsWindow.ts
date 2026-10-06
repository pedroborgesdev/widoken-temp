import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { appIconPath } from './appIcon'

const SETTINGS_WINDOW_WIDTH = 880
const SETTINGS_WINDOW_HEIGHT = 590
const SETTINGS_WINDOW_MARGIN = 16

export function createSettingsWindow(overlayWindow: BrowserWindow): BrowserWindow {
  const display = screen.getDisplayMatching(overlayWindow.getBounds())
  const width = Math.min(SETTINGS_WINDOW_WIDTH, display.workArea.width - SETTINGS_WINDOW_MARGIN * 2)
  const height = Math.min(SETTINGS_WINDOW_HEIGHT, display.workArea.height - SETTINGS_WINDOW_MARGIN * 2)
  const x = Math.round(display.workArea.x + (display.workArea.width - width) / 2)
  const y = Math.round(display.workArea.y + (display.workArea.height - height) / 2)

  const window = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 340,
    minHeight: 360,
    frame: false,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    fullscreenable: false,
    hasShadow: false,
    backgroundColor: '#000000',
    show: false,
    title: 'widoken settings',
    icon: appIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  window.on('page-title-updated', (event) => event.preventDefault())
  window.setMenuBarVisibility(false)
  window.once('ready-to-show', () => {
    if (window.isMaximized()) window.unmaximize()
    window.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL)
    url.searchParams.set('window', 'settings')
    void window.loadURL(url.toString())
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), { query: { window: 'settings' } })
  }

  return window
}
