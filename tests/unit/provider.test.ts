import { describe, expect, it } from 'vitest'
import { getUsageSeverity, summaryUsage } from '../../src/shared/provider'

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
