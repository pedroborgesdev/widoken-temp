import { BrowserWindow, type Display } from 'electron'
import { join } from 'node:path'
import { appIconPath } from './appIcon'

const DASHBOARD_WINDOW_WIDTH = 880
const DASHBOARD_WINDOW_HEIGHT = 590
const DASHBOARD_WINDOW_MARGIN = 16

export function createDashboardWindow(display: Display): BrowserWindow {
  const width = Math.min(DASHBOARD_WINDOW_WIDTH, display.workArea.width - DASHBOARD_WINDOW_MARGIN * 2)
  const height = Math.min(DASHBOARD_WINDOW_HEIGHT, display.workArea.height - DASHBOARD_WINDOW_MARGIN * 2)
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
    title: 'widoken dashboard',
    icon: appIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/dashboard.cjs'),
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
    url.pathname = '/dashboard.html'
    url.search = ''
    void window.loadURL(url.toString())
  } else {
    void window.loadFile(join(__dirname, '../renderer/dashboard.html'))
  }

  return window
}
