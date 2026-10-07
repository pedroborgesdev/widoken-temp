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
    expect(markup.match(/usage-ring__track/g)).toHaveLength(1)
  })
})
