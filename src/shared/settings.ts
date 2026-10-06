export type DockSide = 'left' | 'right' | 'top' | 'bottom'
export const APP_THEMES = [
  'dark',
  'slate',
  'dracula',
  'nord',
  'catppuccin',
  'tokyo-night',
  'gruvbox',
  'one-dark',
  'solarized-dark',
  'monokai',
  'dark-pastel'
] as const
export type AppTheme = typeof APP_THEMES[number]
export type WidgetOrientation = 'vertical' | 'horizontal'
export type UnavailableStyle = 'dim' | 'normal'

export interface ProviderSetting {
  id: string
  enabled: boolean
  order: number
}

export interface AppSettings {
  widget: {
    theme: AppTheme
    shadows: boolean
    showDockGuides: boolean
    shadowOpacity: number
    itemGap: number
    scale: number
    orientation: WidgetOrientation
    unavailableStyle: UnavailableStyle
    docked: boolean
    horizontalPosition: number
    side: DockSide
    verticalPosition: number
  }
  display?: {
    id: number
  }
  analytics: {
    localInsights: boolean
  }
  providers: ProviderSetting[]
  refreshIntervalSeconds: number
  launchAtStartup: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  widget: {
    theme: 'dark',
    shadows: true,
    showDockGuides: true,
    shadowOpacity: 45,
    itemGap: 6,
    scale: 100,
    orientation: 'vertical',
    unavailableStyle: 'dim',
    docked: true,
    horizontalPosition: 0,
    side: 'left',
    verticalPosition: 0.42
  },
  analytics: {
    localInsights: false
  },
  providers: [
    { id: 'claude', enabled: true, order: 0 },
    { id: 'openai', enabled: true, order: 1 },
    { id: 'cursor', enabled: true, order: 2 },
    { id: 'antigravity', enabled: true, order: 3 },
    { id: 'copilot', enabled: false, order: 4 }
  ],
  refreshIntervalSeconds: 45,
  launchAtStartup: false
}

export type SettingsPatch = Partial<Pick<AppSettings, 'refreshIntervalSeconds' | 'launchAtStartup'>> & {
  widget?: Partial<AppSettings['widget']>
  analytics?: Partial<AppSettings['analytics']>
  providers?: ProviderSetting[]
}

export function clampVerticalPosition(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export const clampHorizontalPosition = clampVerticalPosition

export function calculateVerticalPosition(
  widgetY: number,
  workAreaY: number,
  workAreaHeight: number,
  widgetHeight: number
): number {
  const travel = Math.max(1, workAreaHeight - widgetHeight)
  return clampVerticalPosition((widgetY - workAreaY) / travel)
}

export function switchSide(side: DockSide): DockSide {
  if (side === 'left') return 'right'
  if (side === 'right') return 'left'
  return side === 'top' ? 'bottom' : 'top'
}
