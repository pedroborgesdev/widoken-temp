/** WIDOKEN COMMERCIAL V4 — single source of truth for timing and design. */
export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080
export const DURATION = 1395 // 46.5 s

export const COLORS = {
  BRAND_GREEN: '#4aff5d',
  BRAND_ORANGE: '#ffad4a',
  BRAND_RED: '#ff4949',
  BRAND_PURPLE: '#ae81ff',
  BRAND_PINK: '#f92672',
  INK: '#0d0d0d',
  WHITE: '#ffffff',
  MUTED: '#8a8a8a',
  SOFT: '#3d3d3d',
  TRACK: '#e6e6e6'
} as const

export const SAFE = 96
export const SUPPORT_SAFE = 112

export const DURATIONS = {
  s01: 72,
  s02: 150,
  s03: 132,
  s04: 150,
  s05: 171,
  s06: 135,
  s07: 135,
  s08: 111,
  s09: 144,
  s10: 195
} as const

const s01 = { from: 0, to: 72, name: 'V4 · 01 BRAND INTRO' }
const s02 = { from: s01.to, to: s01.to + DURATIONS.s02, name: 'V4 · 02 PROBLEM' }
const s03 = { from: s02.to, to: s02.to + DURATIONS.s03, name: 'V4 · 03 SOLUTION' }
const s04 = { from: s03.to, to: s03.to + DURATIONS.s04, name: 'V4 · 04 CONCEPT' }
const s05 = { from: s04.to, to: s04.to + DURATIONS.s05, name: 'V4 · 05 CONSUMPTION' }
const s06 = { from: s05.to, to: s05.to + DURATIONS.s06, name: 'V4 · 06 BALANCE' }
const s07 = { from: s06.to, to: s06.to + DURATIONS.s07, name: 'V4 · 07 ACTIVITY' }
const s08 = { from: s07.to, to: s07.to + DURATIONS.s08, name: 'V4 · 08 THEMES' }
const s09 = { from: s08.to, to: s08.to + DURATIONS.s09, name: 'V4 · 09 BENEFIT' }
// One-frame overlap guarantees that the retained icon/product never blink at
// the 09→10 handoff; the editorial cut remains frame 1200.
const s10 = { from: s09.to - 1, to: DURATION, name: 'V4 · 10 CTA' }

export const SCENES = { s01, s02, s03, s04, s05, s06, s07, s08, s09, s10 } as const
export const CUTS = [0, s01.to, s02.to, s03.to, s04.to, s05.to, s06.to, s07.to, s08.to, s09.to, s10.to]

export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n))
export const mix = (a: number, b: number, t: number) => a + (b - a) * t

export const EASE = {
  linear: (t: number) => t,
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  inQuint: (t: number) => t ** 5,
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2)
} as const

export function progress(frame: number, start: number, duration: number, easing = EASE.outQuint) {
  return easing(clamp((frame - start) / Math.max(1, duration)))
}

export function enterHoldExit(frame: number, enterAt: number, enterDuration: number, exitAt: number, exitDuration: number) {
  return progress(frame, enterAt, enterDuration) * (1 - progress(frame, exitAt, exitDuration, EASE.inOutCubic))
}
