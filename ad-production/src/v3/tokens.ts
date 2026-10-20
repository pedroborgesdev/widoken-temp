/** WIDOKEN — COMMERCIAL V3 / central timing and visual tokens. */
export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080

export const BPM = 120
export const BEAT = 15
export const BAR = 60
export const EIGHTH = 7.5

/** The only place where V3 durations and offsets are defined. */
export const DURATIONS = {
  intro: 81, s01: 150, s02: 150, s03: 150, s04: 180,
  s05: 180, s06: 120, s07: 120, s08: 120, s09: 150
} as const

const intro = { from: 0, to: DURATIONS.intro, name: 'INTRO · WIDOKEN' }
const s01 = { from: intro.to, to: intro.to + DURATIONS.s01, name: 'S01 · O ABSURDO' }
const s02 = { from: s01.to, to: s01.to + DURATIONS.s02, name: 'S02 · TUDO ISSO' }
const s03 = { from: s02.to, to: s02.to + DURATIONS.s03, name: 'S03 · REVEAL' }
const s04 = { from: s03.to, to: s03.to + DURATIONS.s04, name: 'S04 · UM SÓ LUGAR' }
const s05 = { from: s04.to, to: s04.to + DURATIONS.s05, name: 'S05 · DETALHES' }
const s06 = { from: s05.to, to: s05.to + DURATIONS.s06, name: 'S06 · TRABALHANDO' }
const s07 = { from: s06.to, to: s06.to + DURATIONS.s07, name: 'S07 · PROPORÇÃO' }
const s08 = { from: s07.to, to: s07.to + DURATIONS.s08, name: 'S08 · SIMPLES E FÁCIL' }
const s09 = { from: s08.to, to: s08.to + DURATIONS.s09, name: 'S09 · ASSINATURA' }

export const SCENES = { intro, s01, s02, s03, s04, s05, s06, s07, s08, s09 } as const
export const CONTENT_START = SCENES.s01.from
export const DURATION = SCENES.s09.to
export const CUTS = Object.values(SCENES).map((scene) => scene.from).concat(DURATION)
export const fromV2 = (frame: number) => CONTENT_START + frame

export const COLORS = {
  paper: '#ffffff', ink: '#0d0d0d', inkSoft: '#3d3d3d', inkMuted: '#8a8a8a',
  ringIdle: '#e6e6e6', green: '#4aff5d', amber: '#ffad4a', red: '#ff4949', iconInk: '#1c1c1c',
  ringSuccess: '#a6e22e', ringWarning: '#e6db74', ringDanger: '#f92672', ringBalance: '#ae81ff',
  ringTrack: '#49483e', surface: '#222222'
} as const

export const MARGIN = 84
export const COLUMN_RIGHT = WIDTH - MARGIN
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
export const f = (seconds: number) => Math.round(seconds * FPS)

export const EASE = {
  linear: (t: number) => t,
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outCirc: (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inCubic: (t: number) => t * t * t,
  inQuint: (t: number) => t * t * t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuint: (t: number) => t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2,
  outBack: (t: number) => { const c1 = 1.28; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) },
  outMechanical: (t: number) => 1 - Math.pow(1 - t, 7)
} as const

export function progress(frame: number, start: number, duration: number, easing: (t: number) => number = EASE.outQuint) {
  return easing(clamp((frame - start) / Math.max(1, duration)))
}

export function windowed(frame: number, inStart: number, inDuration: number, outStart?: number, outDuration = 8) {
  const enter = progress(frame, inStart, inDuration, EASE.outQuint)
  const exit = outStart === undefined ? 0 : progress(frame, outStart, outDuration, EASE.inOutCubic)
  return { enter, exit, visible: frame >= inStart && (outStart === undefined || frame < outStart + outDuration) }
}
