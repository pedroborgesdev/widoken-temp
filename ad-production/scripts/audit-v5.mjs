import { mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'

const root = resolve(import.meta.dirname, '..')
const scenes = resolve(root, 'output', 'v5-scenes')
const transitions = resolve(root, 'output', 'v5-audit')
const heroFrames = [30, 150, 310, 440, 590, 745, 850, 900, 960, 1080, 1200, 1350]
const cuts = [60, 240, 375, 510, 675, 810, 1020, 1140, 1260]

rmSync(scenes, { recursive: true, force: true })
rmSync(transitions, { recursive: true, force: true })
mkdirSync(scenes, { recursive: true })
mkdirSync(transitions, { recursive: true })

const serveUrl = await bundle({ entryPoint: resolve(root, 'src', 'index.ts'), onProgress: () => {}, enableCaching: false })
const composition = await selectComposition({ serveUrl, id: 'WidokenAdV5', logLevel: 'error' })

async function still(frame, output) {
  await renderStill({ composition, serveUrl, frame, output, imageFormat: 'png', overwrite: true, logLevel: 'error' })
}

for (const [index, frame] of heroFrames.entries()) {
  await still(frame, resolve(scenes, `hero-${String(index + 1).padStart(2, '0')}-f${String(frame).padStart(4, '0')}.png`))
}
for (const cut of cuts) {
  for (const offset of [-2, -1, 0, 1, 2]) {
    const frame = cut + offset
    await still(frame, resolve(transitions, `cut-${String(cut).padStart(4, '0')}-${offset >= 0 ? '+' : ''}${offset}-f${String(frame).padStart(4, '0')}.png`))
  }
}
console.log(`V5 hero frames: ${scenes}`)
console.log(`V5 transition audit: ${transitions}`)
