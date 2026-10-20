/**
 * WIDOKEN — COMMERCIAL V2 / tokens.
 *
 * 1920x1080 · 30 fps · 44 s (22 bars at 120 BPM).
 *
 * Every colour is taken from the shipped product: the official icon
 * (resources/widoken.png) and the monokai-black widget theme, which is the
 * application default. No colour is invented for the film.
 */

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080

/** 44 s = 22 bars at 120 BPM. */
export const DURATION = 1320

export const BPM = 120
export const BEAT = 15 // frames
export const BAR = 60 // frames
export const EIGHTH = 7.5

export const COLORS = {
  paper: '#ffffff',
  ink: '#0d0d0d',
  inkSoft: '#3d3d3d',
  inkMuted: '#8a8a8a',

  /** Neutral marker ring: a wheel in flight, a meter before it ignites. */
  ringIdle: '#e6e6e6',

  /** Official icon. */
  green: '#4aff5d',
  amber: '#ffad4a',
  red: '#ff4949',
  iconInk: '#1c1c1c',

  /** Real ring colours (monokai-black theme, the app default). */
  ringSuccess: '#a6e22e',
  ringWarning: '#e6db74',
  ringDanger: '#f92672',
  ringBalance: '#ae81ff',
  ringTrack: '#49483e',

  /** widget__board background, read from the real capture. */
  surface: '#222222'
} as const

/**
 * V2 timeline. Every boundary sits on a beat of the 120 BPM score.
 *
 * V1 (40 s) is kept for comparison inside the project; these are the new
 * boundaries, documented against V1 in MOTION_DESIGN_SYSTEM.md.
 */
export const SCENES = {
  s01: { from: 0, to: 150, name: 'S01 · O ABSURDO' },
  s02: { from: 150, to: 300, name: 'S02 · TUDO ISSO' },
  s03: { from: 300, to: 450, name: 'S03 · REVEAL' },
  s04: { from: 450, to: 630, name: 'S04 · UM SÓ LUGAR' },
  s05: { from: 630, to: 810, name: 'S05 · DETALHES' },
  s06: { from: 810, to: 930, name: 'S06 · TRABALHANDO' },
  s07: { from: 930, to: 1050, name: 'S07 · PROPORÇÃO' },
  s08: { from: 1050, to: 1170, name: 'S08 · SIMPLES E FÁCIL' },
  s09: { from: 1170, to: 1320, name: 'S09 · ASSINATURA' }
} as const

export type SceneId = keyof typeof SCENES

/** Absolute frame of every cut, consumed by the score and the film. */
export const CUTS = [0, 150, 300, 450, 630, 810, 930, 1050, 1170, 1320] as const

/** Editorial margins. Type is allowed to break them deliberately. */
export const MARGIN = 84
export const COLUMN_RIGHT = WIDTH - MARGIN

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

/** Seconds -> absolute frame. */
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
  inOutQuint: (t: number) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  outBack: (t: number) => {
    const c1 = 1.28
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  /** Hard, mechanical stop for the tank. */
  outMechanical: (t: number) => 1 - Math.pow(1 - t, 7)
} as const

/** Progress of a window inside a scene, clamped and eased. */
export function progress(
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = EASE.outQuint
): number {
  return easing(clamp((frame - start) / Math.max(1, duration)))
}

/** Text presence: 0 before, 1 after, with an optional exit window. */
export function windowed(
  frame: number,
  inStart: number,
  inDuration: number,
  outStart?: number,
  outDuration = 8
): { enter: number; exit: number; visible: boolean } {
  const enter = progress(frame, inStart, inDuration, EASE.outQuint)
  const exit = outStart === undefined ? 0 : progress(frame, outStart, outDuration, EASE.inOutCubic)
  return { enter, exit, visible: frame >= inStart && (outStart === undefined || frame < outStart + outDuration) }
}
