import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Renders the five key styleframes of the V2 cut.
 *
 *   node scripts/render-styleframes.mjs            # the five defaults
 *   node scripts/render-styleframes.mjs 210 1080   # arbitrary frames
 *
 * Defaults (frame · beat):
 *    99 · 00:03,3  opening — the tank has stopped, the headline is over it
 *   330 · 00:11,0  the white disc holds the official icon
 *   540 · 00:18,0  the horizontal widget as the frame itself
 *   672 · 00:22,4  real usage popover (81% = used)
 *  1275 · 00:42,5  the signature, held
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const output = path.join(root, 'output', 'styleframes')
const remotion = path.join(root, 'node_modules', '.bin', 'remotion')

const DURATION = 1320

const NAMED = [
  { frame: 99, name: 'v2-01-abertura' },
  { frame: 330, name: 'v2-02-reveal-do-widget' },
  { frame: 540, name: 'v2-03-widget-horizontal' },
  { frame: 672, name: 'v2-04-popover-real' },
  { frame: 1275, name: 'v2-05-cta' }
]

const requested = process.argv.slice(2).map(Number)
const targets = requested.length > 0
  ? requested.map((frame) => ({ frame, name: `v2-frame-${String(frame).padStart(4, '0')}` }))
  : NAMED

for (const { frame } of targets) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= DURATION) {
    throw new Error(`Styleframe frames must be integers in [0, ${DURATION - 1}].`)
  }
}

mkdirSync(output, { recursive: true })

for (const { frame, name } of targets) {
  const destination = path.join(output, `${name}.png`)
  const result = spawnSync(
    remotion,
    ['still', 'src/index.ts', 'WidokenAd', destination, `--frame=${frame}`, '--overwrite'],
    { cwd: root, stdio: 'inherit' }
  )
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
