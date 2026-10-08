// Run from the repository root, with `vite --config vite.web.config.ts --port 5199` already up.
// node assets/readme/image-gen/capture.mjs
// Writes hero, widget-closeup, widget-working, widget-menu, widget-horizontal, and dashboard-raw.
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5199'
const OUT = 'assets/readme'
const wallpaperDataUrl = `data:image/png;base64,${(await readFile('wallpaper.png')).toString('base64')}`
const only = process.argv.slice(2)

function fakeApi({ settings, providers }) {
  const minutes = (value) => new Date(Date.now() + value * 60_000).toISOString()
  const revive = (value) => JSON.parse(JSON.stringify(value), (key, item) =>
    typeof item === 'string' && item.startsWith('+') && /At$|resetsAt/.test(key)
      ? minutes(Number(item.slice(1)))
      : item)
  const views = revive(providers).map((provider) => ({
    ...provider,
    snapshot: { providerId: provider.id, lastUpdatedAt: new Date().toISOString(), limits: [], ...provider.snapshot }
  }))

  const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const days = Array.from({ length: 31 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (30 - index))
    return dayKey(date)
  })
  const wave = (seed, scale) => days.flatMap((day, index) => {
    const weekday = new Date(`${day}T12:00:00`).getDay()
    if ((index * 7 + seed) % 11 === 0) return []
    const quota = Math.round(Math.max(0, Math.sin((index + seed) / 3.1) * 0.5 + 0.7) * scale * (weekday === 0 || weekday === 6 ? 0.35 : 1) * 10) / 10
    return quota > 0.4 ? [{ day, amount: quota, quota }] : []
  })
  const series = [
    ['claude', 'session', 9, 14],
    ['claude', 'weekly', 4, 6],
    ['openai', 'primary', 2, 11],
    ['cursor', 'auto', 6, 9],
    ['copilot', 'premium_interactions', 1, 5]
  ].map(([providerId, limitId, seed, scale]) => {
    const points = wave(seed, scale)
    const total = Math.round(points.reduce((sum, point) => sum + point.quota, 0) * 10) / 10
    return { providerId, limitId, unit: 'percent', total, totalQuota: total, lastActivityAt: minutes(-(seed * 13)), points }
  })
  const since = new Date()
  since.setDate(since.getDate() - 74)

  let current = settings
  const settingsListeners = new Set()
  const api = {
    overlay: { startDragging: async () => {}, endDragging: async () => {}, setInteractionRegions: async () => {} },
    providers: { list: async () => views, refresh: async () => views, onUpdated: () => () => {} },
    settings: {
      get: async () => structuredClone(current),
      update: async (patch) => {
        current = {
          ...current,
          ...patch,
          widget: { ...current.widget, ...patch.widget },
          analytics: { ...current.analytics, ...patch.analytics },
          providers: patch.providers ?? current.providers
        }
        settingsListeners.forEach((listener) => listener(structuredClone(current)))
        return structuredClone(current)
      },
      onUpdated: (callback) => {
        settingsListeners.add(callback)
        return () => settingsListeners.delete(callback)
      }
    },
    dashboard: {
      onWindowState: () => () => {},
      open: async () => {},
      close: async () => {},
      minimize: async () => {},
      resizeToContent: async () => {},
      onNavigate: () => () => {}
    },
    themes: { syncVsCode: async () => { throw new Error('preview') } },
    analytics: { history: async () => ({ days, series, since: since.toISOString() }) },
    app: { quit: async () => {} }
  }
  window.widgetDesktop = api
  window.dashboardDesktop = api
}

const providerSettings = (overrides = {}) => [
  { id: 'claude', enabled: true, order: 0, usageDisplay: { split: true, primaryLimitId: 'session', secondaryLimitId: 'weekly' } },
  { id: 'openai', enabled: true, order: 1, usageDisplay: { split: true, primaryLimitId: 'primary', secondaryLimitId: 'secondary' } },
  { id: 'cursor', enabled: true, order: 2, usageDisplay: { split: true, primaryLimitId: 'auto', secondaryLimitId: 'api' } },
  { id: 'copilot', enabled: true, order: 3, usageDisplay: { split: true, primaryLimitId: 'premium_interactions', secondaryLimitId: 'chat' } },
  { id: 'antigravity', enabled: false, order: 4, usageDisplay: { split: false } }
].map((provider) => ({ ...provider, ...overrides[provider.id] }))

const baseSettings = (widget = {}, providers = {}) => ({
  widget: {
    enabled: true,
    theme: 'dark-pastel',
    themeMode: 'preset',
    shadows: true,
    showDockGuides: true,
    edgeTuck: false,
    shadowOpacity: 45,
    itemGap: 6,
    scale: 100,
    orientation: 'vertical',
    unavailableStyle: 'dim',
    docked: true,
    horizontalPosition: 1,
    side: 'right',
    verticalPosition: 0.5,
    ...widget
  },
  analytics: { localInsights: true },
  providers: providerSettings(providers),
  refreshIntervalSeconds: 45,
  launchAtStartup: true,
  openDashboardAtStartup: false,
  dashboardFollowsWidgetTheme: false
})

const price = (amount) => ({ amount, currency: 'USD', interval: 'month', asOf: '2026-09-01' })

const baseProviders = (activity = {}) => [
  {
    id: 'claude',
    name: 'Claude',
    activity: activity.claude,
    snapshot: {
      status: 'connected',
      plan: 'max',
      limits: [
        { id: 'session', label: 'Current session', percent: 38, resetsAt: '+134' },
        { id: 'weekly', label: 'Weekly limit', percent: 64, resetsAt: '+3950' }
      ],
      analytics: {
        listPrice: price(100),
        trends: [
          { limitId: 'session', observedSince: '2026-09-01', consumedLast24Hours: 21, burnRatePerHour: 6.4, estimatedExhaustionAt: '+580' },
          { limitId: 'weekly', observedSince: '2026-09-01', averageDailyConsumption: 9, projectedPercentAtReset: 88 }
        ],
        localMetrics: [{ label: 'Messages today', value: '142' }, { label: 'Projects', value: '6' }]
      }
    }
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    activity: activity.openai,
    snapshot: {
      status: 'connected',
      plan: 'plus',
      limits: [
        { id: 'primary', label: '5 hour window', percent: 22, resetsAt: '+212' },
        { id: 'secondary', label: 'Weekly window', percent: 47, resetsAt: '+6100' }
      ],
      analytics: {
        listPrice: price(20),
        trends: [
          { limitId: 'primary', observedSince: '2026-09-01', consumedLast24Hours: 12, burnRatePerHour: 2.1 },
          { limitId: 'secondary', observedSince: '2026-09-01', averageDailyConsumption: 6, projectedPercentAtReset: 71 }
        ],
        localMetrics: [{ label: 'Codex turns today', value: '38' }]
      }
    }
  },
  {
    id: 'cursor',
    name: 'Cursor',
    activity: activity.cursor,
    snapshot: {
      status: 'connected',
      plan: 'pro',
      limits: [
        { id: 'auto', label: 'Cursor Models', percent: 81, resetsAt: '+15800', used: 405, limit: 500 },
        { id: 'api', label: 'Other Models', percent: 35, resetsAt: '+15800' }
      ],
      analytics: {
        listPrice: price(20),
        trends: [{ limitId: 'auto', observedSince: '2026-09-01', consumedLast24Hours: 7, averageDailyConsumption: 4, estimatedExhaustionAt: '+6800' }],
        localMetrics: [{ label: 'Agent requests today', value: '57' }]
      }
    }
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    activity: activity.copilot,
    snapshot: {
      status: 'connected',
      plan: 'pro',
      limits: [
        { id: 'premium_interactions', label: 'Premium requests', percent: 56, resetsAt: '+15800', used: 168, limit: 300 },
        { id: 'chat', label: 'Chat requests', percent: 12, resetsAt: '+15800' }
      ],
      analytics: { listPrice: price(10), trends: [{ limitId: 'premium_interactions', observedSince: '2026-09-01', averageDailyConsumption: 3 }] }
    }
  }
]

function union(...boxes) {
  const valid = boxes.filter(Boolean)
  const left = Math.min(...valid.map((box) => box.x))
  const top = Math.min(...valid.map((box) => box.y))
  const right = Math.max(...valid.map((box) => box.x + box.width))
  const bottom = Math.max(...valid.map((box) => box.y + box.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function pad(box, padding, viewport) {
  const x = Math.max(0, box.x - padding.left)
  const y = Math.max(0, box.y - padding.top)
  return {
    x,
    y,
    width: Math.min(viewport.width - x, box.width + padding.left + padding.right),
    height: Math.min(viewport.height - y, box.height + padding.top + padding.bottom)
  }
}

async function openPage(browser, { path, viewport, scale, settings, providers, wallpaper = true }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, colorScheme: 'dark' })
  await context.addInitScript(fakeApi, { settings, providers })
  const page = await context.newPage()
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  if (wallpaper) {
    await page.addStyleTag({
      content: `
        html, body, #root, .overlay-root {
          background-color: transparent !important;
          background-image: url("${wallpaperDataUrl}") !important;
          background-position: center !important;
          background-size: cover !important;
          background-repeat: no-repeat !important;
        }
      `
    })
  }
  await page.waitForTimeout(800)
  return { page, context }
}

const desktop = { width: 1040, height: 630 }

const shots = {
  async hero(browser) {
    const { page, context } = await openPage(browser, {
      path: '/widget.html',
      viewport: desktop,
      scale: 2.5,
      settings: baseSettings({ verticalPosition: 0.48 }),
      providers: baseProviders({ claude: 'active' })
    })
    await page.locator('[data-provider-id="claude"]').hover()
    await page.waitForTimeout(500)
    const clip = pad(
      union(await page.locator('.widget').boundingBox(), await page.locator('.usage-popover').boundingBox()),
      { left: 36, right: 18, top: 28, bottom: 28 },
      desktop
    )
    await page.screenshot({ path: `${OUT}/hero.png`, clip })
    await context.close()
  },

  async closeup(browser) {
    const { page, context } = await openPage(browser, {
      path: '/widget.html',
      viewport: desktop,
      scale: 3.2,
      settings: baseSettings(),
      providers: baseProviders()
    })
    await page.mouse.move(20, 20)
    await page.waitForTimeout(250)
    const clip = pad(await page.locator('.widget').boundingBox(), { left: 36, right: 12, top: 28, bottom: 28 }, desktop)
    await page.screenshot({ path: `${OUT}/widget-closeup.png`, clip })
    await context.close()
  },

  async working(browser) {
    const { page, context } = await openPage(browser, {
      path: '/widget.html',
      viewport: desktop,
      scale: 3.2,
      settings: baseSettings({}, { copilot: { enabled: false } }),
      providers: baseProviders({ claude: 'active', cursor: 'active' })
    })
    await page.locator('.widget').hover()
    await page.waitForTimeout(700)
    const clip = pad(await page.locator('.widget').boundingBox(), { left: 42, right: 14, top: 32, bottom: 32 }, desktop)
    await page.screenshot({ path: `${OUT}/widget-working.png`, clip })
    await context.close()
  },

  async menu(browser) {
    const { page, context } = await openPage(browser, {
      path: '/widget.html',
      viewport: desktop,
      scale: 3,
      settings: baseSettings({ verticalPosition: 0.5 }),
      providers: baseProviders()
    })
    await page.getByRole('button', { name: 'Open Widoken Menu' }).hover()
    await page.waitForTimeout(500)
    const clip = pad(
      union(await page.locator('.widget').boundingBox(), await page.locator('.unavailable-popover').boundingBox()),
      { left: 28, right: 16, top: 26, bottom: 26 },
      desktop
    )
    await page.screenshot({ path: `${OUT}/widget-menu.png`, clip })
    await context.close()
  },

  async horizontal(browser) {
    const { page, context } = await openPage(browser, {
      path: '/widget.html',
      viewport: desktop,
      scale: 2.6,
      settings: baseSettings({ orientation: 'horizontal', side: 'top', verticalPosition: 0, horizontalPosition: 0.52 }),
      providers: baseProviders({ openai: 'active' })
    })
    await page.locator('[data-provider-id="cursor"]').hover()
    await page.waitForTimeout(500)
    const clip = pad(
      union(await page.locator('.widget').boundingBox(), await page.locator('.usage-popover').boundingBox()),
      { left: 40, right: 40, top: 12, bottom: 28 },
      desktop
    )
    await page.screenshot({ path: `${OUT}/widget-horizontal.png`, clip })
    await context.close()
  },

  async dashboard(browser) {
    const viewport = { width: 1180, height: 760 }
    const { page, context } = await openPage(browser, {
      path: '/dashboard.html?page=dashboard',
      viewport,
      scale: 2,
      wallpaper: false,
      settings: baseSettings(),
      providers: baseProviders({ claude: 'active' })
    })
    await page.screenshot({ path: `${OUT}/dashboard-raw.png` })
    await context.close()
  }
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const [name, shot] of Object.entries(shots)) {
    if (only.length > 0 && !only.includes(name)) continue
    try {
      await shot(browser)
      console.log(`captured ${name}`)
    } catch (error) {
      console.error(`failed ${name}: ${error.message}`)
    }
  }
} finally {
  await browser.close()
}
