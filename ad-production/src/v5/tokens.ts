export { COLORS, EASE, SAFE, SUPPORT_SAFE, clamp, enterHoldExit, mix, progress } from '../v4/tokens'

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080
export const DURATION = 1440 // 48 seconds

const s01 = { from: 0, to: 60, name: 'V5 · 01 BRAND' }
const s02 = { from: 60, to: 240, name: 'V5 · 02 OPENING' }
const s03 = { from: 240, to: 375, name: 'V5 · 03 INTRODUCTION' }
const s04 = { from: 375, to: 510, name: 'V5 · 04 RESPONSIVE WIDGET' }
const s05 = { from: 510, to: 675, name: 'V5 · 05 USAGE' }
const s06 = { from: 675, to: 810, name: 'V5 · 06 RENEWAL' }
const s07 = { from: 810, to: 1020, name: 'V5 · 07 WORKING' }
const s08 = { from: 1020, to: 1140, name: 'V5 · 08 THEMES' }
const s09 = { from: 1140, to: 1260, name: 'V5 · 09 BENEFIT' }
const s10 = { from: 1260, to: 1440, name: 'V5 · 10 CTA' }

export const SCENES = { s01, s02, s03, s04, s05, s06, s07, s08, s09, s10 } as const
export const CUTS = [60, 240, 375, 510, 675, 810, 1020, 1140, 1260]
