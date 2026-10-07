import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UsageRing } from '../../src/renderer/components/Widget/UsageRing'

describe('UsageRing activity indicator', () => {
  it('keeps both layers mounted and activates sixteen equal severity-colored orbit dots', () => {
    const markup = renderToStaticMarkup(createElement(UsageRing, {
      active: true,
      percent: 78,
      status: 'connected'
    }))

    expect(markup).toContain('usage-ring--active')
    expect(markup).toContain('usage-ring__track')
    expect(markup).toContain('usage-ring__activity--danger')
    expect(markup.match(/usage-ring__activity-dot/g)).toHaveLength(16)
    expect(markup.match(/r="1.5"/g)).toHaveLength(16)
    expect(markup).toContain('usage-ring__value--danger')
  })

  it('keeps the normal usage arc while idle', () => {
    const markup = renderToStaticMarkup(createElement(UsageRing, {
      percent: 42,
      status: 'connected'
    }))

    expect(markup).toContain('usage-ring__value--success')
    expect(markup).toContain('usage-ring__activity-dot')
    expect(markup).not.toContain('usage-ring--active')
  })
})
