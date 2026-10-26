import { mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scenes = resolve(root, 'output', 'v9-scenes')
const transitions = resolve(root, 'output', 'v9-audit')
const quick = process.argv.includes('--quick')
// Absolute frames at 30 fps. Scene 03 spans 210–435 (7.0–14.5 s):
//   210–252 slide · 255–273 popover open · 266–326 bars · 326–400 hold
//   400–408 popover close · 415–435 handoff glide · 435 cut to Working
const heroFrames = quick
  ? [218, 252, 260, 300, 390, 406, 425, 435]
  : [212, 218, 226, 234, 242, 250, 252, 255, 260, 268, 276, 300, 326, 360, 390, 398, 404, 408, 415, 422, 430, 435]
const cuts = [105, 210, 435, 660, 840, 945]

rmSync(scenes, { recursive: true, force: true })
if (!quick) rmSync(transitions, { recursive: true, force: true })
mkdirSync(scenes, { recursive: true })
mkdirSync(transitions, { recursive: true })

const serveUrl = await bundle({ entryPoint: resolve(root, 'src', 'index.ts'), onProgress: () => {}, enableCaching: false })
const composition = await selectComposition({ serveUrl, id: 'WidokenAdV9', logLevel: 'error' })

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
console.log(`V9 hero frames: ${scenes}`)
console.log(`V9 transition audit: ${transitions}`)
