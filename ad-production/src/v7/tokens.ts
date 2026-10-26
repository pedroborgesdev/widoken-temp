export { COLORS, EASE, SAFE, SUPPORT_SAFE, clamp, enterHoldExit, mix, progress } from '../v4/tokens'

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080
export const DURATION = 1110 // 37 seconds

const s01 = { from: 0, to: 105, name: 'V7 · 01 PROBLEM' }
const s02 = { from: 105, to: 210, name: 'V7 · 02 SOLUTION' }
const s03 = { from: 210, to: 435, name: 'V7 · 03 VERTICAL USAGE' }
const s04 = { from: 435, to: 660, name: 'V7 · 04 VERTICAL WORKING' }
const s05 = { from: 660, to: 840, name: 'V7 · 05 FOUR THEMES' }
const s06 = { from: 840, to: 945, name: 'V7 · 06 BENEFIT' }
const s07 = { from: 945, to: 1110, name: 'V7 · 07 CTA' }

export const SCENES = { s01, s02, s03, s04, s05, s06, s07 } as const
export const CUTS = [105, 210, 435, 660, 840, 945]
