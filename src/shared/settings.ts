export type DockSide = 'left' | 'right' | 'top' | 'bottom'
export const APP_THEMES = [
  'monokai-black',
  'dark',
  'slate',
  'dracula',
  'nord',
  'catppuccin',
  'tokyo-night',
  'gruvbox',
  'one-dark',
  'solarized-dark',
  'monokai'
] as const
export type AppTheme = typeof APP_THEMES[number]
export type ThemeMode = 'preset' | 'vscode'

export interface SyncedThemeColors {
  accent: string
  danger: string
  elevated: string
  hover: string
  muted: string
  onAccent: string
  shadow: string
  strong: string
  success: string
  surface: string
  text: string
  thumb: string
  track: string
  warning: string
}

export interface SyncedVsCodeTheme {
  colorScheme: 'dark' | 'light'
  colors: SyncedThemeColors
  name: string
}
export type WidgetOrientation = 'vertical' | 'horizontal'
export type UnavailableStyle = 'dim' | 'normal'

export interface ProviderUsageDisplay {
  split: boolean
  primaryLimitId?: string
  secondaryLimitId?: string
}

export interface ProviderSetting {
  id: string
  enabled: boolean
  order: number
  usageDisplay: ProviderUsageDisplay
}

export interface AppSettings {
  widget: {
    enabled: boolean
    theme: AppTheme
    themeMode: ThemeMode
    vscodeTheme?: SyncedVsCodeTheme
    shadows: boolean
    showDockGuides: boolean
    edgeTuck: boolean
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
  openDashboardAtStartup: boolean
  dashboardFollowsWidgetTheme: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  widget: {
    enabled: true,
    theme: 'monokai-black',
    themeMode: 'preset',
    shadows: true,
    showDockGuides: true,
    edgeTuck: true,
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
    { id: 'claude', enabled: true, order: 0, usageDisplay: { split: true, primaryLimitId: 'session', secondaryLimitId: 'weekly' } },
    { id: 'openai', enabled: true, order: 1, usageDisplay: { split: true, primaryLimitId: 'primary', secondaryLimitId: 'secondary' } },
    { id: 'cursor', enabled: true, order: 2, usageDisplay: { split: true, primaryLimitId: 'auto', secondaryLimitId: 'api' } },
    { id: 'antigravity', enabled: true, order: 3, usageDisplay: { split: true, primaryLimitId: 'gemini', secondaryLimitId: 'partner' } },
    { id: 'copilot', enabled: false, order: 4, usageDisplay: { split: true, primaryLimitId: 'premium_interactions', secondaryLimitId: 'chat' } }
  ],
  refreshIntervalSeconds: 45,
  launchAtStartup: false,
  openDashboardAtStartup: false,
  dashboardFollowsWidgetTheme: false
}

export type SettingsPatch = Partial<Pick<
  AppSettings,
  'refreshIntervalSeconds' | 'launchAtStartup' | 'openDashboardAtStartup' | 'dashboardFollowsWidgetTheme'
>> & {
  widget?: Partial<AppSettings['widget']>
  analytics?: Partial<AppSettings['analytics']>
  providers?: ProviderSetting[]
  display?: { id: number }
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
