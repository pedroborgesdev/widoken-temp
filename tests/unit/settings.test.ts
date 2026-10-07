import { describe, expect, it } from 'vitest'
import { APP_THEMES, DEFAULT_SETTINGS } from '../../src/shared/settings'

describe('application themes', () => {
  it('offers eleven supported themes and keeps the default valid', () => {
    expect(APP_THEMES).toHaveLength(11)
    expect(new Set(APP_THEMES).size).toBe(APP_THEMES.length)
    expect(APP_THEMES).toContain(DEFAULT_SETTINGS.widget.theme)
    expect(APP_THEMES).toContain('dark-pastel')
  })
})

describe('widget lifecycle settings', () => {
  it('starts with the widget enabled', () => {
    expect(DEFAULT_SETTINGS.widget.enabled).toBe(true)
  })
})
