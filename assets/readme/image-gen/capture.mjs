// Run from the repository root, with `vite --config vite.web.config.ts --port 5199` already up.
// node assets/readme/image-gen/capture.mjs
// Writes the final widget captures plus source/dashboard-raw.png for dashboard composition.
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5199'
const OUT = 'assets/readme'
const SOURCE = `${OUT}/source`
const wallpaperDataUrl = `data:image/jpeg;base64,${(await readFile(`${SOURCE}/wallpaper.jpg`)).toString('base64')}`
const only = process.argv.slice(2)

function cursorVisual(source) {
  const imageOffset = source.readUInt32LE(18)
  const width = source.readInt32LE(imageOffset + 4)
  const height = Math.abs(source.readInt32LE(imageOffset + 8)) / 2
  const bitsPerPixel = source.readUInt16LE(imageOffset + 14)
  if (width <= 0 || height <= 0 || bitsPerPixel !== 1) throw new Error('Expected a 1-bit Windows cursor')

  const hotspotX = source.readUInt16LE(10)
  const hotspotY = source.readUInt16LE(12)
  const rowBytes = Math.ceil(width / 32) * 4
  const paletteOffset = imageOffset + source.readUInt32LE(imageOffset)
  const xorOffset = paletteOffset + 8
  const andOffset = xorOffset + rowBytes * height
  const colors = [0, 1].map((index) => {
    const offset = paletteOffset + index * 4
    return `rgb(${source[offset + 2]},${source[offset + 1]},${source[offset]})`
  })
  const paths = ['', '']

  for (let y = 0; y < height; y += 1) {
    const sourceY = height - 1 - y
    for (let x = 0; x < width; x += 1) {
      const shift = 7 - (x % 8)
      const byte = sourceY * rowBytes + Math.floor(x / 8)
      const xor = (source[xorOffset + byte] >> shift) & 1
      const mask = (source[andOffset + byte] >> shift) & 1
      if (mask && !xor) continue
      paths[xor] += `M${x} ${y}h1v1h-1z`
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><path fill="${colors[0]}" d="${paths[0]}"/><path fill="${colors[1]}" d="${paths[1]}"/></svg>`
  return {
    width,
    height,
    hotspotX,
    hotspotY,
    image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  }
}

const cursors = {
  pointer: cursorVisual(await readFile(`${SOURCE}/pointer.cur`)),
  click: cursorVisual(await readFile(`${SOURCE}/click.cur`))
}

async function showCursor(page, kind, target, position = {}) {
  const box = await target.boundingBox()
  if (!box) throw new Error(`Unable to place ${kind} cursor`)
  const cursor = cursors[kind]
  const pointX = box.x + box.width * (position.x ?? 0.5) + (position.offsetX ?? 0)
  const pointY = box.y + box.height * (position.y ?? 0.5) + (position.offsetY ?? 0)
  await page.evaluate(async ({ cursor, pointX, pointY }) => {
    document.querySelector('[data-readme-cursor]')?.remove()
    const image = new Image()
    image.dataset.readmeCursor = 'true'
    image.src = cursor.image
    image.style.cssText = [
      'position: fixed',
      `left: ${pointX - cursor.hotspotX}px`,
      `top: ${pointY - cursor.hotspotY}px`,
      `width: ${cursor.width}px`,
      `height: ${cursor.height}px`,
      'z-index: 2147483647',
      'pointer-events: none'
    ].join(';')
    document.body.append(image)
    await image.decode()
  }, { cursor, pointX, pointY })
}

function fakeApi({ settings, providers }) {
  const minutes = (value) => new Date(Date.now() + value * 60_000).toISOString()
  const revive = (value) => JSON.parse(JSON.stringify(value), (key, item) =>
    typeof item === 'string' && item.startsWith('+') && /At$|resetsAt/.test(key)
      ? minutes(Number(item.slice(1)))
      : item)
  const enabledProviderIds = new Set(settings.providers.filter((provider) => provider.enabled).map((provider) => provider.id))
  const views = revive(providers)
    .filter((provider) => enabledProviderIds.has(provider.id))
    .map((provider) => ({
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
    ['antigravity', 'gemini', 1, 7]
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
    overlay: {
      startDragging: async () => {},
      endDragging: async () => {},
      setInteractionRegions: async () => {},
      dragPointerUp: async () => {},
      onDragMove: () => () => {},
      onDragEnd: () => () => {},
      onDisplays: () => () => {}
    },
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
  { id: 'antigravity', enabled: true, order: 3, usageDisplay: { split: true, primaryLimitId: 'gemini', secondaryLimitId: 'partner' } },
  { id: 'copilot', enabled: false, order: 4, usageDisplay: { split: true, primaryLimitId: 'premium_interactions', secondaryLimitId: 'chat' } }
].map((provider) => ({ ...provider, ...overrides[provider.id] }))

const baseSettings = (widget = {}, providers = {}) => ({
  widget: {
    enabled: true,
    theme: 'monokai-black',
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
    id: 'antigravity',
    name: 'Antigravity',
    activity: activity.antigravity,
    snapshot: {
      status: 'connected',
      plan: 'pro',
      limits: [
        { id: 'gemini', label: 'Gemini models', percent: 44, resetsAt: '+2860' },
        { id: 'partner', label: 'Partner models', percent: 27, resetsAt: '+2860' }
      ],
      analytics: {
        listPrice: price(20),
        trends: [
          { limitId: 'gemini', observedSince: '2026-09-01', consumedLast24Hours: 15, averageDailyConsumption: 7, projectedPercentAtReset: 76 },
          { limitId: 'partner', observedSince: '2026-09-01', consumedLast24Hours: 8, averageDailyConsumption: 4, projectedPercentAtReset: 49 }
        ],
        localMetrics: [{ label: 'Agent turns today', value: '46' }]
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
    const provider = page.locator('[data-provider-id="claude"]')
    await provider.hover()
    await page.waitForTimeout(500)
    await showCursor(page, 'pointer', provider)
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
    const provider = page.locator('[data-provider-id="cursor"]')
    await provider.hover()
    await page.waitForTimeout(700)
    await showCursor(page, 'pointer', provider)
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
    const menuButton = page.getByRole('button', { name: 'Open Widoken Menu' })
    await menuButton.hover()
    await page.waitForTimeout(500)
    await showCursor(page, 'click', menuButton)
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
    const provider = page.locator('[data-provider-id="cursor"]')
    await provider.hover()
    await page.waitForTimeout(500)
    await showCursor(page, 'pointer', provider)
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
    await page.screenshot({ path: `${SOURCE}/dashboard-raw.png` })
    await context.close()
  }
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ headless: true })
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
