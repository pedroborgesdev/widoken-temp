import type { DashboardDesktopApi, WidgetDesktopApi } from '@shared/ipc'

declare global {
  interface Window {
    widgetDesktop?: WidgetDesktopApi
    dashboardDesktop?: DashboardDesktopApi
  }
}

export {}
