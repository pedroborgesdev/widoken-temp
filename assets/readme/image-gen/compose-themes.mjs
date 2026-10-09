// Run after capture-themes.mjs. Builds widget-themes.png from source/theme-shots and source/wallpaper.jpg.
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

const wallpaper = `data:image/jpeg;base64,${(await readFile('assets/readme/source/wallpaper.jpg')).toString('base64')}`
const shots = await Promise.all(order.map(async ([id, label]) => ({
  id,
  label,
  image: `data:image/png;base64,${(await readFile(`assets/readme/source/theme-shots/${id}.png`)).toString('base64')}`
})))
const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1680, height: 945 }, deviceScaleFactor: 1 })
  await page.setContent(`
    <!doctype html>
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: url("${wallpaper}") center / 100% 100% no-repeat;
      }
      #canvas {
        position: fixed;
        inset: 0;
        width: 1680px;
        height: 945px;
        overflow: hidden;
        background: url("${wallpaper}") center / 100% 100% no-repeat;
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
    const canvasWidth = 1680
    const canvasHeight = 945
    const gap = 6
    const labelGap = 14
    const chipHeight = 40
    const sideMargin = 72
    const canvas = document.querySelector('#canvas')
    if (!(canvas instanceof HTMLElement)) throw new Error('Theme canvas not found')

    const measureShot = (image) => {
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
      let solidTop = buffer.height
      let solidBottom = -1
      for (let y = 0; y < buffer.height; y += 2) {
        for (let x = 0; x < buffer.width; x += 2) {
          const alpha = pixels[(y * buffer.width + x) * 4 + 3]
          if (alpha > 12) {
            left = Math.min(left, x)
            top = Math.min(top, y)
            right = Math.max(right, x)
            bottom = Math.max(bottom, y)
          }
          if (alpha > 210) {
            solidTop = Math.min(solidTop, y)
            solidBottom = Math.max(solidBottom, y)
          }
        }
      }
      if (right < left || bottom < top) throw new Error('Theme image is fully transparent')
      left = Math.max(0, left - 2)
      top = Math.max(0, top - 2)
      right = Math.min(buffer.width - 1, right + 2)
      bottom = Math.min(buffer.height - 1, bottom + 2)
      return {
        left,
        top,
        width: right - left + 1,
        height: bottom - top + 1,
        solidTop: Math.max(0, solidTop - top),
        solidBottom: Math.min(bottom - top + 1, solidBottom - top + 1)
      }
    }

    const images = await Promise.all(shots.map(async (shot) => {
      const image = new Image()
      image.src = shot.image
      await image.decode()
      return { ...shot, element: image, bounds: measureShot(image) }
    }))

    const labelRoom = chipHeight + labelGap
    let contentHeight = canvasHeight - labelRoom * 2 - 28
    let scale = contentHeight / images[0].bounds.height
    let drawWidths = images.map(({ bounds }) => bounds.width * scale)
    let rowWidth = drawWidths.reduce((sum, width) => sum + width, 0) + gap * (images.length - 1)
    const maxRowWidth = canvasWidth - sideMargin * 2
    if (rowWidth > maxRowWidth) {
      scale *= maxRowWidth / rowWidth
      contentHeight = images[0].bounds.height * scale
      drawWidths = images.map(({ bounds }) => bounds.width * scale)
      rowWidth = drawWidths.reduce((sum, width) => sum + width, 0) + gap * (images.length - 1)
    }

    let originX = (canvasWidth - rowWidth) / 2
    const originY = Math.round((canvasHeight - contentHeight) / 2 + 18)

    const labels = images.map(({ label }) => {
      const caption = document.createElement('span')
      caption.textContent = label
      caption.style.visibility = 'hidden'
      canvas.append(caption)
      const width = caption.getBoundingClientRect().width
      return { caption, width }
    })

    let chipLeft = canvasWidth
    let chipRight = 0
    let cursorX = originX
    labels.forEach(({ width }, index) => {
      const chipX = cursorX + (drawWidths[index] - width) / 2
      chipLeft = Math.min(chipLeft, chipX)
      chipRight = Math.max(chipRight, chipX + width)
      cursorX += drawWidths[index] + gap
    })
    const inset = 20
    let shift = 0
    if (chipLeft < inset) shift = inset - chipLeft
    if (chipRight + shift > canvasWidth - inset) shift -= chipRight + shift - (canvasWidth - inset)
    originX += shift
    cursorX = originX

    images.forEach(({ element, bounds }, index) => {
      element.style.left = `${cursorX - bounds.left * scale}px`
      element.style.top = `${originY - bounds.top * scale}px`
      element.style.width = `${element.naturalWidth * scale}px`
      element.style.height = `${element.naturalHeight * scale}px`
      canvas.append(element)

      const { caption } = labels[index]
      const bodyTop = originY + bounds.solidTop * scale
      const bodyBottom = originY + bounds.solidBottom * scale
      caption.style.visibility = 'visible'
      caption.style.left = `${cursorX + drawWidths[index] / 2}px`
      caption.style.top = `${index % 2 === 0 ? bodyBottom + labelGap : bodyTop - labelGap - chipHeight}px`
      canvas.append(caption)
      cursorX += drawWidths[index] + gap
    })
  }, { shots })

  await page.locator('#canvas').screenshot({ path: 'assets/readme/widget-themes.png' })
  console.log('wrote assets/readme/widget-themes.png')
} finally {
  await browser.close()
}
