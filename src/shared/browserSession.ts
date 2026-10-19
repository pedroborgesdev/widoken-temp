import {
  APP_THEMES,
  type AppTheme,
  type SyncedThemeColors,
  type SyncedVsCodeTheme
} from './settings'

export interface BrowserSessionAppearance {
  theme: AppTheme
  syncedTheme?: SyncedVsCodeTheme
}

export interface BrowserSessionWelcomeContent extends BrowserSessionAppearance {
  providerId: string
  displayName: string
  loginUrl: string
  reason: string
  collectedData: string[]
}

export const BROWSER_SESSION_TITLEBAR_HEIGHT = 50

const BROWSER_SESSION_WINDOW_CHROME = {
  'monokai-black': { background: '#222222', foreground: '#ffffff' },
  dark: { background: '#000000', foreground: '#ffffff' },
  slate: { background: '#2b3138', foreground: '#ffffff' },
  dracula: { background: '#282a36', foreground: '#ffffff' },
  nord: { background: '#2e3440', foreground: '#eceff4' },
  catppuccin: { background: '#1e1e2e', foreground: '#f5e0dc' },
  'tokyo-night': { background: '#1a1b26', foreground: '#ffffff' },
  gruvbox: { background: '#282828', foreground: '#fbf1c7' },
  'one-dark': { background: '#282c34', foreground: '#ffffff' },
  'solarized-dark': { background: '#002b36', foreground: '#eee8d5' },
  monokai: { background: '#272822', foreground: '#ffffff' }
} as const satisfies Record<AppTheme, { background: string; foreground: string }>

export function browserSessionWindowChrome(theme: AppTheme): { background: string; foreground: string } {
  return BROWSER_SESSION_WINDOW_CHROME[theme]
}

const PROVIDER_ID = /^[a-z0-9][a-z0-9-]*$/
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const THEME_COLOR_KEYS = [
  'accent',
  'balance',
  'danger',
  'elevated',
  'hover',
  'muted',
  'onAccent',
  'shadow',
  'strong',
  'success',
  'surface',
  'text',
  'thumb',
  'track',
  'warning'
] as const satisfies readonly (keyof SyncedThemeColors)[]

function boundedText(value: string | null, maximum: number): string | undefined {
  const text = value?.trim()
  return text && text.length <= maximum ? text : undefined
}

function httpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function syncedTheme(value: unknown): SyncedVsCodeTheme | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<SyncedVsCodeTheme>
  if (typeof candidate.name !== 'string' || !candidate.name.trim() || candidate.name.length > 160 || !candidate.colors) {
    return undefined
  }
  const colors = {} as SyncedThemeColors
  for (const key of THEME_COLOR_KEYS) {
    const color = candidate.colors[key]
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) return undefined
    colors[key] = color
  }
  return {
    colorScheme: candidate.colorScheme === 'light' ? 'light' : 'dark',
    colors,
    name: candidate.name.trim()
  }
}

export function browserSessionWelcomeQuery(content: BrowserSessionWelcomeContent): Record<string, string> {
  const query: Record<string, string> = {
    providerId: content.providerId,
    displayName: content.displayName,
    loginUrl: content.loginUrl,
    reason: content.reason,
    collectedData: JSON.stringify(content.collectedData),
    theme: content.theme
  }
  if (content.syncedTheme) query.syncedTheme = JSON.stringify(content.syncedTheme)
  return query
}

export function browserSessionWelcomeFromSearch(search: string): BrowserSessionWelcomeContent | undefined {
  const params = new URLSearchParams(search)
  const providerId = boundedText(params.get('providerId'), 64)
  const displayName = boundedText(params.get('displayName'), 80)
  const loginUrl = httpsUrl(boundedText(params.get('loginUrl'), 2_048))
  const reason = boundedText(params.get('reason'), 800)
  const themeValue = params.get('theme')
  if (!providerId || !PROVIDER_ID.test(providerId) || !displayName || !loginUrl || !reason) return undefined

  let collectedData: unknown
  try {
    collectedData = JSON.parse(params.get('collectedData') ?? '')
  } catch {
    return undefined
  }
  if (!Array.isArray(collectedData) || collectedData.length === 0 || collectedData.length > 8) return undefined
  if (!collectedData.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 240)) {
    return undefined
  }

  let parsedSyncedTheme: SyncedVsCodeTheme | undefined
  const syncedThemeValue = params.get('syncedTheme')
  if (syncedThemeValue !== null) {
    try {
      parsedSyncedTheme = syncedTheme(JSON.parse(syncedThemeValue))
    } catch {
      return undefined
    }
    if (!parsedSyncedTheme) return undefined
  }

  const content: BrowserSessionWelcomeContent = {
    providerId,
    displayName,
    loginUrl,
    reason,
    collectedData: collectedData.map((item) => item.trim()),
    theme: APP_THEMES.includes(themeValue as AppTheme) ? themeValue as AppTheme : 'monokai-black'
  }
  if (parsedSyncedTheme) content.syncedTheme = parsedSyncedTheme
  return content
}
