import { describe, expect, it } from 'vitest'
import { displayedUsageLimits, PROVIDER_USAGE_LIMITS } from '../../src/shared/providerUsage'

describe('provider usage display', () => {
  const limits = [
    { id: 'primary', label: 'Short window', percent: 25 },
    { id: 'secondary', label: 'Long window', percent: 60 }
  ]

  it('selects one configured limit when splitting is disabled', () => {
    expect(displayedUsageLimits('openai', limits, {
      split: false,
      primaryLimitId: 'secondary'
    })).toEqual([{ limit: limits[1] }])
  })

  it('assigns configured limits to the left and right semicircles', () => {
    expect(displayedUsageLimits('openai', limits, {
      split: true,
      primaryLimitId: 'secondary',
      secondaryLimitId: 'primary'
    })).toEqual([
      { limit: limits[1], side: 'left' },
      { limit: limits[0], side: 'right' }
    ])
  })

  it('supports the alternate limit ids returned by Claude', () => {
    const claudeLimits = [
      { id: 'five_hour', label: 'Current session', percent: 20 },
      { id: 'weekly_all', label: 'Weekly limit', percent: 40 }
    ]
    expect(displayedUsageLimits('claude', claudeLimits, {
      split: true,
      primaryLimitId: 'session',
      secondaryLimitId: 'weekly'
    })).toEqual([
      { limit: claudeLimits[0], side: 'left' },
      { limit: claudeLimits[1], side: 'right' }
    ])
  })

  it('defines stable choices for providers with multiple usage limits', () => {
    expect(PROVIDER_USAGE_LIMITS.openai.map(({ id }) => id)).toEqual(['primary', 'secondary'])
    expect(PROVIDER_USAGE_LIMITS.cursor.map(({ id }) => id)).toEqual(['auto', 'api', 'on-demand', 'included'])
    expect(PROVIDER_USAGE_LIMITS.claude.map(({ id }) => id)).toEqual(['session', 'weekly'])
    expect(PROVIDER_USAGE_LIMITS.antigravity.map(({ id }) => id)).toEqual(['gemini', 'partner', 'prompt-credits', 'flow-credits'])
  })
})
