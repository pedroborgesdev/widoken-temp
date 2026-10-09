import { dashboardRouteQuery, sanitizeDashboardRoute } from '@shared/dashboard'
import type { DashboardDesktopApi, DesktopApi, WidgetDesktopApi } from '@shared/ipc'
import { buildUsageHistory, type UsageHistorySample } from '@shared/usageHistory'
import type { ProviderView } from '@shared/provider'
import { APP_THEMES, DEFAULT_SETTINGS, type AppSettings, type SettingsPatch } from '@shared/settings'

const STORAGE_KEY = 'widoken.preview.settings'

function previewUsageSamples(): UsageHistorySample[] {
  const samples: UsageHistorySample[] = []
  const at = (daysAgo: number): number => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - daysAgo)
    return date.getTime()
  }
  const push = (providerId: string, limitId: string, daysAgo: number, percent: number, used?: number, limitValue?: number): void => {
    samples.push({
      providerId,
      limitId,
      capturedAt: at(daysAgo),
      percent,
      resetAt: at(0) + 20 * 86_400_000,
      used: used ?? null,
      limitValue: limitValue ?? null
    })
  }
  ;[28, 24, 21, 18, 14, 11, 8, 5, 2, 0].forEach((day, index) => {
    push('claude', 'session', day, 8 + index * 4)
    push('openai', 'primary', day, 12 + index * 3)
    push('cursor', 'included', day, (10 + index * 6), 10 + index * 6, 100)
  })
  return samples
}

const previewProviders: Omit<ProviderView, 'snapshot'>[] = [
  { id: 'claude', name: 'Claude' },
  { id: 'openai', name: 'ChatGPT' },
  { id: 'cursor', name: 'Cursor' },
  { id: 'antigravity', name: 'Antigravity' }
]

function futureDate(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function loadPreviewSettings(): AppSettings {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppSettings>
      const defaults = structuredClone(DEFAULT_SETTINGS)
      const widget = { ...DEFAULT_SETTINGS.widget, ...parsed.widget }
      if (!APP_THEMES.includes(widget.theme)) widget.theme = DEFAULT_SETTINGS.widget.theme
      return {
        ...defaults,
        ...parsed,
        widget,
        analytics: { ...DEFAULT_SETTINGS.analytics, ...parsed.analytics },
        providers: defaults.providers.map((fallback) => {
          const provider = parsed.providers?.find((candidate) => candidate.id === fallback.id)
          return provider
            ? { ...fallback, ...provider, usageDisplay: { ...fallback.usageDisplay, ...provider.usageDisplay } }
            : fallback
        })
      }
    }
  } catch {
    // Browser preview still works when storage is unavailable.
  }
  return structuredClone(DEFAULT_SETTINGS)
}

let previewSettings = loadPreviewSettings()
const providerListeners = new Set<(providers: ProviderView[]) => void>()
const settingsListeners = new Set<(settings: AppSettings) => void>()
const dashboardWindowListeners = new Set<(open: boolean) => void>()

function previewProviderViews(): ProviderView[] {
  const snapshots: Record<string, ProviderView['snapshot']> = {
    claude: {
      providerId: 'claude',
      status: 'connected',
      limits: [
        { id: 'five-hour', label: '5 hours rate limit', percent: 23, resetsAt: futureDate(123) },
        { id: 'week', label: 'Week rate limit', percent: 31, resetsAt: futureDate(4320) }
      ],
      lastUpdatedAt: new Date().toISOString()
    },
    openai: {
      providerId: 'openai',
      status: 'connected',
      limits: [
        { id: 'three-hour', label: '3 hours rate limit', percent: 55, resetsAt: futureDate(86) },
        { id: 'week', label: 'Week rate limit', percent: 42, resetsAt: futureDate(5760) }
      ],
      lastUpdatedAt: new Date().toISOString()
    },
    cursor: {
      providerId: 'cursor',
      status: 'connected',
      limits: [{ id: 'month', label: 'Monthly fast requests', percent: 80, resetsAt: futureDate(12960) }],
      lastUpdatedAt: new Date().toISOString()
    },
    antigravity: {
      providerId: 'antigravity',
      status: 'connected',
      plan: 'pro',
      limits: [
        { id: 'gemini', label: 'Gemini models', percent: 44, resetsAt: futureDate(2860) },
        { id: 'partner', label: 'Partner models', percent: 27, resetsAt: futureDate(2860) }
      ],
      lastUpdatedAt: new Date().toISOString()
    }
  }

  const catalog = new Map(previewProviders.map((provider) => [provider.id, provider]))
  return [...previewSettings.providers]
    .filter((provider) => provider.enabled && catalog.has(provider.id))
    .sort((a, b) => a.order - b.order)
    .map(({ id }) => ({ ...catalog.get(id)!, snapshot: snapshots[id] }))
}

const browserDesktopApi: DesktopApi = {
  overlay: {
    startDragging: async () => undefined,
    endDragging: async () => undefined,
    setInteractionRegions: async () => undefined,
    dragPointerUp: async () => undefined,
    onDragMove: () => () => undefined,
    onDragEnd: () => () => undefined,
    onDisplays: () => () => undefined
  },
  providers: {
    list: async () => previewProviderViews(),
    refresh: async () => {
      const providers = previewProviderViews()
      providerListeners.forEach((listener) => listener(providers))
      return providers
    },
    onUpdated: (callback) => {
      providerListeners.add(callback)
      return () => providerListeners.delete(callback)
    }
  },
  settings: {
    get: async () => structuredClone(previewSettings),
    update: async (patch: SettingsPatch) => {
      previewSettings = {
        ...previewSettings,
        ...patch,
        widget: { ...previewSettings.widget, ...patch.widget },
        analytics: { ...previewSettings.analytics, ...patch.analytics },
        providers: patch.providers ?? previewSettings.providers
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(previewSettings))
      } catch {
        // Persistence is optional in browser preview mode.
      }
      settingsListeners.forEach((listener) => listener(structuredClone(previewSettings)))
      return structuredClone(previewSettings)
    },
    onUpdated: (callback) => {
      settingsListeners.add(callback)
      return () => settingsListeners.delete(callback)
    }
  },
  dashboard: {
    onWindowState: (callback) => {
      dashboardWindowListeners.add(callback)
      return () => dashboardWindowListeners.delete(callback)
    },
    open: async (route) => {
      const url = new URL('/dashboard.html', window.location.href)
      if (route) url.search = new URLSearchParams(dashboardRouteQuery(sanitizeDashboardRoute(route))).toString()
      window.open(url.toString(), 'widoken-dashboard', 'width=1180,height=760')
      dashboardWindowListeners.forEach((listener) => listener(true))
    },
    close: async () => {
      dashboardWindowListeners.forEach((listener) => listener(false))
      window.close()
    },
    minimize: async () => undefined,
    resizeToContent: async () => undefined,
    onNavigate: () => () => undefined
  },
  themes: {
    syncVsCode: async () => {
      throw new Error('VS Code theme sync is only available in the desktop app.')
    }
  },
  analytics: {
    history: async () => {
      const samples = previewUsageSamples()
      return {
        ...buildUsageHistory(samples, Date.now()),
        since: new Date(Math.min(...samples.map((sample) => sample.capturedAt))).toISOString()
      }
    }
  },
  app: {
    quit: async () => window.close()
  }
}

export const widgetDesktop: WidgetDesktopApi = window.widgetDesktop ?? browserDesktopApi
export const dashboardDesktop: DashboardDesktopApi = window.dashboardDesktop ?? browserDesktopApi
