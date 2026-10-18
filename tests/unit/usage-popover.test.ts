import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UsagePopover } from '../../src/renderer/components/UsagePopover/UsagePopover'

describe('UsagePopover monetary balances', () => {
  it('shows only the remaining amount without usage or reset indicators', () => {
    const markup = renderToStaticMarkup(createElement(UsagePopover, {
      provider: {
        id: 'huggingface',
        name: 'Hugging Face',
        snapshot: {
          providerId: 'huggingface',
          status: 'connected',
          limits: [{
            id: 'balance-usd',
            label: 'USD balance',
            percent: 75,
            currency: 'USD',
            used: 15,
            limit: 20,
            remaining: 5
          }],
          lastUpdatedAt: '2026-10-18T12:00:00.000Z'
        }
      },
      placement: 'left',
      left: 0,
      onEnter: () => {},
      onLeave: () => {}
    }))

    expect(markup).toContain('usage-popover__balance')
    expect(markup).toMatch(/(?:\$|USD|US\$).*5(?:[.,]00)?.*remaining/)
    expect(markup).not.toContain('usage-popover__percent')
    expect(markup).not.toContain('usage-bar')
    expect(markup).not.toContain('usage-popover__amount')
    expect(markup).not.toContain('usage-popover__reset')
    expect(markup).not.toContain('used')
  })
})
