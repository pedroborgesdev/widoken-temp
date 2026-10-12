// Builds providers.png from the provider icons used by the application.
// node assets/readme/image-gen/compose-providers.mjs
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const providers = [
  ['Claude', 'claude.png', 60],
  ['ChatGPT / Codex', 'openai.png', 66],
  ['Cursor', 'cursor.png', 58],
  ['Antigravity', 'antigravity.png', 70],
  ['GitHub Copilot', 'github-copilot.png', 70],
  ['DeepSeek', 'deepseek.png', 76],
  ['Hugging Face', 'huggingface.png', 68]
]

const cards = await Promise.all(providers.map(async ([name, file, size]) => ({
  name,
  size,
  image: `data:image/png;base64,${(await readFile(`src/renderer/assets/providers/${file}`)).toString('base64')}`
})))

const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 220 }, deviceScaleFactor: 1 })
  await page.setContent(`
    <!doctype html>
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
        font-family: Inter, "Segoe UI", system-ui, sans-serif;
      }
      #providers {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 14px;
        width: 100%;
        height: 100%;
        padding: 18px 20px 22px;
      }
      article {
        display: grid;
        grid-template-rows: 112px auto;
        place-items: center;
        min-width: 0;
        padding: 14px 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 24px;
        background: #202020;
        box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
      }
      .icon {
        display: grid;
        width: 96px;
        height: 96px;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 50%;
        background: #292929;
      }
      img { display: block; object-fit: contain; }
      span {
        overflow: hidden;
        max-width: 100%;
        color: #f5f5f5;
        font-size: 18px;
        font-weight: 650;
        line-height: 1.2;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    </style>
    <main id="providers"></main>
  `)

  await page.evaluate(async (cards) => {
    const root = document.querySelector('#providers')
    for (const card of cards) {
      const article = document.createElement('article')
      const icon = document.createElement('div')
      icon.className = 'icon'
      const image = new Image()
      image.src = card.image
      image.alt = ''
      image.style.width = `${card.size}px`
      image.style.height = `${card.size}px`
      const label = document.createElement('span')
      label.textContent = card.name
      icon.append(image)
      article.append(icon, label)
      root.append(article)
      await image.decode()
    }
  }, cards)

  await page.screenshot({ path: 'assets/readme/providers.png', omitBackground: true })
  console.log('wrote assets/readme/providers.png')
} finally {
  await browser.close()
}
