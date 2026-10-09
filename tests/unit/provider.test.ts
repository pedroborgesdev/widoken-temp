import { describe, expect, it } from 'vitest'
import { getUsageSeverity, summaryUsage } from '../../src/shared/provider'
import { amountDescription } from '../../src/renderer/utils/usageFormat'

describe('usage severity', () => {
  it.each([
    [42, 'success'],
    [50, 'warning'],
    [74, 'warning'],
    [75, 'danger'],
    [100, 'danger']
  ] as const)('maps %i%% to %s', (percent, expected) => {
    expect(getUsageSeverity(percent)).toBe(expected)
  })
})

describe('usage amounts', () => {
  it('formats monetary quotas with the remaining balance first', () => {
    const value = amountDescription({
      id: 'balance-usd',
      label: 'USD balance',
      percent: 25,
      currency: 'USD',
      used: 5,
      limit: 20,
      remaining: 15
    })

    expect(value).toMatch(/\$|USD|US\$/)
    expect(value).toMatch(/15(?:[.,]00)?[^\d]*remaining/)
    expect(value).toMatch(/5(?:[.,]00)?[^\d]{0,8}\/[^\d]{0,8}20(?:[.,]00)?[^\d]{0,8}used/)
    expect(value!.indexOf('remaining')).toBeLessThan(value!.indexOf('used'))
  })

  it('shows only the remaining balance when no used/limit quota is provided', () => {
    const value = amountDescription({
      id: 'balance-usd',
      label: 'USD balance',
      percent: 98,
      currency: 'USD',
      remaining: 2
    })

    expect(value).toMatch(/\$|USD|US\$/)
    expect(value).toMatch(/2(?:[.,]00)?[^\d]*remaining/)
    expect(value).not.toContain('used')
    expect(value).not.toContain('/')
  })

  it('keeps the plain used and capacity format for non-monetary limits', () => {
    const value = amountDescription({
      id: 'month',
      label: 'Monthly premium requests',
      percent: 25,
      used: 5,
      limit: 20,
      remaining: 15
    })

    expect(value).toBe('5 / 20 used')
  })
})

describe('summary usage', () => {
  it('uses the limit closest to exhaustion', () => {
    expect(
      summaryUsage([
        { id: 'one', label: 'one', percent: 20 },
        { id: 'two', label: 'two', percent: 30 }
      ])
    ).toBe(30)
    expect(
      summaryUsage([
        { id: 'one', label: 'one', percent: 10 },
        { id: 'two', label: 'two', percent: 88 }
      ])
    ).toBe(88)
  })

  it('clamps invalid provider percentages', () => {
    expect(summaryUsage([{ id: 'one', label: 'one', percent: 140 }])).toBe(100)
    expect(summaryUsage([])).toBe(0)
  })
})
