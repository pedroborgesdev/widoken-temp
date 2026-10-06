import { BrowserWindow, screen, type Display } from 'electron'
import { join } from 'node:path'
import type { AppSettings } from '@shared/settings'
import { applyInteractionRegions, registerInteractionDisplay } from './interactionRegions'
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

export function createOverlayWindow(settings: AppSettings, configuredDisplay?: Display): BrowserWindow {
  const wayland = isNativeWayland()
  const display = configuredDisplay ?? resolveTargetDisplay(settings)
  const { x, y, width, height } = display.bounds
  const enabledProviders = settings.providers.filter((provider) => provider.enabled).length
  const scale = settings.widget.scale / 100
  const providerSpan = enabledProviders * 42 + Math.max(0, enabledProviders - 1) * settings.widget.itemGap
  const longAxis = 42 + providerSpan + (enabledProviders > 0 ? 6 : 0)
  const baseWidgetWidth = settings.widget.orientation === 'horizontal' ? longAxis : 54
  const baseWidgetHeight = settings.widget.orientation === 'horizontal' ? 54 : longAxis
  const widgetWidth = baseWidgetWidth * scale
  const widgetHeight = baseWidgetHeight * scale
  const margin = 8
  const widgetY = settings.widget.docked && (settings.widget.side === 'top' || settings.widget.side === 'bottom')
    ? settings.widget.side === 'top' ? margin : height - widgetHeight - margin
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
    resizable: wayland,
    maximizable: wayland,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    icon: appIconPath(),
    title: 'widoken overlay',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  registerInteractionDisplay(window, display.bounds)
  window.on('page-title-updated', (event) => event.preventDefault())
  window.setMenuBarVisibility(false)
  window.setAlwaysOnTop(true, 'floating')
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
    applyInteractionRegions(window, initialRegions)
  }

  window.once('ready-to-show', showOverlay)
  window.webContents.once('did-finish-load', showOverlay)

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}
