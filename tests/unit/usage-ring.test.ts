import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UsageRing } from '../../src/renderer/components/Widget/UsageRing'

describe('UsageRing activity indicator', () => {
  it('keeps both layers mounted and draws a dashed processing contour', () => {
    const markup = renderToStaticMarkup(createElement(UsageRing, {
      active: true,
      usages: [{ limit: { id: 'primary', label: 'Primary', percent: 78 } }],
      status: 'connected'
    }))

    expect(markup).toContain('usage-ring--active')
    expect(markup).toContain('usage-ring__track')
    expect(markup).toContain('usage-ring__activity')
    expect(markup).not.toContain('usage-ring__activity--danger')
    expect(markup).toContain('stroke-dasharray="3.6 2.94"')
    expect(markup).not.toContain('usage-ring__activity-dot')
    expect(markup).toContain('usage-ring__value--danger')
  })

  it('keeps the normal usage arc while idle', () => {
    const markup = renderToStaticMarkup(createElement(UsageRing, {
      usages: [{ limit: { id: 'primary', label: 'Primary', percent: 42 } }],
      status: 'connected'
    }))

    expect(markup).toContain('usage-ring__value--success')
    expect(markup).toContain('usage-ring__value--single')
    expect(markup).toContain('stroke-dasharray="3.6 2.94"')
    expect(markup).not.toContain('usage-ring--active')
  })

  it('renders two exact semicircles without an extra divider', () => {
    const markup = renderToStaticMarkup(createElement(UsageRing, {
      usages: [
        { limit: { id: 'primary', label: 'Primary', percent: 55 }, side: 'left' },
        { limit: { id: 'secondary', label: 'Secondary', percent: 42 }, side: 'right' }
      ],
      status: 'connected'
    }))

    expect(markup).toContain('usage-ring--split')
    expect(markup).toContain('usage-ring__value--left')
    expect(markup).toContain('M 14 1.5 A 12.5 12.5 0 0 0 14 26.5')
    expect(markup).toContain('usage-ring__value--right')
    expect(markup).toContain('M 14 1.5 A 12.5 12.5 0 0 1 14 26.5')
    expect(markup).toContain('usage-ring__join')
    expect(markup).toContain('usage-ring__join-stop--left')
    expect(markup).toContain('usage-ring__join-stop--right')
    expect(markup).not.toContain('usage-ring--same-color')
    expect(markup.match(/usage-ring__track/g)).toHaveLength(1)
  })

  it('marks split usages for brightness differentiation only when their colors match', () => {
    const sameColor = renderToStaticMarkup(createElement(UsageRing, {
      usages: [
        { limit: { id: 'primary', label: 'Primary', percent: 20 }, side: 'left' },
        { limit: { id: 'secondary', label: 'Secondary', percent: 42 }, side: 'right' }
      ],
      status: 'connected'
    }))
    const differentColors = renderToStaticMarkup(createElement(UsageRing, {
      usages: [
        { limit: { id: 'primary', label: 'Primary', percent: 49 }, side: 'left' },
        { limit: { id: 'secondary', label: 'Secondary', percent: 50 }, side: 'right' }
      ],
      status: 'connected'
    }))

    expect(sameColor).toContain('usage-ring--same-color')
    expect(differentColors).not.toContain('usage-ring--same-color')
  })

  it('does not render a phantom endpoint for an empty split usage', () => {
    const markup = renderToStaticMarkup(createElement(UsageRing, {
      usages: [
        { limit: { id: 'primary', label: 'Primary', percent: 0 }, side: 'left' },
        { limit: { id: 'secondary', label: 'Secondary', percent: 42 }, side: 'right' }
      ],
      status: 'connected'
    }))

    expect(markup).toContain('usage-ring--split')
    expect(markup).not.toContain('usage-ring__value--left')
    expect(markup).not.toContain('stroke-dasharray="0 100"')
    expect(markup).toContain('usage-ring__value--right')
    expect(markup).not.toContain('usage-ring__join')
  })

  it('does not render a centered phantom cap for an empty single usage', () => {
    const markup = renderToStaticMarkup(createElement(UsageRing, {
      usages: [{ limit: { id: 'balance-usd', label: 'USD balance', percent: 0 } }],
      status: 'connected'
    }))

    expect(markup).toContain('usage-ring__track')
    expect(markup).not.toContain('usage-ring__value')
    expect(markup).not.toContain('<g')
  })

  it('renders monetary balances as a full ring in the theme title color', () => {
    const markup = renderToStaticMarkup(createElement(UsageRing, {
      usages: [
        {
          limit: {
            id: 'balance-usd',
            label: 'USD balance',
            percent: 80,
            currency: 'USD',
            remaining: 2
          },
          side: 'left'
        },
        {
          limit: {
            id: 'balance-cny',
            label: 'CNY balance',
            percent: 20,
            currency: 'CNY',
            remaining: 8
          },
          side: 'right'
        }
      ],
      status: 'connected'
    }))

    expect(markup).toContain('usage-ring--balance')
    expect(markup).not.toContain('usage-ring--split')
    expect(markup).toContain('usage-ring__value--balance')
    expect(markup.match(/class="usage-ring__value /g)).toHaveLength(1)
    expect(markup).not.toContain('stroke-dashoffset')
    expect(markup).not.toContain('usage-ring__value--danger')
  })
})
