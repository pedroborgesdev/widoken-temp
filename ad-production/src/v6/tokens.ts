export { COLORS, EASE, SAFE, SUPPORT_SAFE, clamp, enterHoldExit, mix, progress } from '../v4/tokens'

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080
export const DURATION = 1020 // 34 seconds

const s01 = { from: 0, to: 105, name: 'V6 · 01 PROBLEM' }
const s02 = { from: 105, to: 210, name: 'V6 · 02 SOLUTION' }
const s03 = { from: 210, to: 450, name: 'V6 · 03 USAGE' }
const s04 = { from: 450, to: 660, name: 'V6 · 04 WORKING' }
const s05 = { from: 660, to: 780, name: 'V6 · 05 THEMES' }
const s06 = { from: 780, to: 885, name: 'V6 · 06 BENEFIT' }
const s07 = { from: 885, to: 1020, name: 'V6 · 07 CTA' }

export const SCENES = { s01, s02, s03, s04, s05, s06, s07 } as const
export const CUTS = [105, 210, 450, 660, 780, 885]
