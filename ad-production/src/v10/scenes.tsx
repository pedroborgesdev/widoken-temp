import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { ActivityShot, Camera, CaptureName, Shot, box, centre, lerpCamera } from '../v3/product'
import { BrandLockup, DemoLabel, Support } from '../v4/motion'
import { MiniMetric } from '../v6/scenes'
import {
  H3, H3_POP, OrientationMorph, Product, THEME_CATPPUCCIN, THEME_DARK,
  THEME_MONOKAI, THEME_NORD, Title, V3, V3_POP, camera, screenRect
} from '../v7/scenes'
import { COLORS, EASE, SAFE, SUPPORT_SAFE, mix, progress } from './tokens'

const H_HERO = camera(H3, 1320, 555, 3.7)
const V_USAGE_ENTRY = camera(V3, 835, 555, 3.05)
// Final usage layout: the real 54 × 198 pill lands at ~150 × 550 px,
// centred vertically with the 830 × 577 px popover.
const V_USAGE = camera(V3, 825, 545, 2.78)
const V_WORK_ENTRY = camera(V3, 1260, 750, 3.25)
const V_WORK = camera(V3, 1260, 550, 3.3)
const THEME_X = [250, 723, 1197, 1670]
const THEME_Y = 555
const THEME_SCALE = 1.90
const THEME_FIRST = camera(THEME_MONOKAI, THEME_X[0], THEME_Y, THEME_SCALE)
const BENEFIT = camera(H3, 960, 740, 4.1)
const CTA_BASE = camera(H3, 1445, 275, 2.36)
const CTA_POP = camera(H3_POP, CTA_BASE.atX, CTA_BASE.atY, CTA_BASE.scale)

const DOTS = [
  { color: COLORS.BRAND_PINK, startX: 1160, startY: 190, endX: 1054 },
  { color: COLORS.BRAND_ORANGE, startX: 1450, startY: 430, endX: 1231 },
  { color: COLORS.BRAND_GREEN, startX: 1110, startY: 760, endX: 1409 }
] as const

function ringDot(color: string, x: number, y: number, opacity = 1) {
  return <div style={{ position: 'absolute', left: x - 25, top: y - 25, width: 50, height: 50, borderRadius: 999, border: `9px solid ${color}`, opacity }} />
}

function frameClip(rect: { x: number; y: number; width: number; height: number }) {
  return `inset(${rect.y}px ${1920 - rect.x - rect.width}px ${1080 - rect.y - rect.height}px ${rect.x}px)`
}

function ConnectedPopover({ name, camera: shotCamera, open, fill, fade = false }: {
  name: typeof V3_POP | typeof H3_POP; camera: Camera; open: number; fill: number; fade?: boolean
}) {
  const full = screenRect(name, 'popover', shotCamera)
  const dynamic = { ...full, width: full.width * open }
  const bars = [box(name, 'bar-0'), box(name, 'bar-1')]
  const targets = [.81, .35]
  return <div style={{
    position: 'absolute', inset: 0, clipPath: frameClip(dynamic),
    // Chromium ignores a zero-width inset clip. Keep the popover capture
    // fully transparent at the exact closed state so it can never cover the
    // persistent base widget with its white canvas.
    opacity: open <= 0.0001 ? 0 : fade ? open : 1
  }}>
    <Shot name={name} camera={shotCamera} clipTo={full} />
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

function ActivityRing({ camera: shotCamera, frame, opacity }: { camera: Camera; frame: number; opacity: number }) {
  const cursor = screenRect(V3, 'cursor', shotCamera)
  const pad = 10
  const clip = { x: cursor.x - pad, y: cursor.y - pad, width: cursor.width + pad * 2, height: cursor.height + pad * 2 }
  return <div style={{ position: 'absolute', inset: 0, clipPath: frameClip(clip), opacity }}>
    <ActivityShot camera={shotCamera} frame={frame} from={31} variant="compact-3" />
  </div>
}

export function S01Problem() {
  const frame = useCurrentFrame()
  const exit = progress(frame, 91, 14, EASE.inQuint)
  const dotsIn = progress(frame, 89, 12, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <BrandLockup iconSize={45} wordSize={44} style={{ position: 'absolute', left: SAFE, top: 54, opacity: progress(frame, 4, 12) * (1 - exit) }} />
    <Title from={8} out={91} y={260} size={111}>VOCÊ SABE<br />QUANTO JÁ<br /><span style={{ color: COLORS.BRAND_PINK }}>USOU?</span></Title>
    <MiniMetric x={1060} y={158} label="CURSOR" target={81} color={COLORS.BRAND_PINK} from={18} out={94} />
    <MiniMetric x={1330} y={430} label="CLAUDE" target={64} color={COLORS.BRAND_ORANGE} from={27} out={94} />
    <MiniMetric x={1020} y={702} label="CHATGPT" target={47} color={COLORS.BRAND_GREEN} from={36} out={94} />
    {DOTS.map((dot) => <React.Fragment key={dot.color}>{ringDot(dot.color, dot.startX, dot.startY, dotsIn)}</React.Fragment>)}
    <DemoLabel style={{ position: 'absolute', right: SUPPORT_SAFE, bottom: 48, opacity: progress(frame, 44, 10) * (1 - exit) }} />
  </AbsoluteFill>
}

export function S02Solution() {
  const frame = useCurrentFrame()
  const assemble = progress(frame, 4, 34, EASE.inOutCubic)
  const reveal = progress(frame, 19, 24, EASE.inOutCubic)
  const morph = progress(frame, 77, 26, EASE.inOutCubic)
  const titleOut = progress(frame, 88, 12, EASE.inQuint)
  const productBounds = { x: 928, y: 329, width: 784, height: 452 }
  const visibleBounds = { ...productBounds, width: productBounds.width * reveal }
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Title from={2} out={88} y={246} size={106}>SUAS IAS.<br /><span style={{ color: COLORS.BRAND_GREEN }}>UM ÚNICO<br />WIDGET.</span></Title>
    {morph < 1 && <div style={{ position: 'absolute', inset: 0, clipPath: frameClip(visibleBounds), opacity: 1 - progress(frame, 76, 1) }}><Shot name={H3} camera={H_HERO} /></div>}
    {DOTS.map((dot) => <React.Fragment key={dot.color}>{ringDot(dot.color, mix(dot.startX, dot.endX, assemble), mix(dot.startY, 555, assemble), 1 - progress(frame, 31, 12, EASE.inOutCubic))}</React.Fragment>)}
    <div style={{ opacity: progress(frame, 76, 1) }}><OrientationMorph fromName={H3} fromCamera={H_HERO} toName={V3} toCamera={V_USAGE_ENTRY} amount={morph} /></div>
    <Support from={49} exitAt={91} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 136 }}>SUAS IAS. UMA SÓ VISÃO.</Support>
  </AbsoluteFill>
}

export function S03Usage() {
  const frame = useCurrentFrame()
  // Independent framing keeps the product capture untouched while placing
  // the popover at x=940, y=250, aligned to the widget's vertical centre.
  const popCamera = camera(V3_POP, 849, 738, 2.77)
  const popOpen = progress(frame, 27, 13, EASE.inOutCubic)
  const fill = progress(frame, 48, 34, EASE.inOutCubic)
  const close = progress(frame, 190, 13, EASE.inOutCubic)
  const handoff = progress(frame, 204, 20, EASE.inOutCubic)
  const settle = progress(frame, 0, 18, EASE.inOutCubic)
  const usageCamera = lerpCamera(V_USAGE_ENTRY, V_USAGE, settle)
  const baseCamera = lerpCamera(usageCamera, V_WORK_ENTRY, handoff)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Shot name={V3} camera={baseCamera} />
    <ConnectedPopover name={V3_POP} camera={popCamera} open={popOpen * (1 - close)} fill={fill} fade />
    <Title from={5} out={190} x={110} y={460} size={88} width={560}>ACOMPANHE<br />SEU <span style={{ color: COLORS.BRAND_PINK }}>USO.</span></Title>
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 48, opacity: progress(frame, 73, 10) * (1 - close) }} />
  </AbsoluteFill>
}

export function S04Working() {
  const frame = useCurrentFrame()
  const rise = progress(frame, 0, 22, EASE.outQuint)
  const entryCamera = lerpCamera(V_WORK_ENTRY, V_WORK, rise)
  const cursor = centre(V3, 'cursor')
  const closeCamera: Camera = { focusX: cursor.x, focusY: cursor.y, atX: 1270, atY: 190, scale: 4.85 }
  const zoomIn = progress(frame, 53, 25, EASE.inOutCubic)
  const zoomOut = progress(frame, 134, 28, EASE.inOutCubic)
  const zoom = zoomIn * (1 - zoomOut)
  const cameraNow = lerpCamera(entryCamera, closeCamera, zoom)
  const active = progress(frame, 31, 12, EASE.inOutCubic) * (1 - progress(frame, 164, 12, EASE.inOutCubic))
  const titleIn = progress(frame, 16, 14)
  const titleOut = progress(frame, 119, 12, EASE.inQuint)
  const answer = progress(frame, 162, 13)
  const morph = progress(frame, 197, 24, EASE.inOutCubic)
  const morphStarted = progress(frame, 197, 1)
  const copyOut = progress(frame, 191, 10, EASE.inQuint)
  const activeRect = screenRect(V3, 'cursor', cameraNow)
  const labelIn = progress(frame, 37, 12)
  const labelOut = progress(frame, 143, 10)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ opacity: 1 - morphStarted }}>
      <Shot name={V3} camera={cameraNow} />
      <ActivityRing camera={cameraNow} frame={frame} opacity={active} />
    </div>
    <div style={{
      position: 'absolute', left: SAFE, top: 185, width: 820,
      fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: 96,
      lineHeight: .90, letterSpacing: '-.047em', color: COLORS.INK,
      opacity: titleIn * (1 - titleOut) * (1 - copyOut),
      transform: `translateY(${mix(30, 0, titleIn) + titleOut * 18}px)`
    }}>SUA IA ESTÁ<br /><span style={{ color: COLORS.BRAND_ORANGE }}>TRABALHANDO?</span></div>
    <div style={{
      position: 'absolute', left: activeRect.x + activeRect.width + 32, top: activeRect.y + activeRect.height / 2 - 24,
      width: 300, opacity: labelIn * (1 - labelOut) * (1 - copyOut),
      transform: `translateY(${mix(14, 0, labelIn)}px)`
    }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 25, fontWeight: 700, letterSpacing: '.13em', color: COLORS.BRAND_ORANGE }}>EM ATIVIDADE</div>
      <div style={{ width: 270, height: 7, marginTop: 12, background: COLORS.BRAND_ORANGE, transformOrigin: 'left', transform: `scaleX(${progress(frame, 43, 18)})` }} />
    </div>
    <div style={{ position: 'absolute', left: SAFE, top: 280, fontFamily: 'Archivo, sans-serif', fontSize: 130, fontWeight: 900, letterSpacing: '-.047em', color: COLORS.INK, opacity: answer * (1 - copyOut), transform: `translateY(${mix(25, 0, answer)}px)` }}>VOCÊ <span style={{ color: COLORS.BRAND_GREEN }}>SABE.</span></div>
    <Support from={170} exitAt={193} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 110 }}>IDLE → WORKING → IDLE.</Support>
    <div style={{ opacity: morphStarted }}><OrientationMorph fromName={V3} fromCamera={V_WORK} toName={THEME_MONOKAI} toCamera={THEME_FIRST} amount={morph} /></div>
  </AbsoluteFill>
}

const THEMES = [
  [THEME_MONOKAI, 'MONOKAI BLACK'], [THEME_DARK, 'DARK'],
  [THEME_NORD, 'NORD'], [THEME_CATPPUCCIN, 'CATPPUCCIN MOCHA']
] as const

export function S05Themes() {
  const frame = useCurrentFrame()
  const handoff = progress(frame, 158, 21, EASE.inOutCubic)
  const supportingOut = progress(frame, 150, 14, EASE.inOutCubic)
  const underlineIn = progress(frame, 55, 9)
  const underlineMove = progress(frame, 94, 20, EASE.inOutCubic)
  const underlineOut = progress(frame, 145, 12, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ opacity: 1 - supportingOut }}><Title from={4} out={150} x={90} y={70} size={94} align="center">DO SEU <span style={{ color: COLORS.BRAND_PURPLE }}>JEITO.</span></Title></div>
    {THEMES.map(([name, label], index) => {
      const widgetStart = index === 0 ? 0 : 8 + (index - 1) * 3
      const widgetIn = index === 0 ? 1 : progress(frame, widgetStart, 15, EASE.inOutCubic)
      const labelIn = progress(frame, 4 + index * 5, 11, EASE.inOutCubic)
      const firstCamera = lerpCamera(THEME_FIRST, BENEFIT, handoff)
      const shotCamera = index === 0 ? firstCamera : camera(name, THEME_X[index], THEME_Y, THEME_SCALE)
      const opacity = index === 0 ? 1 : widgetIn * (1 - supportingOut)
      return <React.Fragment key={name}>
        <Product name={name} camera={shotCamera} opacity={opacity} scaleFrom={index === 0 ? 1 : .96} xFrom={index === 0 ? 0 : 46} />
        <div style={{
          position: 'absolute', left: THEME_X[index] - 215, top: 748, width: 430,
          textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 23, fontWeight: 700,
          letterSpacing: '.055em', color: COLORS.INK,
          opacity: labelIn * widgetIn * (1 - supportingOut), transform: `translateY(${mix(12, 0, labelIn)}px)`
        }}>{label}</div>
      </React.Fragment>
    })}
    <div style={{
      position: 'absolute', left: mix(THEME_X[0], THEME_X[2], underlineMove) - 115, top: 793,
      width: 230, height: 6, background: COLORS.BRAND_PURPLE,
      transformOrigin: 'center', transform: `scaleX(${underlineIn * (1 - underlineOut)})`
    }} />
  </AbsoluteFill>
}

export function S06Benefit() {
  const frame = useCurrentFrame()
  const first = progress(frame, 5, 13)
  const second = progress(frame, 24, 13)
  const out = progress(frame, 83, 12, EASE.inQuint)
  const handoff = progress(frame, 83, 21, EASE.inOutCubic)
  const cameraNow = lerpCamera(BENEFIT, CTA_BASE, handoff)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', left: 120, right: 120, top: 165, textAlign: 'center', fontFamily: 'Archivo, sans-serif', fontSize: 118, lineHeight: .92, fontWeight: 900, letterSpacing: '-.047em', color: COLORS.INK, opacity: 1 - out }}>
      <span style={{ opacity: first, display: 'inline-block', transform: `translateY(${mix(24, 0, first)}px)` }}>MENOS ABAS.</span><br />
      <span style={{ color: COLORS.BRAND_GREEN, opacity: second, display: 'inline-block', transform: `translateY(${mix(24, 0, second)}px)` }}>MAIS FOCO.</span>
    </div>
    <div style={{ position: 'absolute', left: 570, top: 475, width: 780, height: 10, background: COLORS.BRAND_GREEN, transformOrigin: 'center', transform: `scaleX(${second * (1 - out)})` }} />
    <Shot name={H3} camera={cameraNow} />
  </AbsoluteFill>
}

export function S07Cta() {
  const frame = useCurrentFrame()
  const logo = progress(frame, 4, 12)
  const title = progress(frame, 12, 14)
  const pop = progress(frame, 22, 13, EASE.inOutCubic)
  const button = progress(frame, 45, 15, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <BrandLockup iconSize={54} wordSize={53} style={{ position: 'absolute', left: SAFE, top: 66, opacity: logo, transform: `translateY(${mix(18, 0, logo)}px)` }} />
    <div style={{ position: 'absolute', left: SAFE, top: 224, fontFamily: 'Archivo, sans-serif', fontSize: 95, fontWeight: 900, lineHeight: .90, letterSpacing: '-.047em', color: COLORS.INK, opacity: title, transform: `translateY(${mix(22, 0, title)}px)` }}>SUAS IAS,<br /><span style={{ color: COLORS.BRAND_GREEN }}>À VISTA.</span></div>
    <Shot name={H3} camera={CTA_BASE} />
    <ConnectedPopover name={H3_POP} camera={CTA_POP} open={pop} fill={progress(frame, 34, 24, EASE.inOutCubic)} />
    <div style={{ position: 'absolute', left: SAFE, top: 540, width: 740, height: 130, overflow: 'hidden', background: COLORS.BRAND_GREEN, transformOrigin: 'left', transform: `scaleX(${button})` }}>
      <div style={{ position: 'absolute', left: 34, top: 31, fontFamily: 'Archivo, sans-serif', fontSize: 47, fontWeight: 900, color: COLORS.INK, whiteSpace: 'nowrap', opacity: progress(frame, 50, 9) }}>CONHEÇA O WIDOKEN →</div>
    </div>
    <div style={{ position: 'absolute', left: SAFE, top: 707, width: 740, height: 8, background: COLORS.INK, transformOrigin: 'left', transform: `scaleX(${progress(frame, 55, 16)})` }} />
  </AbsoluteFill>
}
