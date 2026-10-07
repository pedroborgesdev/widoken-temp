import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type { AnalyticsService } from '../analytics/AnalyticsService'

export function registerAnalyticsIpc(analytics: AnalyticsService): void {
  ipcMain.handle(IPC.analyticsHistory, () => analytics.usageHistory())
}
