import { mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'

const root = resolve(import.meta.dirname, '..')
const scenes = resolve(root, 'output', 'v10-scenes')
const transitions = resolve(root, 'output', 'v10-audit')
const quick = process.argv.includes('--quick')
const heroFrames = quick
  ? [100, 105, 125, 150, 185, 209, 210, 211, 220, 228, 235, 250, 410, 434, 435, 436, 480, 515, 610, 659, 660, 675, 735, 790, 820, 839, 840, 885, 930, 944, 945, 975, 1050]
  : [42, 100, 105, 125, 150, 185, 209, 210, 235, 250, 330, 410, 422, 434, 435, 455, 480, 515, 545, 610, 650, 659, 660, 675, 710, 735, 760, 790, 820, 839, 840, 885, 930, 944, 945, 975, 1050]
const cuts = [105, 210, 435, 660, 840, 945]

rmSync(scenes, { recursive: true, force: true })
if (!quick) rmSync(transitions, { recursive: true, force: true })
mkdirSync(scenes, { recursive: true })
mkdirSync(transitions, { recursive: true })

const serveUrl = await bundle({ entryPoint: resolve(root, 'src', 'index.ts'), onProgress: () => {}, enableCaching: false })
const composition = await selectComposition({ serveUrl, id: 'WidokenAdV10', logLevel: 'error' })

async function still(frame, output) {
  await renderStill({ composition, serveUrl, frame, output, imageFormat: 'png', overwrite: true, logLevel: 'error' })
}

for (const [index, frame] of heroFrames.entries()) {
  await still(frame, resolve(scenes, `hero-${String(index + 1).padStart(2, '0')}-f${String(frame).padStart(4, '0')}.png`))
}
if (!quick) {
  for (const cut of cuts) {
    for (const offset of [-2, -1, 0, 1, 2]) {
      const frame = cut + offset
      await still(frame, resolve(transitions, `cut-${String(cut).padStart(4, '0')}-${offset >= 0 ? '+' : ''}${offset}-f${String(frame).padStart(4, '0')}.png`))
    }
  }
}
console.log(`V10 hero frames: ${scenes}`)
console.log(`V10 transition audit: ${transitions}`)
