/**
 * BRAND LAYER - tokens.
 *
 * Every colour below is extracted from the real Widoken assets:
 *   - `resources/widoken.png`  (the official icon)
 *   - `src/renderer/styles/globals.css` (the monokai-black widget theme)
 * Nothing here is invented.
 */

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080
export const DURATION = 1200

export const COLORS = {
  paper: '#ffffff',
  ink: '#0d0d0d',
  inkSoft: '#3a3a3a',

  /** Official Widoken icon palette. */
  green: '#4aff5d',
  amber: '#ffad4a',
  red: '#ff4949',
  iconInk: '#1c1c1c',

  /** Widget ring colours (monokai-black theme, the app default). */
  ringSuccess: '#a6e22e',
  ringWarning: '#e6db74',
  ringDanger: '#f92672',
  ringBalance: '#ae81ff',
  ringTrack: '#49483e',
  widgetSurface: '#222222'
} as const

/** Scene boundaries, snapped to the 120 BPM / 2 s bar grid of the score. */
export const SCENES = {
  s01: { from: 0, to: 120 },
  s02: { from: 120, to: 240 },
  s03: { from: 240, to: 420 },
  s04: { from: 420, to: 600 },
  s05: { from: 600, to: 780 },
  s06: { from: 780, to: 900 },
  s07: { from: 900, to: 1020 },
  s08: { from: 1020, to: 1200 }
} as const

/** Safe area used for every editorial element. */
export const MARGIN = 96

export const EASE = {
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuint: (t: number) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }
} as const

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
