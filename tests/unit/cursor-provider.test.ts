import { describe, expect, it } from 'vitest'
import { parseCursorUsage } from '../../src/main/providers/CursorProviderAdapter'

describe('Cursor usage pools', () => {
  it('exposes Cursor Models and Other Models as separate limits', () => {
    expect(
      parseCursorUsage({
        billingCycleEnd: '2026-11-01T00:00:00.000Z',
        individualUsage: {
          plan: {
            autoPercentUsed: 23.5,
            apiPercentUsed: 41.25
          }
        }
      })
    ).toEqual([
      {
        id: 'auto',
        label: 'Cursor Models',
        percent: 23.5,
        resetsAt: '2026-11-01T00:00:00.000Z'
      },
      {
        id: 'api',
        label: 'Other Models',
        percent: 41.25,
        resetsAt: '2026-11-01T00:00:00.000Z'
      }
    ])
  })

  it('keeps a zero-percent pool visible', () => {
    expect(
      parseCursorUsage({
        individualUsage: {
          plan: {
            autoPercentUsed: 3.62,
            apiPercentUsed: 0
          }
        }
      })
    ).toEqual([
      { id: 'auto', label: 'Cursor Models', percent: 3.62, resetsAt: undefined },
      { id: 'api', label: 'Other Models', percent: 0, resetsAt: undefined }
    ])
  })
})
