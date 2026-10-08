// Run from the repository root, with `vite --config vite.web.config.ts --port 5213` already up.
// node assets/readme/image-gen/capture-themes.mjs
// Writes one transparent widget shot per theme into assets/readme/.theme-shots.
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const themes = [
  ['monokai-black', 'Monokai Black'],
  ['dark', 'Dark'],
  ['slate', 'Slate'],
  ['dracula', 'Dracula'],
  ['nord', 'Nord'],
  ['catppuccin', 'Catppuccin'],
  ['tokyo-night', 'Tokyo Night'],
  ['gruvbox', 'Gruvbox'],
  ['one-dark', 'One Dark'],
  ['solarized-dark', 'Solarized'],
  ['monokai', 'Monokai']
]

const base = 'http://127.0.0.1:5213/widget.html'
const outDir = 'assets/readme/.theme-shots'

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({
  viewport: { width: 420, height: 640 },
  deviceScaleFactor: 3
})

await page.addInitScript(() => {
  const saved = {
    widget: {
      enabled: true,
      theme: 'monokai-black',
      themeMode: 'preset',
      shadows: false,
      showDockGuides: false,
      edgeTuck: false,
      shadowOpacity: 45,
      itemGap: 6,
      scale: 100,
      orientation: 'vertical',
      unavailableStyle: 'dim',
      docked: false,
      horizontalPosition: 0.08,
      side: 'left',
      verticalPosition: 0.08
    }
  }
  localStorage.setItem('widoken.preview.settings', JSON.stringify(saved))
})

await page.goto(base, { waitUntil: 'networkidle' })
await page.addStyleTag({
  content: `
    .overlay-root--ready .widget__visual,
    .provider-item--entering {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .widget { filter: none !important; }
  `
})
await page.waitForSelector('.provider-item')
await page.waitForTimeout(400)

const placed = await page.evaluate(() => {
  const widget = document.querySelector('.widget')
  if (!widget) return false
  widget.style.left = '48px'
  widget.style.top = '36px'
  return true
})
if (!placed) throw new Error('Widget did not render')
await page.waitForTimeout(250)

const shots = []
for (const [id, label] of themes) {
  await page.evaluate((themeId) => {
    const root = document.querySelector('.overlay-root')
    root.className = root.className.replace(/overlay-root--theme-[\w-]+/, `overlay-root--theme-${themeId}`)
  }, id)
  await page.waitForTimeout(220)
  const box = await page.locator('.widget').boundingBox()
  if (!box) throw new Error(`No widget box for ${id}`)
  const pad = 28
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2
  }
  const file = `${outDir}/${id}.png`
  await page.screenshot({ path: file, clip, omitBackground: true })
  shots.push({ id, label, file })
}

await writeFile(`${outDir}/manifest.json`, JSON.stringify(shots, null, 2))
await browser.close()
console.log(`captured ${shots.length}`)
