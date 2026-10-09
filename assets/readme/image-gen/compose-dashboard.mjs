// Run after capture.mjs. Places source/dashboard-raw.png on source/wallpaper.jpg and writes dashboard.png.
// node assets/readme/image-gen/compose-dashboard.mjs
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const wallpaper = `data:image/jpeg;base64,${(await readFile('assets/readme/source/wallpaper.jpg')).toString('base64')}`
const dashboard = `data:image/png;base64,${(await readFile('assets/readme/source/dashboard-raw.png')).toString('base64')}`
const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 1 })
  await page.setContent(`
    <!doctype html>
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body {
        display: grid;
        place-items: center;
        background: url("${wallpaper}") center / cover no-repeat;
      }
      img {
        display: block;
        width: 86%;
        height: auto;
        border-radius: 28px;
        box-shadow: 12px 18px 0 rgba(0, 0, 0, 0.31);
      }
    </style>
    <img src="${dashboard}" alt="">
  `, { waitUntil: 'load' })
  await page.locator('img').evaluate((image) => image.decode())
  await page.screenshot({ path: 'assets/readme/dashboard.png' })
  console.log('wrote assets/readme/dashboard.png')
} finally {
  await browser.close()
}
