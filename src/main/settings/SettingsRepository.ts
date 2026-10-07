import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import {
  DEFAULT_SETTINGS,
  APP_THEMES,
  clampHorizontalPosition,
  clampVerticalPosition,
  type AppSettings,
  type ProviderSetting,
  type SettingsPatch
} from '@shared/settings'

const PROVIDER_IDS = new Set(DEFAULT_SETTINGS.providers.map((provider) => provider.id))

function clampNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback
}

function sanitizeProviders(value: unknown): ProviderSetting[] {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.providers

  const seen = new Set<string>()
  const providers = value.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return []
    const item = candidate as Partial<ProviderSetting>
    if (typeof item.id !== 'string' || !PROVIDER_IDS.has(item.id) || seen.has(item.id)) return []
    seen.add(item.id)
    return [{ id: item.id, enabled: item.enabled !== false, order: Number.isFinite(item.order) ? Number(item.order) : index }]
  })

  for (const fallback of DEFAULT_SETTINGS.providers) {
    if (!seen.has(fallback.id)) providers.push({ ...fallback })
  }

  return providers.sort((a, b) => a.order - b.order).map((provider, order) => ({ ...provider, order }))
}

function sanitizeSettings(value: unknown): AppSettings {
  const candidate = value && typeof value === 'object' ? (value as Partial<AppSettings>) : {}
  const widget = candidate.widget && typeof candidate.widget === 'object' ? candidate.widget : DEFAULT_SETTINGS.widget
  const refresh = Number(candidate.refreshIntervalSeconds)

  return {
    widget: {
      theme: APP_THEMES.includes(widget.theme as AppSettings['widget']['theme'])
        ? widget.theme as AppSettings['widget']['theme']
        : DEFAULT_SETTINGS.widget.theme,
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
    analytics: {
      localInsights: candidate.analytics?.localInsights === true
    },
    providers: sanitizeProviders(candidate.providers),
    refreshIntervalSeconds: Number.isFinite(refresh) ? Math.min(3600, Math.max(30, refresh)) : 45,
    launchAtStartup: candidate.launchAtStartup === true
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
      analytics: { ...current.analytics, ...patch.analytics },
      providers: patch.providers ?? current.providers
    }
    this.cache = sanitizeSettings(merged)
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
