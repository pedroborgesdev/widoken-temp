export { COLORS, EASE, SAFE, SUPPORT_SAFE, clamp, enterHoldExit, mix, progress } from '../v4/tokens'

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080
export const DURATION = 1110 // 37 seconds

// Same editorial grid as the V8 cut; the recomposed usage scene keeps its
// exact slot (frames 210–435) so every other scene runs untouched.
const s01 = { from: 0, to: 105, name: 'V9 · 01 PROBLEM' }
const s02 = { from: 105, to: 210, name: 'V9 · 02 SOLUTION' }
const s03 = { from: 210, to: 435, name: 'V9 · 03 USAGE HANDOFF' }
const s04 = { from: 435, to: 660, name: 'V9 · 04 WORKING HERO' }
const s05 = { from: 660, to: 840, name: 'V9 · 05 FOUR THEMES' }
const s06 = { from: 840, to: 945, name: 'V9 · 06 BENEFIT' }
const s07 = { from: 945, to: 1110, name: 'V9 · 07 CTA' }

export const SCENES = { s01, s02, s03, s04, s05, s06, s07 } as const
export const CUTS = [105, 210, 435, 660, 840, 945]
