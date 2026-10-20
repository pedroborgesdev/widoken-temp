/**
 * Widoken ad production - PRODUCT LAYER capture.
 *
 * Runs the REAL Widoken widget (the same React components the desktop app
 * renders) inside the repository's browser preview, drives it with controlled
 * fixtures, and writes transparent PNG captures of real UI states.
 *
 * Nothing here redraws the interface. Every pixel of the product in the ad
 * comes out of this script.
 *
 * Usage:
 *   node scripts/capture-product.mjs
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const AD_ROOT = path.resolve(HERE, '..')
const APP_ROOT = path.resolve(AD_ROOT, '..')
const OUT = path.join(AD_ROOT, 'public', 'product')
const PORT = 5199
const BASE = `http://127.0.0.1:${PORT}`
const DPR = 6
const VIEWPORT = { width: 1800, height: 1100 }

/* ------------------------------------------------------------------ *
 * Fixtures - controlled, coherent with the real ProviderView model.
 * Percentages drive the real severity thresholds
 * (<50 success, 50-74 warning, >=75 danger).
 * ------------------------------------------------------------------ */
const minutes = (value) => new Date(Date.now() + value * 60_000).toISOString()

const FIXTURES = {
  providers: [
    {
      id: 'claude',
      name: 'Claude',
      activity: 'idle',
      snapshot: {
        status: 'connected',
        plan: 'max',
        limits: [
          { id: 'session', label: 'Current session', percent: 38, resetsAt: minutes(134) },
          { id: 'weekly', label: 'Weekly limit', percent: 64, resetsAt: minutes(3950) }
        ],
        lastUpdatedAt: new Date().toISOString()
      }
    },
    {
      id: 'openai',
      name: 'ChatGPT',
      activity: 'idle',
      snapshot: {
        status: 'connected',
        plan: 'plus',
        limits: [
          { id: 'primary', label: '5 hour window', percent: 22, resetsAt: minutes(212) },
          { id: 'secondary', label: 'Weekly window', percent: 47, resetsAt: minutes(6100) }
        ],
        lastUpdatedAt: new Date().toISOString()
      }
    },
    {
      id: 'cursor',
      name: 'Cursor',
      activity: 'idle',
      snapshot: {
        status: 'connected',
        plan: 'pro',
        limits: [
          { id: 'auto', label: 'Cursor Models', percent: 81, resetsAt: minutes(15800), used: 405, limit: 500 },
          { id: 'api', label: 'Other Models', percent: 35, resetsAt: minutes(15800) }
        ],
        lastUpdatedAt: new Date().toISOString()
      }
    },
    {
      id: 'antigravity',
      name: 'Antigravity',
      activity: 'idle',
      snapshot: {
        status: 'connected',
        plan: 'pro',
        limits: [
          { id: 'gemini', label: 'Gemini models', percent: 44, resetsAt: minutes(2860) },
          { id: 'partner', label: 'Partner models', percent: 27, resetsAt: minutes(2860) }
        ],
        lastUpdatedAt: new Date().toISOString()
      }
    },
    {
      id: 'copilot',
      name: 'GitHub Copilot',
      activity: 'idle',
      snapshot: {
        status: 'connected',
        plan: 'pro',
        limits: [
          { id: 'premium_interactions', label: 'Premium requests', percent: 56, resetsAt: minutes(15800), used: 168, limit: 300 },
          { id: 'chat', label: 'Chat requests', percent: 12, resetsAt: minutes(15800) }
        ],
        lastUpdatedAt: new Date().toISOString()
      }
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      activity: 'idle',
      snapshot: {
        status: 'connected',
        plan: 'Harness',
        limits: [
          { id: 'balance-usd', label: 'USD balance', currency: 'USD', percent: 100, used: 8, limit: 10, remaining: 2 }
        ],
        lastUpdatedAt: new Date().toISOString()
      }
    },
    {
      id: 'huggingface',
      name: 'Hugging Face',
      activity: 'idle',
      snapshot: {
        status: 'connected',
        limits: [
          { id: 'balance-usd', label: 'USD balance', currency: 'USD', percent: 100, used: 5, limit: 20, remaining: 15 }
        ],
        lastUpdatedAt: new Date().toISOString()
      }
    }
  ]
}

const PROVIDER_SETTINGS = [
  { id: 'claude', enabled: true, visibleInWidget: true, order: 0, usageDisplay: { split: true, primaryLimitId: 'session', secondaryLimitId: 'weekly' } },
  { id: 'openai', enabled: true, visibleInWidget: true, order: 1, usageDisplay: { split: true, primaryLimitId: 'primary', secondaryLimitId: 'secondary' } },
  { id: 'cursor', enabled: true, visibleInWidget: true, order: 2, usageDisplay: { split: true, primaryLimitId: 'auto', secondaryLimitId: 'api' } },
  { id: 'antigravity', enabled: true, visibleInWidget: true, order: 3, usageDisplay: { split: true, primaryLimitId: 'gemini', secondaryLimitId: 'partner' } },
  { id: 'copilot', enabled: true, visibleInWidget: true, order: 4, usageDisplay: { split: true, primaryLimitId: 'premium_interactions', secondaryLimitId: 'chat' } },
  { id: 'deepseek', enabled: true, visibleInWidget: true, order: 5, usageDisplay: { split: false, primaryLimitId: 'balance-usd' } },
  { id: 'huggingface', enabled: true, visibleInWidget: true, order: 6, usageDisplay: { split: false, primaryLimitId: 'balance-usd' } }
]

const widgetSettings = (overrides = {}) => ({
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
  docked: false,
  horizontalPosition: 0.5,
  side: 'right',
  verticalPosition: 0.5,
  ...overrides
})

const settings = (widget = {}) => ({
  widget: widgetSettings(widget),
  providers: PROVIDER_SETTINGS,
  widgetProviderDiscoveryCompleted: true,
  launchAtStartup: false,
  dashboardFollowsWidgetTheme: false
})

/* ------------------------------------------------------------------ *
 * The fake desktop bridge. Mirrors the shape of the real preload API
 * so the real renderer code path is exercised unchanged.
 * ------------------------------------------------------------------ */
function installBridge({ settings: initialSettings, providers }) {
  let current = initialSettings
  const settingsListeners = new Set()
  const providerListeners = new Set()
  const views = providers.map((provider) => ({
    ...provider,
    snapshot: { providerId: provider.id, lastUpdatedAt: new Date().toISOString(), ...provider.snapshot }
  }))

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
    providers: {
      list: async () => views,
      refresh: async () => views,
      onUpdated: (cb) => { providerListeners.add(cb); return () => providerListeners.delete(cb) }
    },
    settings: {
      get: async () => structuredClone(current),
      update: async (patch) => {
        current = {
          ...current,
          ...patch,
          widget: { ...current.widget, ...patch.widget },
          providers: patch.providers ?? current.providers
        }
        settingsListeners.forEach((cb) => cb(structuredClone(current)))
        return structuredClone(current)
      },
      reset: async () => {
        current = structuredClone(initialSettings)
        settingsListeners.forEach((cb) => cb(structuredClone(current)))
        return structuredClone(current)
      },
      onUpdated: (cb) => { settingsListeners.add(cb); return () => settingsListeners.delete(cb) }
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
    deepseek: {
      status: async () => ({ storedApiKeyConfigured: false, environmentApiKeyAvailable: false, harnessAccountAvailable: true }),
      saveApiKey: async () => ({ storedApiKeyConfigured: true, environmentApiKeyAvailable: false, harnessAccountAvailable: true }),
      clearApiKey: async () => ({ storedApiKeyConfigured: false, environmentApiKeyAvailable: false, harnessAccountAvailable: true })
    },
    browserSessions: {
      list: async () => [],
      login: async () => ({}),
      logout: async () => ({})
    },
    app: { quit: async () => {} }
  }
  window.widgetDesktop = api
  window.dashboardDesktop = api
}

/* Freeze every CSS transition so a capture is a settled state, not a
 * frame of an in-flight animation. The orbit animation is sampled
 * explicitly instead (see ACTIVITY frames). */
const FREEZE_CSS = `
  * { transition: none !important; }
  .usage-ring--active .usage-ring__value { opacity: 0 !important; transform: scale(0.9) !important; }
  .usage-ring--active .usage-ring__activity { opacity: 1 !important; stroke-dashoffset: 0 !important; }
  .usage-ring__activity { animation-play-state: paused !important; }
`

async function startPreview() {
  const bin = path.join(APP_ROOT, 'node_modules', '.bin', 'vite')
  if (!existsSync(bin)) throw new Error(`vite binary not found at ${bin}`)
  const child = spawn(bin, ['--config', 'vite.web.config.ts', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: APP_ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`))
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/widget.html`)
      if (response.ok) return child
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  child.kill('SIGTERM')
  throw new Error('vite preview did not start in time')
}

async function openWidget(context, { widget = {}, providers = FIXTURES.providers } = {}) {
  const page = await context.newPage()
  await page.addInitScript(installBridge, { settings: settings(widget), providers })
  await page.goto(`${BASE}/widget.html`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: FREEZE_CSS })
  await page.waitForSelector('.widget', { state: 'visible' })
  await page.waitForTimeout(450)
  return page
}

function union(...boxes) {
  const valid = boxes.filter(Boolean)
  if (valid.length === 0) return undefined
  const left = Math.min(...valid.map((b) => b.x))
  const top = Math.min(...valid.map((b) => b.y))
  const right = Math.max(...valid.map((b) => b.x + b.width))
  const bottom = Math.max(...valid.map((b) => b.y + b.height))
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

const manifest = {}

/**
 * Named DOM nodes recorded alongside every capture, in CSS pixels relative
 * to the clip. The ad uses these to aim camera moves at real UI parts
 * instead of guessing coordinates from the image.
 */
const PROVIDER_IDS = ['claude', 'openai', 'cursor', 'antigravity', 'copilot', 'deepseek', 'huggingface']
const NODE_BOXES = Object.fromEntries([
  ['pill', '.widget__board'],
  ['popover', '.usage-popover'],
  ...PROVIDER_IDS.map((id) => [id, `[data-provider-id="${id}"]`])
])

async function readBoxes(page, clip) {
  const result = {}
  for (const [key, selector] of Object.entries(NODE_BOXES)) {
    const locator = page.locator(selector).first()
    if (await locator.count() === 0) continue
    const box = await locator.boundingBox()
    if (!box) continue
    result[key] = {
      x: Number((box.x - clip.x).toFixed(2)),
      y: Number((box.y - clip.y).toFixed(2)),
      width: Number(box.width.toFixed(2)),
      height: Number(box.height.toFixed(2))
    }
  }
  return result
}

async function capture(page, name, { selector = '.widget', extraSelectors = [], padding = { left: 16, right: 16, top: 16, bottom: 16 }, boxes = NODE_BOXES } = {}) {
  const viewport = page.viewportSize()
  const rects = []
  rects.push(await page.locator(selector).boundingBox())
  for (const extra of extraSelectors) {
    const box = await page.locator(extra).boundingBox()
    if (box) rects.push(box)
  }
  const clip = pad(union(...rects), padding, viewport)
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, clip, omitBackground: true })
  manifest[name] = { file: `product/${name}.png`, clip, viewport, boxes: boxes ? await readBoxes(page, clip) : {} }
  console.log(`captured ${name} ${Math.round(clip.width)}x${Math.round(clip.height)} css px`)
  return clip
}

async function main() {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(path.join(OUT, 'activity'), { recursive: true })
  await mkdir(path.join(OUT, 'brand'), { recursive: true })

  const preview = await startPreview()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    colorScheme: 'dark'
  })

  try {
    /* 1 - vertical strip, all seven providers + the Widoken app button */
    {
      const page = await openWidget(context, { widget: { orientation: 'vertical' } })
      await page.mouse.move(20, 20)
      await page.waitForTimeout(250)
      await capture(page, 'widget-vertical', { padding: { left: 34, right: 34, top: 34, bottom: 34 } })
      await page.close()
    }

    /* 2 - horizontal strip */
    {
      const page = await openWidget(context, { widget: { orientation: 'horizontal' } })
      await page.mouse.move(20, 20)
      await page.waitForTimeout(250)
      await capture(page, 'widget-horizontal', { padding: { left: 34, right: 34, top: 34, bottom: 34 } })
      await page.close()
    }

    /* 3 - vertical strip in its hot state (gear + grab handle revealed) */
    {
      const page = await openWidget(context, { widget: { orientation: 'vertical' } })
      const box = await page.locator('.widget__board').boundingBox()
      await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2)
      await page.waitForTimeout(400)
      await capture(page, 'widget-vertical-hot', { padding: { left: 34, right: 34, top: 34, bottom: 34 } })
      await page.close()
    }

    /* 4 - horizontal strip with a real usage popover open on Cursor */
    {
      const page = await openWidget(context, { widget: { orientation: 'horizontal' } })
      await page.locator('[data-provider-id="cursor"]').hover()
      await page.waitForSelector('.usage-popover', { state: 'visible' })
      await page.waitForTimeout(450)
      await capture(page, 'widget-horizontal-popover', {
        selector: '.widget',
        extraSelectors: ['.usage-popover'],
        padding: { left: 52, right: 52, top: 52, bottom: 52 }
      })
      await page.close()
    }

    /* 5 - vertical strip with a real usage popover open on Claude */
    {
      const page = await openWidget(context, { widget: { orientation: 'vertical', side: 'left' } })
      await page.locator('[data-provider-id="claude"]').hover()
      await page.waitForSelector('.usage-popover', { state: 'visible' })
      await page.waitForTimeout(450)
      await capture(page, 'widget-vertical-popover', {
        selector: '.widget',
        extraSelectors: ['.usage-popover'],
        padding: { left: 52, right: 52, top: 52, bottom: 52 }
      })
      await page.close()
    }

    /* 6 - vertical strip with a monetary-balance popover (DeepSeek) */
    {
      const page = await openWidget(context, { widget: { orientation: 'vertical', side: 'left' } })
      await page.locator('[data-provider-id="deepseek"]').hover()
      await page.waitForSelector('.usage-popover', { state: 'visible' })
      await page.waitForTimeout(450)
      await capture(page, 'widget-vertical-popover-balance', {
        selector: '.widget',
        extraSelectors: ['.usage-popover'],
        padding: { left: 52, right: 52, top: 52, bottom: 52 }
      })
      await page.close()
    }

    /* 7 - edge tuck: the widget folded into the screen edge */
    {
      const page = await openWidget(context, {
        widget: { orientation: 'vertical', side: 'left', docked: true, horizontalPosition: 0, verticalPosition: 0.5, edgeTuck: true }
      })
      await page.mouse.move(20, 20)
      await page.waitForTimeout(1800)
      const viewport = page.viewportSize()
      const clip = { x: 0, y: 0, width: 34, height: viewport.height }
      await page.screenshot({ path: path.join(OUT, 'widget-vertical-tucked.png'), clip, omitBackground: true })
      manifest['widget-vertical-tucked'] = { file: 'product/widget-vertical-tucked.png', clip, viewport }
      console.log('captured widget-vertical-tucked')
      await page.close()
    }

    /* 7 - activity: the real orbiting usage ring, sampled at exact phases */
    {
      const active = FIXTURES.providers.map((provider) =>
        provider.id === 'claude' || provider.id === 'cursor'
          ? { ...provider, activity: 'active' }
          : provider
      )
      const page = await openWidget(context, {
        widget: { orientation: 'vertical' },
        providers: active
      })
      await page.mouse.move(20, 20)
      await page.waitForTimeout(300)
      const box = await page.locator('.widget').boundingBox()
      const viewport = page.viewportSize()
      const clip = pad(box, { left: 34, right: 34, top: 34, bottom: 34 }, viewport)
      const frames = 33
      const period = 2.2
      for (let i = 0; i < frames; i += 1) {
        const phase = -(i / frames) * period
        await page.addStyleTag({ content: `.usage-ring__activity { animation-delay: ${phase}s !important; }` })
        await page.screenshot({
          path: path.join(OUT, 'activity', `frame-${String(i).padStart(3, '0')}.png`),
          clip,
          omitBackground: true
        })
      }
      manifest['activity-frames'] = { frames, period, clip, file: 'product/activity', boxes: await readBoxes(page, clip) }
      console.log(`captured ${frames} activity frames`)
      await page.close()
    }

    /* 8 - the official icon (brand layer) */
    await (await import('node:fs/promises')).copyFile(
      path.join(APP_ROOT, 'resources', 'widoken.png'),
      path.join(OUT, 'brand', 'icon.png')
    )

    const serialised = JSON.stringify(manifest, null, 2)
    await writeFile(path.join(OUT, 'manifest.json'), serialised)
    // The ad imports this copy so camera moves are driven by measured
    // geometry instead of hard-coded guesses.
    await writeFile(path.join(AD_ROOT, 'src', 'v2', 'captures.json'), serialised)
  } finally {
    await context.close()
    await browser.close()
    preview.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
