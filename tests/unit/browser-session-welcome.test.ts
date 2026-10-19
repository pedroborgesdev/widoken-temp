import { describe, expect, it } from 'vitest'
import {
  browserSessionWelcomeFromSearch,
  browserSessionWelcomeQuery,
  browserSessionWindowChrome,
  type BrowserSessionWelcomeContent
} from '../../src/shared/browserSession'
import { APP_THEMES } from '../../src/shared/settings'
import type { SyncedVsCodeTheme } from '../../src/shared/settings'

const SYNCED_THEME: SyncedVsCodeTheme = {
  name: 'Synced Test Theme',
  colorScheme: 'light',
  colors: {
    accent: '#0066cc',
    balance: '#6f42c1',
    danger: '#cc0000',
    elevated: '#eeeeee',
    hover: '#dddddd',
    muted: '#666666',
    onAccent: '#ffffff',
    shadow: '#00000080',
    strong: '#111111',
    success: '#008800',
    surface: '#ffffff',
    text: '#222222',
    thumb: '#f5f5f5',
    track: '#cccccc',
    warning: '#aa7700'
  }
}

const CONTENT: BrowserSessionWelcomeContent = {
  providerId: 'example',
  displayName: 'Example Provider',
  loginUrl: 'https://example.com/login',
  reason: 'A website session is required for usage data.',
  collectedData: ['Account name', 'Monthly usage'],
  theme: 'nord'
}

describe('browser-session welcome route', () => {
  it('round-trips validated provider disclosure content', () => {
    const search = new URLSearchParams(browserSessionWelcomeQuery(CONTENT)).toString()
    expect(browserSessionWelcomeFromSearch(`?${search}`)).toEqual(CONTENT)
  })

  it('rejects unsafe login URLs and malformed disclosure lists', () => {
    const query = browserSessionWelcomeQuery(CONTENT)
    expect(browserSessionWelcomeFromSearch(`?${new URLSearchParams({ ...query, loginUrl: 'http://example.com' })}`)).toBeUndefined()
    expect(browserSessionWelcomeFromSearch(`?${new URLSearchParams({ ...query, collectedData: '[]' })}`)).toBeUndefined()
    expect(browserSessionWelcomeFromSearch(`?${new URLSearchParams({ ...query, providerId: '../escape' })}`)).toBeUndefined()
  })

  it('falls back to the standard theme for an unknown theme value', () => {
    const query = browserSessionWelcomeQuery(CONTENT)
    expect(browserSessionWelcomeFromSearch(`?${new URLSearchParams({ ...query, theme: 'unknown' })}`)?.theme)
      .toBe('monokai-black')
  })

  it('provides matching native titlebar colors for every application theme', () => {
    for (const theme of APP_THEMES) {
      expect(browserSessionWindowChrome(theme)).toEqual({
        background: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        foreground: expect.stringMatching(/^#[0-9a-f]{6}$/i)
      })
    }
  })

  it('round-trips a sanitized synced widget theme and rejects unsafe color values', () => {
    const themed = { ...CONTENT, syncedTheme: SYNCED_THEME }
    const query = browserSessionWelcomeQuery(themed)
    expect(browserSessionWelcomeFromSearch(`?${new URLSearchParams(query)}`)).toEqual(themed)

    const unsafe = {
      ...SYNCED_THEME,
      colors: { ...SYNCED_THEME.colors, surface: 'url(javascript:alert(1))' }
    }
    expect(browserSessionWelcomeFromSearch(`?${new URLSearchParams({
      ...query,
      syncedTheme: JSON.stringify(unsafe)
    })}`)).toBeUndefined()
  })
})
