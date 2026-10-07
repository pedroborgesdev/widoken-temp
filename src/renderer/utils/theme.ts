import type { CSSProperties } from 'react'
import type { AppSettings, SyncedVsCodeTheme } from '@shared/settings'

const CSS_VARIABLES = {
  accent: '--color-overlay-blue',
  danger: '--color-overlay-danger',
  elevated: '--color-overlay-elevated',
  hover: '--color-overlay-hover',
  muted: '--color-overlay-muted',
  onAccent: '--color-overlay-on-accent',
  shadow: '--color-overlay-shadow',
  strong: '--color-overlay-strong',
  success: '--color-overlay-success',
  surface: '--color-overlay-surface',
  text: '--color-overlay-text',
  thumb: '--color-overlay-thumb',
  track: '--color-overlay-track',
  warning: '--color-overlay-warning'
} as const

export function activeSyncedTheme(settings: AppSettings): SyncedVsCodeTheme | undefined {
  return settings.widget.themeMode === 'vscode' ? settings.widget.vscodeTheme : undefined
}

export function syncedThemeStyle(theme: SyncedVsCodeTheme | undefined): CSSProperties {
  if (!theme) return {}
  const style: Record<string, string> = { colorScheme: theme.colorScheme }
  for (const [key, variable] of Object.entries(CSS_VARIABLES)) {
    style[variable] = theme.colors[key as keyof SyncedVsCodeTheme['colors']]
  }
  return style as CSSProperties
}
