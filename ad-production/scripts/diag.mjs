import { spawn } from 'node:child_process'
import path from 'node:path'
import { chromium } from 'playwright'

const APP_ROOT = path.resolve(process.cwd(), '..')
const PORT = 5199
const bin = path.join(APP_ROOT, 'node_modules', '.bin', 'vite')
const child = spawn(bin, ['--config', 'vite.web.config.ts', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: APP_ROOT, stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 4000))
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto(`http://127.0.0.1:${PORT}/widget.html`, { waitUntil: 'networkidle' })
await page.waitForSelector('.widget')
await page.waitForTimeout(600)
const info = await page.evaluate(() => {
  const el = document.querySelector('.widget')
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  return {
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    offsetWidth: el.offsetWidth,
    offsetHeight: el.offsetHeight,
    width: cs.width, height: cs.height, zoom: cs.zoom,
    widgetWidthVar: cs.getPropertyValue('--widget-width'),
    widgetScale: cs.getPropertyValue('--widget-scale'),
    providerSpan: cs.getPropertyValue('--provider-span'),
    contentRect: document.querySelector('.widget__content').getBoundingClientRect().toJSON(),
    boardRect: document.querySelector('.widget__board').getBoundingClientRect().toJSON(),
    providersRect: document.querySelector('.widget__providers').getBoundingClientRect().toJSON()
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
child.kill('SIGTERM')
