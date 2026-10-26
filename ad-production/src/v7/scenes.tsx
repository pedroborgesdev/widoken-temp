import React from 'react'
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { ActivityShot, Camera, CaptureName, Shot, box, capture, centre, lerpCamera } from '../v3/product'
import { BrandLockup, DemoLabel, Support } from '../v4/motion'
import { S01Problem as V6Problem } from '../v6/scenes'
import { COLORS, EASE, SAFE, SUPPORT_SAFE, mix, progress } from './tokens'

export const H3 = 'widget-horizontal-3' as const
export const V3 = 'widget-vertical-3' as const
export const V3_POP = 'widget-vertical-popover-cursor-3' as const
export const H3_POP = 'widget-horizontal-popover-cursor-3' as const
export const THEME_MONOKAI = 'widget-horizontal-3-theme-monokai' as const
export const THEME_DARK = 'widget-horizontal-3-theme-dark' as const
export const THEME_NORD = 'widget-horizontal-3-theme-nord' as const
export const THEME_CATPPUCCIN = 'widget-horizontal-3-theme-catppuccin' as const

export const camera = (name: CaptureName, atX: number, atY: number, scale: number): Camera => {
  const point = centre(name, 'pill')
  return { focusX: point.x, focusY: point.y, atX, atY, scale }
}

const H_HERO = camera(H3, 1320, 555, 3.7)
export const V_INTRO = camera(V3, 1320, 540, 3.3)
export const V_USAGE = camera(V3, 835, 555, 3.05)
export const V_WORK = camera(V3, 1260, 555, 3.25)
const THEME_X = [255, 725, 1195, 1665]
const THEME_Y = 555
const THEME_SCALE = 1.86
const THEME_FIRST = camera(THEME_MONOKAI, THEME_X[0], THEME_Y, THEME_SCALE)

export function Product({ name, camera: shotCamera, opacity = 1, scaleFrom = .96, xFrom = 0 }: {
  name: CaptureName; camera: Camera; opacity?: number; scaleFrom?: number; xFrom?: number
}) {
  return <div style={{
    position: 'absolute', inset: 0, opacity,
    transformOrigin: `${shotCamera.atX}px ${shotCamera.atY}px`,
    transform: `translateX(${(1 - opacity) * xFrom}px) scale(${mix(scaleFrom, 1, opacity)})`
  }}><Shot name={name} camera={shotCamera} /></div>
}

export function screenRect(name: CaptureName, node: string, shotCamera: Camera) {
  const target = elementBox(name, node)
  return {
    x: shotCamera.atX + (target.x - shotCamera.focusX) * shotCamera.scale,
    y: shotCamera.atY + (target.y - shotCamera.focusY) * shotCamera.scale,
    width: target.width * shotCamera.scale,
    height: target.height * shotCamera.scale
  }
}

function elementBox(name: CaptureName, node: string) {
  if (node !== 'app') return box(name, node)
  const vertical = name.startsWith('widget-vertical')
  return vertical
    ? { x: 40, y: 202, width: 42, height: 42 }
    : { x: 202, y: 40, width: 42, height: 42 }
}

function MovingCrop({ name, node, fromRect, toRect, amount }: {
  name: CaptureName
  node: string
  fromRect: { x: number; y: number; width: number; height: number }
  toRect: { x: number; y: number; width: number; height: number }
  amount: number
}) {
  const spec = capture(name)
  const source = elementBox(name, node)
  const x = mix(fromRect.x, toRect.x, amount)
  const y = mix(fromRect.y, toRect.y, amount)
  const width = mix(fromRect.width, toRect.width, amount)
  const height = mix(fromRect.height, toRect.height, amount)
  const scale = width / source.width
  return <div style={{ position: 'absolute', left: x, top: y, width, height, overflow: 'hidden', borderRadius: 999 }}>
    <Img src={staticFile(spec.file)} style={{ position: 'absolute', left: -source.x * scale, top: -source.y * scale, width: spec.clip.width * scale, height: spec.clip.height * scale, maxWidth: 'none' }} />
  </div>
}

/** A single capsule changes axis while every real icon travels to its new slot without rotating. */
export function OrientationMorph({ fromName, fromCamera, toName, toCamera, amount }: {
  fromName: CaptureName; fromCamera: Camera; toName: CaptureName; toCamera: Camera; amount: number
}) {
  const eased = EASE.inOutCubic(amount)
  const fromPill = screenRect(fromName, 'pill', fromCamera)
  const toPill = screenRect(toName, 'pill', toCamera)
  const pill = {
    x: mix(fromPill.x, toPill.x, eased), y: mix(fromPill.y, toPill.y, eased),
    width: mix(fromPill.width, toPill.width, eased), height: mix(fromPill.height, toPill.height, eased)
  }
  return <AbsoluteFill>
    <div style={{ position: 'absolute', left: pill.x, top: pill.y, width: pill.width, height: pill.height, borderRadius: 999, background: '#222' }} />
    {['cursor', 'claude', 'openai', 'app'].map((provider) => {
      const target = screenRect(toName, provider, toCamera)
      const source = screenRect(fromName, provider, fromCamera)
      return <MovingCrop key={provider} name={fromName} node={provider} fromRect={source} toRect={target} amount={eased} />
    })}
  </AbsoluteFill>
}

export function UsagePopover({ opacity, fill, camera: shotCamera }: { opacity: number; fill: number; camera: Camera }) {
  const bars = [box(V3_POP, 'bar-0'), box(V3_POP, 'bar-1')]
  const popover = box(V3_POP, 'popover')
  const targets = [.81, .35]
  const clipTo = screenRect(V3_POP, 'popover', shotCamera)
  return <div style={{
    position: 'absolute', inset: 0, opacity,
    transformOrigin: `${clipTo.x}px ${clipTo.y + clipTo.height / 2}px`,
    transform: `translateX(${mix(-18, 0, opacity)}px) scale(${mix(.98, 1, opacity)})`
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

export function HorizontalUsagePopover({ opacity, fill, camera: shotCamera }: { opacity: number; fill: number; camera: Camera }) {
  const bars = [box(H3_POP, 'bar-0'), box(H3_POP, 'bar-1')]
  const popover = box(H3_POP, 'popover')
  const targets = [.81, .35]
  const clipTo = screenRect(H3_POP, 'popover', shotCamera)
  return <div style={{ position: 'absolute', inset: 0, opacity, transformOrigin: `${clipTo.x + clipTo.width / 2}px ${clipTo.y}px`, transform: `scale(${mix(.97, 1, opacity)})` }}>
    <Shot name={H3_POP} camera={shotCamera} clipTo={clipTo} />
    {bars.map((bar, index) => {
      const revealed = targets[index] * fill
      const left = shotCamera.atX + (bar.x - shotCamera.focusX) * shotCamera.scale
      const top = shotCamera.atY + (bar.y - shotCamera.focusY) * shotCamera.scale
      return <div key={index} style={{ position: 'absolute', left: left + bar.width * shotCamera.scale * revealed, top, width: bar.width * shotCamera.scale * (1 - revealed), height: bar.height * shotCamera.scale, borderRadius: 999, background: '#49483e' }} />
    })}
  </div>
}

export function Title({ children, from = 0, out, x = SAFE, y = 210, size = 104, width = 720, color = COLORS.INK, align = 'left' }: {
  children: React.ReactNode; from?: number; out?: number; x?: number; y?: number; size?: number; width?: number; color?: string; align?: 'left' | 'center'
}) {
  const frame = useCurrentFrame()
  const enter = progress(frame, from, 14)
  const exit = out === undefined ? 0 : progress(frame, out, 10, EASE.inQuint)
  return <div style={{
    position: 'absolute', left: x, top: y, width: align === 'center' ? 1920 - x * 2 : width,
    textAlign: align, fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: size,
    lineHeight: .90, letterSpacing: '-.047em', color, opacity: enter * (1 - exit),
    transform: `translateY(${mix(30, 0, enter) + exit * 18}px)`
  }}>{children}</div>
}

export function S01Problem() {
  return <V6Problem />
}

export function S02Solution() {
  const frame = useCurrentFrame()
  const product = progress(frame, 26, 18, EASE.inOutCubic)
  const morph = progress(frame, 79, 24, EASE.inOutCubic)
  const titleOut = progress(frame, 88, 12, EASE.inQuint)
  const dots = [COLORS.BRAND_PINK, COLORS.BRAND_ORANGE, COLORS.BRAND_GREEN]
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Title from={5} out={88} y={246} size={106}>SUAS IAS.<br /><span style={{ color: COLORS.BRAND_GREEN }}>UM ÚNICO<br />WIDGET.</span></Title>
    {dots.map((color, index) => {
      const p = progress(frame, 8 + index * 4, 28, EASE.inOutCubic)
      const dotIn = progress(frame, 4 + index * 4, 10)
      const startX = [1160, 1450, 1110][index]
      const startY = [190, 430, 760][index]
      const endX = [1120, 1298, 1476][index]
      return <div key={color} style={{ position: 'absolute', left: mix(startX, endX, p) - 25, top: mix(startY, 530, p) - 25, width: 50, height: 50, borderRadius: 999, border: `9px solid ${color}`, opacity: dotIn * (1 - product) * (1 - titleOut) }} />
    })}
    <div style={{ opacity: product }}><OrientationMorph fromName={H3} fromCamera={H_HERO} toName={V3} toCamera={V_INTRO} amount={morph} /></div>
    <Support from={51} exitAt={91} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 136 }}>TRÊS PROVEDORES. UMA LEITURA.</Support>
  </AbsoluteFill>
}

export function S03Usage() {
  const frame = useCurrentFrame()
  const align = progress(frame, 0, 20, EASE.inOutCubic)
  const baseCamera = lerpCamera(V_INTRO, V_USAGE, align)
  const popCamera = camera(V3_POP, V_USAGE.atX, V_USAGE.atY, V_USAGE.scale)
  const highlight = progress(frame, 18, 12)
  const pop = progress(frame, 31, 15, EASE.inOutCubic)
  const fill = progress(frame, 51, 34, EASE.inOutCubic)
  const renewal = progress(frame, 96, 14)
  const close = progress(frame, 205, 17, EASE.inOutCubic)
  const shown = pop * (1 - close)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Product name={V3} camera={baseCamera} opacity={1} scaleFrom={1} />
    <UsagePopover opacity={shown} fill={fill} camera={popCamera} />
    <Title from={5} out={205} y={225} size={88} width={595}>ACOMPANHE<br />SEU <span style={{ color: COLORS.BRAND_PINK }}>USO.</span></Title>
    <div style={{ position: 'absolute', left: SAFE, top: 520, opacity: renewal * (1 - close), transform: `translateY(${mix(18, 0, renewal)}px)` }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, letterSpacing: '.09em', color: COLORS.SOFT }}>PERCENTUAL UTILIZADO</div>
      <div style={{ marginTop: 14, width: 500, height: 7, background: COLORS.BRAND_GREEN, transformOrigin: 'left', transform: `scaleX(${renewal})` }} />
      <div style={{ marginTop: 22, fontFamily: 'Archivo, sans-serif', fontSize: 43, fontWeight: 900, color: COLORS.INK }}>RENOVA EM 11 DIAS.</div>
    </div>
    <div style={{ position: 'absolute', left: 700, top: 195, width: 7, height: 200, background: COLORS.BRAND_PINK, transformOrigin: 'top', transform: `scaleY(${highlight * (1 - close)})` }} />
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 48, opacity: progress(frame, 73, 10) * (1 - close) }} />
  </AbsoluteFill>
}

export function S04Working() {
  const frame = useCurrentFrame()
  const move = progress(frame, 0, 20, EASE.inOutCubic)
  const cursor = centre(V3, 'cursor')
  const closeCamera: Camera = { focusX: cursor.x, focusY: cursor.y, atX: 1260, atY: 235, scale: 4.25 }
  const zoomIn = progress(frame, 55, 26, EASE.inOutCubic)
  const zoomOut = progress(frame, 126, 26, EASE.inOutCubic)
  const zoom = zoomIn * (1 - zoomOut)
  const idleCamera = lerpCamera(V_USAGE, V_WORK, move)
  const cameraNow = lerpCamera(idleCamera, closeCamera, zoom)
  const active = progress(frame, 26, 14) * (1 - progress(frame, 160, 14, EASE.inOutCubic))
  const titleOut = progress(frame, 112, 12, EASE.inQuint)
  const answer = progress(frame, 158, 13)
  const morph = progress(frame, 196, 24, EASE.inOutCubic)
  const morphStarted = progress(frame, 196, 1)
  const copyOut = progress(frame, 190, 10, EASE.inQuint)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ opacity: 1 - morphStarted }}>
      <Shot name={V3} camera={cameraNow} opacity={1 - active} />
      <ActivityShot camera={cameraNow} frame={frame} from={26} opacity={active} variant="compact-3" />
    </div>
    <div style={{ opacity: (1 - titleOut) * (1 - copyOut) }}><Title from={4} out={112} y={185} size={96}>SUA IA ESTÁ<br /><span style={{ color: COLORS.BRAND_ORANGE }}>TRABALHANDO?</span></Title></div>
    <div style={{ position: 'absolute', left: 1060, top: 72, opacity: progress(frame, 38, 12) * (1 - progress(frame, 142, 10)) * (1 - copyOut) }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 25, fontWeight: 700, letterSpacing: '.13em', color: COLORS.BRAND_ORANGE }}>EM ATIVIDADE</div>
      <div style={{ width: 310, height: 7, marginTop: 13, background: COLORS.BRAND_ORANGE, transformOrigin: 'left', transform: `scaleX(${progress(frame, 45, 18)})` }} />
    </div>
    <div style={{ position: 'absolute', left: SAFE, top: 280, fontFamily: 'Archivo, sans-serif', fontSize: 130, fontWeight: 900, letterSpacing: '-.047em', color: COLORS.INK, opacity: answer * (1 - copyOut), transform: `translateY(${mix(25, 0, answer)}px)` }}>VOCÊ <span style={{ color: COLORS.BRAND_GREEN }}>SABE.</span></div>
    <Support from={166} exitAt={192} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 110 }}>IDLE → WORKING → IDLE.</Support>
    <div style={{ opacity: morphStarted }}><OrientationMorph fromName={V3} fromCamera={V_WORK} toName={THEME_MONOKAI} toCamera={THEME_FIRST} amount={morph} /></div>
  </AbsoluteFill>
}

const THEMES = [
  [THEME_MONOKAI, 'MONOKAI BLACK'],
  [THEME_DARK, 'DARK'],
  [THEME_NORD, 'NORD'],
  [THEME_CATPPUCCIN, 'CATPPUCCIN MOCHA']
] as const

export function S05Themes() {
  const frame = useCurrentFrame()
  const out = progress(frame, 164, 16, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Title from={4} out={164} x={90} y={70} size={94} align="center">DO SEU <span style={{ color: COLORS.BRAND_PURPLE }}>JEITO.</span></Title>
    {THEMES.map(([name, label], index) => {
      const enter = index === 0 ? 1 : progress(frame, 8 + (index - 1) * 3, 15, EASE.inOutCubic)
      const visible = enter * (1 - out)
      const selected = progress(frame, 58 + index * 27, 9) * (1 - progress(frame, 85 + index * 27, 9))
      return <React.Fragment key={name}>
        <Product name={name} camera={camera(name, THEME_X[index], THEME_Y, THEME_SCALE)} opacity={visible} scaleFrom={.96} xFrom={index === 0 ? 0 : 46} />
        <div style={{ position: 'absolute', left: THEME_X[index] - 205, top: 748, width: 410, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 20, fontWeight: 700, letterSpacing: '.075em', color: COLORS.INK, opacity: visible }}>{label}</div>
        <div style={{ position: 'absolute', left: THEME_X[index] - 105, top: 790, width: 210, height: 6, background: COLORS.BRAND_PURPLE, transformOrigin: 'center', transform: `scaleX(${selected * (1 - out)})` }} />
      </React.Fragment>
    })}
  </AbsoluteFill>
}

export function S06Benefit() {
  const frame = useCurrentFrame()
  const first = progress(frame, 5, 13)
  const second = progress(frame, 24, 13)
  const product = progress(frame, 35, 15)
  const out = progress(frame, 94, 11, EASE.inQuint)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', left: 120, right: 120, top: 165, textAlign: 'center', fontFamily: 'Archivo, sans-serif', fontSize: 118, lineHeight: .92, fontWeight: 900, letterSpacing: '-.047em', color: COLORS.INK, opacity: 1 - out }}>
      <span style={{ opacity: first, display: 'inline-block', transform: `translateY(${mix(24, 0, first)}px)` }}>MENOS ABAS.</span><br />
      <span style={{ color: COLORS.BRAND_GREEN, opacity: second, display: 'inline-block', transform: `translateY(${mix(24, 0, second)}px)` }}>MAIS FOCO.</span>
    </div>
    <div style={{ position: 'absolute', left: 570, top: 475, width: 780, height: 10, background: COLORS.BRAND_GREEN, transformOrigin: 'center', transform: `scaleX(${second * (1 - out)})` }} />
    <Product name={H3} camera={camera(H3, 960, 740, 4.1)} opacity={product * (1 - out)} scaleFrom={.97} />
  </AbsoluteFill>
}

export function S07Cta() {
  const frame = useCurrentFrame()
  const logo = progress(frame, 4, 12)
  const title = progress(frame, 12, 14)
  const product = progress(frame, 19, 14)
  const pop = progress(frame, 29, 14, EASE.inOutCubic)
  const button = progress(frame, 45, 15, EASE.inOutCubic)
  const ctaCamera = camera(H3_POP, 1425, 275, 2.48)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <BrandLockup iconSize={54} wordSize={53} style={{ position: 'absolute', left: SAFE, top: 66, opacity: logo, transform: `translateY(${mix(18, 0, logo)}px)` }} />
    <div style={{ position: 'absolute', left: SAFE, top: 224, fontFamily: 'Archivo, sans-serif', fontSize: 95, fontWeight: 900, lineHeight: .90, letterSpacing: '-.047em', color: COLORS.INK, opacity: title, transform: `translateY(${mix(22, 0, title)}px)` }}>SUAS IAS,<br /><span style={{ color: COLORS.BRAND_GREEN }}>À VISTA.</span></div>
    <div style={{ position: 'absolute', inset: 0, transform: `translateX(${mix(65, 0, product)}px)` }}>
      <Product name={H3} camera={camera(H3, 1425, 275, 2.48)} opacity={product} scaleFrom={1} />
    </div>
    <HorizontalUsagePopover opacity={pop} fill={progress(frame, 40, 24, EASE.inOutCubic)} camera={ctaCamera} />
    <div style={{ position: 'absolute', left: SAFE, top: 545, width: 690, height: 122, overflow: 'hidden', background: COLORS.BRAND_GREEN, transformOrigin: 'left', transform: `scaleX(${button})` }}>
      <div style={{ position: 'absolute', left: 34, top: 31, fontFamily: 'Archivo, sans-serif', fontSize: 44, fontWeight: 900, color: COLORS.INK, whiteSpace: 'nowrap', opacity: progress(frame, 50, 9) }}>CONHEÇA O WIDOKEN →</div>
    </div>
    <div style={{ position: 'absolute', left: SAFE, top: 704, width: 690, height: 7, background: COLORS.INK, transformOrigin: 'left', transform: `scaleX(${progress(frame, 55, 16)})` }} />
  </AbsoluteFill>
}
