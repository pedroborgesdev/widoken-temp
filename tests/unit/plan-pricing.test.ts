import { describe, expect, it } from 'vitest'
import { planListPrice } from '../../src/main/providers/planPricing'

describe('plan list price', () => {
  it('maps known plans to their reference monthly price', () => {
    expect(planListPrice('openai', 'Plus')).toEqual({ amount: 20, currency: 'USD', interval: 'month', asOf: '2026-10-05' })
    expect(planListPrice('cursor', 'pro+')?.amount).toBe(60)
    expect(planListPrice('copilot', 'pro plus')?.amount).toBe(39)
    expect(planListPrice('openai', 'free')?.amount).toBe(0)
  })

  it('reports nothing for unknown or missing plans', () => {
    expect(planListPrice('claude', 'max')).toBeUndefined()
    expect(planListPrice('openai', undefined)).toBeUndefined()
    expect(planListPrice('openai', '   ')).toBeUndefined()
    expect(planListPrice('cursor', 'unknown-tier')).toBeUndefined()
  })
})
