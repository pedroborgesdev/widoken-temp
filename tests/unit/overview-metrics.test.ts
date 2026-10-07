import { describe, expect, it } from 'vitest'
import type { ProviderView } from '../../src/shared/provider'
import { DEFAULT_SETTINGS, type ProviderSetting } from '../../src/shared/settings'
import { usageHistoryDay, usageHistoryDays, type UsageHistory } from '../../src/shared/usageHistory'
import { overviewMetrics } from '../../src/renderer/dashboard/overviewMetrics'

const now = new Date(2026, 9, 7, 12).getTime()
const hour = 3_600_000

function view(id: string, snapshot: Partial<ProviderView['snapshot']>, activity?: ProviderView['activity']): ProviderView {
  return {
    id,
    name: id,
    activity,
    snapshot: { providerId: id, status: 'connected', limits: [], lastUpdatedAt: new Date(now).toISOString(), ...snapshot }
  }
}

describe('overview metrics', () => {
  it('summarizes providers, limits, history and prices', () => {
    const settings: ProviderSetting[] = DEFAULT_SETTINGS.providers.map((provider) => ({
      ...provider,
      enabled: provider.id !== 'copilot'
    }))
    const providers = [
      view('claude', {
        limits: [
          { id: 'five_hour', label: '5 hours', percent: 40, resetsAt: new Date(now + 2 * hour).toISOString() },
          { id: 'seven_day', label: '7 days', percent: 82, resetsAt: new Date(now + 48 * hour).toISOString() }
        ],
        analytics: { trends: [], listPrice: { amount: 20, currency: 'USD', interval: 'month', asOf: '2026-01-01' } }
      }, 'active'),
      view('openai', {
        limits: [{ id: 'primary', label: 'Primary', percent: 10, resetsAt: new Date(now + hour).toISOString() }],
        analytics: { trends: [], listPrice: { amount: 20, currency: 'USD', interval: 'month', asOf: '2026-01-01' } }
      }),
      view('cursor', { status: 'unavailable' })
    ]
    const days = usageHistoryDays(now)
    const today = usageHistoryDay(now)
    const history: UsageHistory = {
      days,
      since: new Date(now - 9 * 24 * hour).toISOString(),
      series: [
        {
          providerId: 'claude',
          limitId: 'five_hour',
          unit: 'percent',
          total: 30,
          totalQuota: 30,
          points: [{ day: days[20], amount: 18, quota: 18 }, { day: today, amount: 12, quota: 12 }]
        },
        {
          providerId: 'openai',
          limitId: 'primary',
          unit: 'percent',
          total: 4,
          totalQuota: 4,
          points: [{ day: today, amount: 4, quota: 4 }]
        }
      ]
    }

    const metrics = overviewMetrics(settings, providers, history, now)

    expect(metrics.providers).toEqual({ total: settings.length, connected: 2, unavailable: 1, off: 1 })
    expect(metrics.highest).toMatchObject({ providerId: 'claude', limitId: 'seven_day', percent: 82 })
    expect(metrics.nextReset).toMatchObject({ providerId: 'openai', limitId: 'primary', inMilliseconds: hour })
    expect(metrics.activeProviderIds).toEqual(['claude'])
    expect(metrics.today).toBe(16)
    expect(metrics.averagePerActiveDay).toBe(17)
    expect(metrics.busiest).toEqual({ day: days[20], quota: 18 })
    expect(metrics.trackedDays).toBe(10)
    expect(metrics.listPrice).toEqual({ amount: 40, currency: 'USD', plans: 2 })
  })

  it('stays empty without data', () => {
    const metrics = overviewMetrics(DEFAULT_SETTINGS.providers, [], { days: usageHistoryDays(now), series: [] }, now)
    expect(metrics.highest).toBeUndefined()
    expect(metrics.nextReset).toBeUndefined()
    expect(metrics.busiest).toBeUndefined()
    expect(metrics.today).toBe(0)
    expect(metrics.trackedDays).toBe(0)
    expect(metrics.listPrice).toBeUndefined()
  })
})
