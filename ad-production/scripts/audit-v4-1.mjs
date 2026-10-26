import { mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'

const root = resolve(import.meta.dirname, '..')
const scenes = resolve(root, 'output', 'v4-1-scenes')
const transitions = resolve(root, 'output', 'v4-1-audit')
const heroFrames = [38, 150, 300, 465, 585, 765, 875, 1002, 1128, 1300]
const cuts = [72, 222, 354, 504, 675, 810, 945, 1056, 1200]

rmSync(scenes, { recursive: true, force: true })
rmSync(transitions, { recursive: true, force: true })
mkdirSync(scenes, { recursive: true })
mkdirSync(transitions, { recursive: true })

const serveUrl = await bundle({
  entryPoint: resolve(root, 'src', 'index.ts'),
  onProgress: () => {},
  enableCaching: true
})
const composition = await selectComposition({ serveUrl, id: 'WidokenAdV41', logLevel: 'error' })

async function still(frame, output) {
  await renderStill({
    composition,
    serveUrl,
    frame,
    output,
    imageFormat: 'png',
    overwrite: true,
    logLevel: 'error'
  })
}

for (const [index, frame] of heroFrames.entries()) {
  await still(frame, resolve(scenes, `scene-${String(index + 1).padStart(2, '0')}-f${String(frame).padStart(4, '0')}.png`))
}

for (const cut of cuts) {
  for (const offset of [-2, 2]) {
    const frame = cut + offset
    await still(frame, resolve(transitions, `cut-${String(cut).padStart(4, '0')}-${offset < 0 ? 'before' : 'after'}-f${String(frame).padStart(4, '0')}.png`))
  }
}

console.log(`V4.1 scene frames: ${scenes}`)
console.log(`V4.1 transition frames: ${transitions}`)
