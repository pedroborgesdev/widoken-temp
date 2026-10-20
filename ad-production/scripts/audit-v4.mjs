import { mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const video = resolve(root, 'output/widoken-comercial-v4.mp4')
const out = resolve(root, 'output/v4-audit')
const scenes = resolve(root, 'output/v4-scenes')
const font = resolve(root, 'public/fonts/SpaceMono-Bold.ttf')
const cuts = [0, 72, 222, 354, 504, 675, 810, 945, 1056, 1200, 1395]
const internal = [211, 354, 478, 504, 657, 675, 797, 810, 918, 945, 1044, 1056, 1182, 1200, 1278]
const heroFrames = [38, 150, 300, 420, 585, 742, 875, 1002, 1128, 1300]

rmSync(out, { recursive: true, force: true })
rmSync(scenes, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
mkdirSync(scenes, { recursive: true })

function run(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const label = `drawtext=fontfile=${font}:text='t=%{pts\\:hms}':fontcolor=white:fontsize=24:x=12:y=222`
const cell = `scale=384:216:flags=lanczos,pad=384:246:0:0:black,${label}`
const tile = 'tile=5x4:nb_frames=20:margin=8:padding=8:color=white'

// One labelled frame every 0.5 s across the complete film.
run(['-i', video, '-vf', `fps=2,${cell},${tile}`, '-fps_mode', 'vfr', '-q:v', '2', resolve(out, 'overview-%02d.jpg')])

// Every frame from -5 to +5, plus ±0.2 s, around scene and internal transitions.
const transitionFrames = [...new Set([...cuts, ...internal].flatMap((cut) => [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map((d) => cut + d)))]
  .filter((frame) => frame >= 0 && frame < 1395)
  .sort((a, b) => a - b)
const selectTransitions = transitionFrames.map((frame) => `eq(n\\,${frame})`).join('+')
run(['-i', video, '-vf', `select='${selectTransitions}',${cell},${tile}`, '-fps_mode', 'vfr', '-q:v', '2', resolve(out, 'transitions-%02d.jpg')])

// Representative final composition for every scene.
for (const [index, frame] of heroFrames.entries()) {
  run(['-i', video, '-vf', `select='eq(n\\,${frame})'`, '-frames:v', '1', '-q:v', '2', resolve(scenes, `scene-${String(index + 1).padStart(2, '0')}.png`)])
}

console.log(`V4 audit: ${out}`)
console.log(`V4 scene frames: ${scenes}`)
