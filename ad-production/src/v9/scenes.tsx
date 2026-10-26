import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Camera, box, lerpCamera, Shot } from '../v3/product'
import { DemoLabel } from '../v4/motion'
import { Product, Title, V3, V3_POP, V_INTRO, camera, screenRect } from '../v7/scenes'
import { S01Problem, S02Solution, S04Working, S05Themes, S06Benefit, S07Cta } from '../v8/scenes'
import { COLORS, EASE, SAFE, SUPPORT_SAFE, mix, progress } from './tokens'

/**
 * V9 — RECOMPOSIÇÃO DA CENA DE USO.
 *
 * Only S03Usage is restaged here. Every other scene is re-exported from the
 * V8 cut untouched (S01Problem / S02Solution / S06Benefit come from V7 via
 * V8), so the Working entry, theme row and CTA behaviour in S04–S07 stay
 * identical.
 *
 * Measured capture geometry (src/v2/captures.json, CSS px, DPR 6):
 *   widget-vertical-3 · pill 54×198 at (34,52), icons 42×42, clip 122×302
 *   widget-vertical-popup-cursor-3 · popover 300×208.16 at (112,52)
 * Every screen coordinate below derives from those boxes at one shared
 * scale so the widget and the popover read as a single composed object.
 * Real UI labels stay in English exactly as the product renders them; the
 * badge "LEFT"/"RIGHT" beside each limit marks the primary/secondary limit
 * slot, it is not a remaining balance, and nothing is translated or invented.
 */

export { S01Problem, S02Solution, S04Working, S05Themes, S06Benefit, S07Cta }

/* One shared scale keeps icon size identical on both product shots. */
const USAGE_SCALE = 2.2

/* Widget seat: focus is the capture's pill centre (camera() aims at 'pill'),
 * so the pill's right edge lands at 1045.4, i.e. 24.6 px before the popover
 * (inside the requested 20–30 px gap) and the pill's vertical centre sits at
 * 549, in line with the frame's optical centreline. */
const WIDGET = camera(V3, 986, 549, USAGE_SCALE)

/* Popover seat: top-left edge anchored at (1070, 320), rendering 660 wide ×
 * 458 tall at the capture's true aspect — inside the requested ~700×400
 * envelope, never near the frame top or right edge. */
const POP_BOX = box(V3_POP, 'popover')
const USAGE_POP: Camera = {
  focusX: POP_BOX.x + POP_BOX.width / 2,
  focusY: POP_BOX.y + POP_BOX.height / 2,
  atX: 1070 + (POP_BOX.width / 2) * USAGE_SCALE,
  atY: 320 + (POP_BOX.height / 2) * USAGE_SCALE,
  scale: USAGE_SCALE
}

/* Opening origin: the selected icon's centre and the popover's vertical
 * centre share a y in capture space, so scaling from the popover's left
 * centre makes the animation visually start beside the icon. */
const POP_ORIGIN = screenRect(V3_POP, 'popover', USAGE_POP)

/** The real popover screenshot, matted by two bars the same way V7 does it,
 * with the V9 entrance: scale .96 → 1 straight into opacity. */
function UsagePopoverV9({ opacity, fill, camera: shotCamera }: { opacity: number; fill: number; camera: Camera }) {
  const bars = [box(V3_POP, 'bar-0'), box(V3_POP, 'bar-1')]
  const targets = [.81, .35]
  const clipTo = screenRect(V3_POP, 'popover', shotCamera)
  return <div style={{
    position: 'absolute', inset: 0, opacity,
    transformOrigin: `${POP_ORIGIN.x}px ${POP_ORIGIN.y}px`,
    transform: `scale(${mix(.96, 1, opacity)})`
  }}>
    <Shot name={V3_POP} camera={shotCamera} clipTo={clipTo} />
    {bars.map((bar, index) => {
      const revealed = targets[index] * fill
      const left = shotCamera.atX + (bar.x - shotCamera.focusX) * shotCamera.scale
      const top = shotCamera.atY + (bar.y - shotCamera.focusY) * shotCamera.scale
      return <div key={index} style={{
        position: 'absolute', left: left + bar.width * shotCamera.scale * revealed, top,
        width: bar.width * shotCamera.scale * (1 - revealed), height: bar.height * shotCamera.scale,
        borderRadius: 999, background: '#49483e'
      }} />
    })}
  </div>
}

export function S03Usage() {
  const frame = useCurrentFrame()
  /* 7.0–8.4s: the widget glides from S02's morph pose (V_INTRO, kept in sync
   * with v8/scenes) to its seat and settles before the popover opens. */
  const align = progress(frame, 0, 42, EASE.inOutCubic)
  /* 13.8–14.5s: glide on to the exact V8 Working entry pose with which
   * S04Working opens, so the cut at 435 stays frame-continuous. */
  const handoff = progress(frame, 205, 20, EASE.inOutCubic)
  const settledCamera = lerpCamera(V_INTRO, WIDGET, align)
  const baseCamera = lerpCamera(settledCamera, camera(V3, 1260, 750, 3.25), handoff)
  /* 8.3s: a discreet 1.02 pulse riding exactly on the selected icon, ended
   * by the popover, is the only highlight — no rings, no glow, no overlay. */
  const highlight = Math.sin(Math.PI * progress(frame, 40, 8)) * .02
  const pop = progress(frame, 45, 18, EASE.inOutCubic)
  const fill = progress(frame, 56, 60, EASE.inOutCubic)
  const close = progress(frame, 190, 18, EASE.inOutCubic)
  const shown = pop * (1 - close)
  const support = progress(frame, 20, 14)
  /* The pulse origin follows the selected icon while the widget moves. */
  const iconScreen = screenRect(V3, 'cursor', baseCamera)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{
      position: 'absolute', inset: 0,
      transformOrigin: `${iconScreen.x}px ${iconScreen.y}px`,
      transform: `scale(${1 + highlight})`
    }}>
      <Product name={V3} camera={baseCamera} opacity={1} scaleFrom={1} />
    </div>
    <UsagePopoverV9 opacity={shown} fill={fill} camera={USAGE_POP} />
    <Title from={5} out={205} x={SAFE} y={420} size={100} width={760}>ACOMPANHE<br />SEU <span style={{ color: COLORS.BRAND_PINK }}>USO.</span></Title>
    <div style={{
      position: 'absolute', left: SAFE, top: 664,
      fontFamily: 'Space Mono, monospace', fontSize: 23, fontWeight: 700, letterSpacing: '.085em', color: COLORS.SOFT,
      opacity: support * (1 - close), transform: `translateY(${mix(14, 0, support)}px)`
    }}>PERCENTUAIS E RENOVAÇÃO EM UM SÓ LUGAR.</div>
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 48, opacity: progress(frame, 73, 10) * (1 - close) }} />
  </AbsoluteFill>
}
