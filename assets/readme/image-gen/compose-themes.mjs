// Run after capture-themes.mjs. Builds widget-themes.png from the theme shots and wallpaper.jpg.
// node assets/readme/image-gen/compose-themes.mjs
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const order = [
  ['monokai-black', 'Monokai Black'],
  ['dark', 'Dark'],
  ['dracula', 'Dracula'],
  ['nord', 'Nord'],
  ['catppuccin', 'Catppuccin'],
  ['tokyo-night', 'Tokyo Night'],
  ['gruvbox', 'Gruvbox'],
  ['solarized-dark', 'Solarized'],
  ['monokai', 'Monokai']
]

const wallpaper = `data:image/jpeg;base64,${(await readFile('wallpaper.jpg')).toString('base64')}`
const shots = await Promise.all(order.map(async ([id, label]) => ({
  id,
  label,
  image: `data:image/png;base64,${(await readFile(`assets/readme/.theme-shots/${id}.png`)).toString('base64')}`
})))
const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1680, height: 980 }, deviceScaleFactor: 1 })
  await page.setContent(`
    <!doctype html>
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: url("${wallpaper}") center calc(50% - 20px) / cover no-repeat;
      }
      #canvas {
        position: fixed;
        inset: 0;
        width: 1680px;
        height: 980px;
        overflow: hidden;
        background: url("${wallpaper}") center calc(50% - 20px) / cover no-repeat;
        font-family: "Segoe UI", Inter, system-ui, sans-serif;
      }
      img { position: absolute; display: block; }
      span {
        position: absolute;
        display: grid;
        height: 40px;
        padding: 0 14px;
        place-items: center;
        transform: translateX(-50%);
        border-radius: 20px;
        background: rgba(10, 14, 22, 0.66);
        color: rgb(248, 250, 252);
        font-size: 26px;
        line-height: 40px;
        white-space: nowrap;
      }
    </style>
    <main id="canvas"></main>
  `)

  await page.evaluate(async ({ shots }) => {
    const contentHeight = 600
    const gap = 58
    const originY = 108
    const captionY = 794
    const canvas = document.querySelector('#canvas')
    if (!(canvas instanceof HTMLElement)) throw new Error('Theme canvas not found')

    const opaqueBounds = (image) => {
      const buffer = document.createElement('canvas')
      buffer.width = image.naturalWidth
      buffer.height = image.naturalHeight
      const context = buffer.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Unable to inspect theme image')
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, buffer.width, buffer.height).data
      let left = buffer.width
      let top = buffer.height
      let right = -1
      let bottom = -1
      for (let y = 0; y < buffer.height; y += 1) {
        for (let x = 0; x < buffer.width; x += 1) {
          if (pixels[(y * buffer.width + x) * 4 + 3] < 200) continue
          left = Math.min(left, x)
          top = Math.min(top, y)
          right = Math.max(right, x)
          bottom = Math.max(bottom, y)
        }
      }
      if (right < left || bottom < top) throw new Error('Theme image is fully transparent')
      return { left, top, width: right - left + 1, height: bottom - top + 1 }
    }

    const images = await Promise.all(shots.map(async (shot) => {
      const image = new Image()
      image.src = shot.image
      await image.decode()
      const bounds = opaqueBounds(image)
      const scale = contentHeight / bounds.height
      return {
        ...shot,
        element: image,
        bounds,
        scale,
        visibleWidth: bounds.width * scale
      }
    }))

    const rowWidth = images.reduce((sum, image) => sum + image.visibleWidth, 0) + (images.length - 1) * gap
    let cursorX = (1680 - rowWidth) / 2

    images.forEach(({ label, element, bounds, scale, visibleWidth }) => {
      element.style.left = `${cursorX - bounds.left * scale}px`
      element.style.top = `${originY - bounds.top * scale}px`
      element.style.width = `${element.naturalWidth * scale}px`
      element.style.height = `${element.naturalHeight * scale}px`
      canvas.append(element)

      const caption = document.createElement('span')
      caption.textContent = label
      caption.style.top = `${captionY}px`
      canvas.append(caption)
      const halfWidth = caption.getBoundingClientRect().width / 2
      const desiredCenter = cursorX + visibleWidth / 2
      const center = Math.max(halfWidth + 12, Math.min(window.innerWidth - halfWidth - 12, desiredCenter))
      caption.style.left = `${center}px`
      cursorX += visibleWidth + gap
    })
  }, { shots })

  await page.screenshot({ path: 'assets/readme/widget-themes.png' })
  console.log('wrote assets/readme/widget-themes.png')
} finally {
  await browser.close()
}
