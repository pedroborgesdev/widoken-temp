import { mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const video = resolve(root, 'output/widoken-comercial-v3.mp4')
const out = resolve(root, 'output/v3-audit')
const font = resolve(root, 'public/fonts/SpaceMono-Bold.ttf')
const cuts = [0, 81, 231, 381, 531, 711, 891, 1011, 1131, 1251, 1401]
const internalTransitions = [615, 623, 687, 705] // S04 copy out, themes in/out, widget return

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

function run(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const label = `drawtext=fontfile=${font}:text='t=%{pts\\:hms}':fontcolor=white:fontsize=24:x=12:y=222`
const cell = `scale=384:216:flags=lanczos,pad=384:246:0:0:black,${label}`
const tile = 'tile=5x4:nb_frames=20:margin=8:padding=8:color=white'

// Full-film scan: one labeled frame every 0.5 seconds.
run(['-i', video, '-vf', `fps=2,${cell},${tile}`, '-fps_mode', 'vfr', '-q:v', '2', resolve(out, 'overview-%02d.jpg')])

// Transition scan: ±0.2 s, ±0.1 s and the immediate frames around every cut.
const frames = [...new Set([...cuts, ...internalTransitions].flatMap((cut) => [-6, -3, -1, 0, 1, 3, 6].map((d) => cut + d)))]
  .filter((frame) => frame >= 0 && frame < 1401)
  .sort((a, b) => a - b)
const select = frames.map((frame) => `eq(n\\,${frame})`).join('+')
run(['-i', video, '-vf', `select='${select}',${cell},${tile}`, '-fps_mode', 'vfr', '-q:v', '2', resolve(out, 'transitions-%02d.jpg')])

console.log(`V3 audit generated at ${out}`)
