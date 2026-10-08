import { BrowserWindow, screen, type Display, type Rectangle } from 'electron'
import { join } from 'node:path'
import { shadowPaintOutset } from '@shared/overlay'
import type { AppSettings } from '@shared/settings'
import { applyInteractionRegions, registerInteractionDisplay, updateInteractionCursor, updateInteractionWindowBounds } from './interactionRegions'
import { isNativeWayland } from './platform'
import { appIconPath } from './appIcon'

export function resolveTargetDisplay(settings: AppSettings): Display {
  const displays = screen.getAllDisplays()
  const configuredDisplay = displays.find((display) => display.id === settings.display?.id)
  if (configuredDisplay) return configuredDisplay

  if (isNativeWayland()) {
    return displays.reduce((largest, display) =>
      display.bounds.width * display.bounds.height > largest.bounds.width * largest.bounds.height
        ? display
        : largest
    )
  }

  return screen.getPrimaryDisplay()
}

export function applyOverlayDisplayBounds(window: BrowserWindow, bounds: Rectangle): void {
  if (window.isDestroyed()) return
  // Windows keeps a normal topmost window inside the work area, above the taskbar.
  // The screen-saver band is the one allowed to cover that bar; the bounds have to
  // be applied again after the window is shown or the shell shrinks it back.
  if (process.platform === 'win32') window.setAlwaysOnTop(true, 'screen-saver')
  window.setBounds(bounds, false)
}

export function createOverlayWindow(settings: AppSettings, configuredDisplay?: Display): BrowserWindow {
  const wayland = isNativeWayland()
  const display = configuredDisplay ?? resolveTargetDisplay(settings)
  const { x, y, width, height } = display.bounds
  const enabledProviders = settings.providers.filter((provider) => provider.enabled).length
  const scale = settings.widget.scale / 100
  const boardItems = enabledProviders + 1
  const providerSpan = boardItems * 42 + Math.max(0, boardItems - 1) * settings.widget.itemGap
  const longAxis = 42 + providerSpan + 6
  const baseWidgetWidth = settings.widget.orientation === 'horizontal' ? longAxis : 54
  const baseWidgetHeight = settings.widget.orientation === 'horizontal' ? 54 : longAxis
  const widgetWidth = baseWidgetWidth * scale
  const widgetHeight = baseWidgetHeight * scale
  const margin = 8
  const widgetY = settings.widget.docked && (settings.widget.side === 'top' || settings.widget.side === 'bottom')
    ? settings.widget.side === 'top' ? margin : Math.max(margin, height - widgetHeight - margin)
    : Math.min(
        Math.max(margin, height - widgetHeight - margin),
        Math.round(margin + settings.widget.verticalPosition * Math.max(0, height - baseWidgetHeight - margin * 2))
      )
  const widgetX = settings.widget.docked && (settings.widget.side === 'left' || settings.widget.side === 'right')
    ? settings.widget.side === 'left' ? margin : width - widgetWidth - margin
    : Math.min(
        Math.max(margin, width - widgetWidth - margin),
        Math.round(margin + settings.widget.horizontalPosition * Math.max(0, width - baseWidgetWidth - margin * 2))
      )

  const window = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    // The overlay fills the display. If it remains resizable on Wayland, the
    // compositor treats a tucked widget at the screen edge as a native resize
    // handle before the renderer can receive the pointer event.
    resizable: false,
    maximizable: false,
    movable: false,
    alwaysOnTop: true,
    ...(process.platform === 'win32' ? { thickFrame: false } : {}),
    // Electron removed skipTaskbar support on Linux. A toolbar window carries
    // the corresponding non-normal window-manager hint on X11; KDE/Wayland is
    // reinforced by the KWin bridge after the surface is created.
    ...(process.platform === 'linux' ? { type: 'toolbar' } : {}),
    skipTaskbar: true,
    fullscreenable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    icon: appIconPath(),
    title: 'widoken overlay',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/widget.cjs'),
      // The overlay is intentionally shown without taking focus. Keep its
      // activity indicator smooth even while Chromium considers it inactive.
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  registerInteractionDisplay(window, display.bounds)
  window.on('page-title-updated', (event) => event.preventDefault())
  window.setMenuBarVisibility(false)
  window.setAlwaysOnTop(true, process.platform === 'win32' ? 'screen-saver' : 'floating')
  const initialRegions = [{ x: widgetX, y: widgetY, width: widgetWidth, height: widgetHeight }]
  let hasShown = false

  const showOverlay = (): void => {
    if (hasShown || window.isDestroyed()) return
    hasShown = true
    if (wayland) {
      window.show()
    } else {
      window.showInactive()
    }
    if (process.platform === 'win32') {
      applyOverlayDisplayBounds(window, display.bounds)
      updateInteractionWindowBounds(window, display.bounds)
      updateInteractionCursor(window, screen.getCursorScreenPoint())
      setTimeout(() => {
        if (window.isDestroyed()) return
        applyOverlayDisplayBounds(window, display.bounds)
        updateInteractionWindowBounds(window, display.bounds)
      }, 0)
    }
    applyInteractionRegions(window, initialRegions, shadowPaintOutset(settings.widget.shadows, scale))
  }

  window.once('ready-to-show', showOverlay)
  window.webContents.once('did-finish-load', showOverlay)

  if (process.env.ELECTRON_RENDERER_URL) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL)
    url.pathname = '/widget.html'
    url.search = ''
    void window.loadURL(url.toString())
  } else {
    void window.loadFile(join(__dirname, '../renderer/widget.html'))
  }

  return window
}
