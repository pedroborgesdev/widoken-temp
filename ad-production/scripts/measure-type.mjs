/**
 * Measures the real advance width of display strings exactly the way the
 * Kinetic typography component renders them (one inline-block per word,
 * separated by text nodes), so every headline can be sized to the frame.
 *
 * Usage: node scripts/measure-type.mjs
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const FONT = `file://${path.join(ROOT, 'public', 'fonts', 'Archivo-Variable.ttf')}`

const STRINGS = [
  'UM TANQUE',
  'DE GUERRA...',
  '...PRA MATAR UMA',
  'FORMIGA?',
  'TUDO ISSO...',
  '...SÓ PRA VER',
  'SEU USAGE?',
  'PRA QUÊ?',
  'WIDOKEN',
  'SIMPLES.',
  'COMO DEVERIA SER.',
  'SUAS IAS.',
  'UM SÓ LUGAR.',
  'QUER',
  'DETALHES?',
  'É SÓ OLHAR.',
  'SUA IA',
  'TÁ TRABALHANDO?',
  'VOCÊ SABE.',
  'MENOS',
  'COMPLICAÇÃO.',
  'MAIS',
  'CONTROLE.',
  'VOCÊ NÃO QUER',
  'DE GUERRA.',
  'QUER O',
  'SIMPLES',
  'E FÁCIL.',
  'E ISSO O WIDOKEN',
  'ENTENDE.',
  'CONHEÇA O WIDOKEN.'
]

const SIZES = [104, 118, 128, 140, 164, 180, 190, 200, 206, 236, 272, 300]
const TRACKING = -0.025

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setContent(`
  <style>
    @font-face {
      font-family: 'Archivo';
      src: url('${FONT}') format('truetype-variations');
      font-weight: 100 900;
    }
    body { margin: 0; }
  </style>
`)
await page.evaluate(() => document.fonts.ready)

const results = []
for (const size of SIZES) {
  const widths = await page.evaluate(
    ({ strings, size, tracking }) => {
      const out = {}
      for (const text of strings) {
        const container = document.createElement('div')
        container.style.cssText = [
          'position:absolute',
          'white-space:pre',
          "font-family:'Archivo', sans-serif",
          `font-size:${size}px`,
          'font-weight:900',
          "font-variation-settings:'wght' 900",
          `letter-spacing:${tracking}em`,
          'line-height:0.86'
        ].join(';')
        const words = text.split(' ')
        words.forEach((word, index) => {
          if (index > 0) container.appendChild(document.createTextNode(' '))
          const outer = document.createElement('span')
          outer.style.cssText = 'display:inline-block;vertical-align:bottom;overflow:hidden;padding-bottom:0.2em;margin-bottom:-0.2em;'
          const inner = document.createElement('span')
          inner.style.cssText = 'display:inline-block;'
          inner.textContent = word
          outer.appendChild(inner)
          container.appendChild(outer)
        })
        document.body.appendChild(container)
        out[text] = container.getBoundingClientRect().width
        container.remove()
      }
      return out
    },
    { strings: STRINGS, size, tracking: TRACKING }
  )
  results.push({ size, widths })
}

console.log(JSON.stringify(results))
await browser.close()
