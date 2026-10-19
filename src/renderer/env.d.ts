import type { BrowserSessionDesktopApi, DashboardDesktopApi, WidgetDesktopApi } from '@shared/ipc'

declare global {
  interface Window {
    widgetDesktop?: WidgetDesktopApi
    dashboardDesktop?: DashboardDesktopApi
    browserSessionDesktop?: BrowserSessionDesktopApi
  }
}

export {}
