import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import { PROVIDER_USAGE_LIMITS } from '@shared/providerUsage'
import {
  DEFAULT_SETTINGS,
  APP_THEMES,
  CREDENTIAL_SOURCES,
  HUGGING_FACE_BROWSERS,
  clampHorizontalPosition,
  clampVerticalPosition,
  type AppSettings,
  type CredentialSource,
  type HuggingFaceBrowser,
  type ProviderSetting,
  type ProviderUsageDisplay,
  type SettingsPatch,
  type SyncedThemeColors,
  type SyncedVsCodeTheme
} from '@shared/settings'

const PROVIDER_IDS = new Set(DEFAULT_SETTINGS.providers.map((provider) => provider.id))
const THEME_COLOR_KEYS = [
  'accent',
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
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function clampNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback
}

function sanitizeProviderUsage(
  providerId: string,
  value: unknown,
  fallback: ProviderUsageDisplay
): ProviderUsageDisplay {
  const candidate = value && typeof value === 'object' ? value as Partial<ProviderUsageDisplay> : fallback
  const ids = new Set((PROVIDER_USAGE_LIMITS[providerId] ?? []).map((option) => option.id))
  const primaryLimitId = typeof candidate.primaryLimitId === 'string' && ids.has(candidate.primaryLimitId)
    ? candidate.primaryLimitId
    : fallback.primaryLimitId
  let secondaryLimitId = typeof candidate.secondaryLimitId === 'string' && ids.has(candidate.secondaryLimitId)
    ? candidate.secondaryLimitId
    : fallback.secondaryLimitId
  if (secondaryLimitId === primaryLimitId) {
    secondaryLimitId = [...ids].find((id) => id !== primaryLimitId)
  }
  return {
    split: ids.size >= 2 && candidate.split !== false,
    primaryLimitId,
    secondaryLimitId
  }
}

function sanitizeCredentialSource(value: unknown): CredentialSource {
  return CREDENTIAL_SOURCES.includes(value as CredentialSource) ? value as CredentialSource : 'auto'
}

function sanitizeHuggingFaceBrowser(value: unknown): HuggingFaceBrowser {
  return HUGGING_FACE_BROWSERS.includes(value as HuggingFaceBrowser) ? value as HuggingFaceBrowser : 'auto'
}

function sanitizeProviders(value: unknown): ProviderSetting[] {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.providers

  const seen = new Set<string>()
  const providers = value.flatMap<ProviderSetting>((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return []
    const item = candidate as Partial<ProviderSetting>
    if (typeof item.id !== 'string' || !PROVIDER_IDS.has(item.id) || seen.has(item.id)) return []
    seen.add(item.id)
    const fallback = DEFAULT_SETTINGS.providers.find((provider) => provider.id === item.id)!
    const enabled = item.enabled !== false
    const setting: ProviderSetting = {
      id: item.id,
      enabled,
      visibleInWidget: enabled && (typeof item.visibleInWidget === 'boolean'
        ? item.visibleInWidget
        : item.enabled !== false),
      order: Number.isFinite(item.order) ? Number(item.order) : index,
      usageDisplay: sanitizeProviderUsage(item.id, item.usageDisplay, fallback.usageDisplay)
    }
    if (item.id === 'deepseek') setting.credentialSource = sanitizeCredentialSource(item.credentialSource)
    if (item.id === 'huggingface') setting.huggingFaceBrowser = sanitizeHuggingFaceBrowser(item.huggingFaceBrowser)
    return [setting]
  })

  for (const fallback of DEFAULT_SETTINGS.providers) {
    if (!seen.has(fallback.id)) providers.push({ ...fallback, visibleInWidget: false })
  }

  return providers.sort((a, b) => a.order - b.order).map((provider, order) => ({ ...provider, order }))
}

function sanitizeSyncedTheme(value: unknown): SyncedVsCodeTheme | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<SyncedVsCodeTheme>
  if (typeof candidate.name !== 'string' || !candidate.name.trim() || !candidate.colors) return undefined
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

function sanitizeSettings(value: unknown): AppSettings {
  const candidate = value && typeof value === 'object' ? (value as Partial<AppSettings>) : {}
  const widget = candidate.widget && typeof candidate.widget === 'object' ? candidate.widget : DEFAULT_SETTINGS.widget
  const refresh = Number(candidate.refreshIntervalSeconds)
  const vscodeTheme = sanitizeSyncedTheme(widget.vscodeTheme)

  return {
    widget: {
      enabled: widget.enabled !== false,
      theme: APP_THEMES.includes(widget.theme as AppSettings['widget']['theme'])
        ? widget.theme as AppSettings['widget']['theme']
        : DEFAULT_SETTINGS.widget.theme,
      themeMode: widget.themeMode === 'vscode' && vscodeTheme ? 'vscode' : 'preset',
      vscodeTheme,
      shadows: widget.shadows !== false,
      showDockGuides: widget.showDockGuides !== false,
      edgeTuck: widget.edgeTuck !== false,
      shadowOpacity: clampNumber(widget.shadowOpacity, 0, 100, DEFAULT_SETTINGS.widget.shadowOpacity),
      itemGap: clampNumber(widget.itemGap, 0, 18, DEFAULT_SETTINGS.widget.itemGap),
      scale: clampNumber(widget.scale, 70, 150, DEFAULT_SETTINGS.widget.scale),
      orientation: widget.orientation === 'horizontal' ? 'horizontal' : 'vertical',
      unavailableStyle: widget.unavailableStyle === 'normal' ? 'normal' : 'dim',
      docked: widget.docked !== false,
      horizontalPosition: clampHorizontalPosition(Number(widget.horizontalPosition) || 0),
      side: widget.side === 'right' || widget.side === 'top' || widget.side === 'bottom' ? widget.side : 'left',
      verticalPosition: clampVerticalPosition(Number(widget.verticalPosition) || 0)
    },
    display:
      candidate.display && Number.isFinite(candidate.display.id)
        ? { id: Number(candidate.display.id) }
        : undefined,
    providers: sanitizeProviders(candidate.providers),
    // A settings file without this field belongs to an existing installation.
    // Only a genuinely missing settings file receives DEFAULT_SETTINGS with a
    // pending first-run discovery.
    widgetProviderDiscoveryCompleted: typeof candidate.widgetProviderDiscoveryCompleted === 'boolean'
      ? candidate.widgetProviderDiscoveryCompleted
      : true,
    refreshIntervalSeconds: Number.isFinite(refresh) ? Math.min(3600, Math.max(30, refresh)) : 45,
    launchAtStartup: candidate.launchAtStartup !== false,
    dashboardFollowsWidgetTheme: candidate.dashboardFollowsWidgetTheme === true
  }
}

export class SettingsRepository {
  private cache?: AppSettings

  constructor(private readonly filePath: string) {}

  async get(): Promise<AppSettings> {
    if (this.cache) return structuredClone(this.cache)

    try {
      this.cache = sanitizeSettings(JSON.parse(await fs.readFile(this.filePath, 'utf8')))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('Failed to read settings:', error)
      this.cache = structuredClone(DEFAULT_SETTINGS)
    }

    return structuredClone(this.cache)
  }

  async update(patch: SettingsPatch): Promise<AppSettings> {
    const current = await this.get()
    const merged: AppSettings = {
      ...current,
      ...patch,
      widget: { ...current.widget, ...patch.widget },
      providers: patch.providers ?? current.providers
    }
    this.cache = sanitizeSettings(merged)
    await this.persist(this.cache)
    return structuredClone(this.cache)
  }

  async reset(): Promise<AppSettings> {
    const current = await this.get()
    // Widget discovery is an installation step rather than a user preference, so
    // a reset keeps it settled: replaying it would hide every provider again on
    // the next launch.
    this.cache = sanitizeSettings({
      ...structuredClone(DEFAULT_SETTINGS),
      widgetProviderDiscoveryCompleted: current.widgetProviderDiscoveryCompleted
    })
    await this.persist(this.cache)
    return structuredClone(this.cache)
  }

  private async persist(settings: AppSettings): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true })
    const temporaryPath = `${this.filePath}.tmp`
    await fs.writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 })
    await fs.rename(temporaryPath, this.filePath)
  }
}
