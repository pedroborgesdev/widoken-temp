import { describe, expect, it } from 'vitest'
import {
  buildUsageHistory,
  usageHistoryAxis,
  usageHistoryDay,
  usageHistoryDays,
  type UsageHistorySample
} from '../../src/shared/usageHistory'

function at(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour).getTime()
}

function sample(overrides: Partial<UsageHistorySample> & Pick<UsageHistorySample, 'capturedAt'>): UsageHistorySample {
  return {
    providerId: 'claude',
    limitId: 'session',
    percent: 0,
    resetAt: at(2026, 10, 20),
    used: null,
    limitValue: null,
    ...overrides
  }
}

describe('usage history days', () => {
  it('keeps a continuous calendar across a month boundary', () => {
    const days = usageHistoryDays(at(2026, 10, 7, 18))
    expect(days).toHaveLength(31)
    expect(days[0]).toBe('2026-09-07')
    expect(days).toContain('2026-09-30')
    expect(days).toContain('2026-10-01')
    expect(days.at(-1)).toBe('2026-10-07')
    expect(usageHistoryDay(at(2026, 10, 1, 0))).toBe('2026-10-01')
  })
})

describe('buildUsageHistory', () => {
  const now = at(2026, 10, 7, 18)

  it('prefers the provider amount over the inferred percentage', () => {
    const history = buildUsageHistory([
      sample({ providerId: 'cursor', limitId: 'included', capturedAt: at(2026, 10, 5), percent: 10, used: 10, limitValue: 100 }),
      sample({ providerId: 'cursor', limitId: 'included', capturedAt: at(2026, 10, 6), percent: 80, used: 16, limitValue: 100 })
    ], now)

    expect(history.series).toEqual([expect.objectContaining({
      providerId: 'cursor',
      limitId: 'included',
      unit: 'count',
      total: 6,
      totalQuota: 6,
      points: [expect.objectContaining({ day: '2026-10-06', amount: 6, quota: 6 })]
    })])
  })

  it('falls back to quota percent when the provider reports no amount', () => {
    const history = buildUsageHistory([
      sample({ capturedAt: at(2026, 9, 30), percent: 10 }),
      sample({ capturedAt: at(2026, 10, 1), percent: 25 }),
      sample({ capturedAt: at(2026, 10, 7), percent: 40 })
    ], now)

    expect(history.series[0]).toMatchObject({
      unit: 'percent',
      total: 30,
      points: [
        { day: '2026-10-01', amount: 15, quota: 15 },
        { day: '2026-10-07', amount: 15, quota: 15 }
      ]
    })
  })

  it('does not count usage across a quota reset', () => {
    const history = buildUsageHistory([
      sample({ providerId: 'copilot', limitId: 'chat', capturedAt: at(2026, 10, 2), percent: 40, used: 40, limitValue: 100, resetAt: at(2026, 10, 3) }),
      sample({ providerId: 'copilot', limitId: 'chat', capturedAt: at(2026, 10, 4), percent: 5, used: 5, limitValue: 100, resetAt: at(2026, 11, 3) }),
      sample({ providerId: 'copilot', limitId: 'chat', capturedAt: at(2026, 10, 6), percent: 12, used: 12, limitValue: 100, resetAt: at(2026, 11, 3) })
    ], now)

    expect(history.series[0]?.points).toEqual([
      expect.objectContaining({ day: '2026-10-06', amount: 7, quota: 7 })
    ])
  })

  it('uses the sample before the window as a baseline', () => {
    const history = buildUsageHistory([
      sample({ capturedAt: at(2026, 9, 6), percent: 10 }),
      sample({ capturedAt: at(2026, 9, 7), percent: 18 })
    ], now)

    expect(history.series[0]?.points).toEqual([
      expect.objectContaining({ day: '2026-09-07', amount: 8 })
    ])
  })
})

describe('usage history axis', () => {
  it('keeps a 0 to 100 scale when nothing was consumed', () => {
    expect(usageHistoryAxis(0)).toEqual({ max: 100, ticks: [0, 25, 50, 75, 100] })
  })

  it('rounds the top tick above the tallest day', () => {
    const axis = usageHistoryAxis(42)
    expect(axis.max).toBeGreaterThanOrEqual(42)
    expect(axis.ticks[0]).toBe(0)
    expect(axis.ticks.at(-1)).toBe(axis.max)
  })
})
