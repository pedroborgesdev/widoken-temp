import Database from 'better-sqlite3'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AnalyticsService } from '../../src/main/analytics/AnalyticsService'
import type { ProviderSnapshot } from '../../src/shared/provider'
import { usageHistoryDay } from '../../src/shared/usageHistory'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

function cursorSnapshot(percent: number, resetAt: number): ProviderSnapshot {
  return {
    providerId: 'cursor',
    status: 'connected',
    plan: 'pro',
    limits: [{ id: 'included', label: 'Included usage', percent, resetsAt: new Date(resetAt).toISOString() }],
    lastUpdatedAt: new Date().toISOString()
  }
}

describe('AnalyticsService', () => {
  it('stores snapshots and calculates burn rate, daily consumption, forecast, and list price', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-analytics-'))
    temporaryDirectories.push(directory)
    const databasePath = join(directory, 'analytics.sqlite')
    const service = new AnalyticsService(databasePath, directory)
    const start = Date.UTC(2026, 9, 1)
    const resetAt = start + 48 * 60 * 60 * 1000

    await service.enhance(cursorSnapshot(20, resetAt), start)
    await service.enhance(cursorSnapshot(30, resetAt), start + 12 * 60 * 60 * 1000)
    const enriched = await service.enhance(cursorSnapshot(50, resetAt), start + 24 * 60 * 60 * 1000)

    expect(enriched.analytics?.listPrice).toMatchObject({ amount: 20, currency: 'USD', interval: 'month' })
    expect(enriched.analytics?.trends[0]).toMatchObject({
      consumedLast24Hours: 30,
      averageDailyConsumption: 30,
      burnRatePerHour: 1.25,
      projectedPercentAtReset: 80
    })
    expect(enriched.analytics?.trends[0].estimatedExhaustionAt).toBe(new Date(start + 64 * 60 * 60 * 1000).toISOString())
    service.close()
  })

  it('reads a daily history that prefers the stored provider amount', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-analytics-history-'))
    temporaryDirectories.push(directory)
    const service = new AnalyticsService(join(directory, 'analytics.sqlite'), directory)
    const first = Date.UTC(2026, 9, 5, 15)
    const second = Date.UTC(2026, 9, 6, 15)
    const resetAt = Date.UTC(2026, 9, 20)

    await service.enhance({
      providerId: 'cursor',
      status: 'connected',
      limits: [{ id: 'included', label: 'Included usage', percent: 10, used: 10, limit: 100, resetsAt: new Date(resetAt).toISOString() }],
      lastUpdatedAt: new Date(first).toISOString()
    }, first)
    await service.enhance({
      providerId: 'cursor',
      status: 'connected',
      limits: [{ id: 'included', label: 'Included usage', percent: 90, used: 18, limit: 100, resetsAt: new Date(resetAt).toISOString() }],
      lastUpdatedAt: new Date(second).toISOString()
    }, second)

    const now = Date.UTC(2026, 9, 7, 18)
    const history = service.usageHistory(now)
    expect(history.days).toHaveLength(31)
    expect(history.since).toBe(new Date(first).toISOString())
    expect(history.days.at(-1)).toBe(usageHistoryDay(now))
    expect(history.series).toEqual([expect.objectContaining({
      providerId: 'cursor',
      limitId: 'included',
      unit: 'count',
      total: 8,
      points: [expect.objectContaining({ day: usageHistoryDay(second), amount: 8 })]
    })])
    service.close()
  })

  it('keeps provider refreshes working while another connection locks the analytics database', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-analytics-lock-'))
    temporaryDirectories.push(directory)
    const databasePath = join(directory, 'analytics.sqlite')
    const service = new AnalyticsService(databasePath, directory)
    const lock = new Database(databasePath)
    lock.pragma('busy_timeout = 50')
    lock.exec('BEGIN EXCLUSIVE')

    const snapshot = cursorSnapshot(25, Date.now() + 24 * 60 * 60 * 1000)
    await expect(service.enhance(snapshot)).resolves.toMatchObject({ providerId: 'cursor', status: 'connected' })

    lock.exec('ROLLBACK')
    lock.close()
    service.close()
  })
})
