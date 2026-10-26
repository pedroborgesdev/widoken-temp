import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { ActivityShot, Camera, CaptureName, Shot, box, centre, lerpCamera } from '../v3/product'
import { BrandLockup, DemoLabel, Support } from '../v4/motion'
import { COLORS, EASE, SAFE, SUPPORT_SAFE, mix, progress } from './tokens'

const H3 = 'widget-horizontal-3' as const
const H3_POP = 'widget-horizontal-popover-cursor-3' as const
const THEME_A = 'widget-horizontal-3-theme-monokai' as const
const THEME_B = 'widget-horizontal-3-theme-catppuccin' as const

const camera = (name: CaptureName, atX: number, atY: number, scale: number): Camera => {
  const point = centre(name, 'pill')
  return { focusX: point.x, focusY: point.y, atX, atY, scale }
}

const HERO = camera(H3, 1320, 555, 3.7)
const USAGE = camera(H3_POP, 1320, 258, 2.65)
const USAGE_BASE = camera(H3, 1320, 258, 2.65)

function Product({ name, camera: shotCamera, opacity = 1, scaleFrom = .96, xFrom = 0 }: {
  name: CaptureName; camera: Camera; opacity?: number; scaleFrom?: number; xFrom?: number
}) {
  return <div style={{
    position: 'absolute', inset: 0, opacity,
    transformOrigin: `${shotCamera.atX}px ${shotCamera.atY}px`,
    transform: `translateX(${(1 - opacity) * xFrom}px) scale(${mix(scaleFrom, 1, opacity)})`
  }}><Shot name={name} camera={shotCamera} /></div>
}

function UsageProduct({ opacity, fill, camera: shotCamera = USAGE }: { opacity: number; fill: number; camera?: Camera }) {
  const bars = [box(H3_POP, 'bar-0'), box(H3_POP, 'bar-1')]
  const popover = box(H3_POP, 'popover')
  const targets = [.81, .35]
  const clipTo = {
    x: shotCamera.atX + (popover.x - shotCamera.focusX) * shotCamera.scale,
    y: shotCamera.atY + (popover.y - shotCamera.focusY) * shotCamera.scale,
    width: popover.width * shotCamera.scale,
    height: popover.height * shotCamera.scale
  }
  return <div style={{
    position: 'absolute', inset: 0, opacity,
    transformOrigin: `${clipTo.x + clipTo.width / 2}px ${clipTo.y}px`,
    transform: `scale(${mix(.96, 1, opacity)})`
  }}>
    <Shot name={H3_POP} camera={shotCamera} clipTo={clipTo} />
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

function Title({ children, from = 0, out, x = SAFE, y = 210, size = 104, color = COLORS.INK, align = 'left' }: {
  children: React.ReactNode; from?: number; out?: number; x?: number; y?: number; size?: number; color?: string; align?: 'left' | 'center'
}) {
  const frame = useCurrentFrame()
  const enter = progress(frame, from, 14)
  const exit = out === undefined ? 0 : progress(frame, out, 10, EASE.inQuint)
  return <div style={{
    position: 'absolute', left: x, top: y, width: align === 'center' ? 1920 - x * 2 : 720,
    textAlign: align, fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: size,
    lineHeight: .90, letterSpacing: '-.047em', color, opacity: enter * (1 - exit),
    transform: `translateY(${mix(30, 0, enter) + exit * 18}px)`
  }}>{children}</div>
}

export function MiniMetric({ x, y, label, target, color, from, out }: {
  x: number; y: number; label: string; target: number; color: string; from: number; out: number
}) {
  const frame = useCurrentFrame()
  const enter = progress(frame, from, 12)
  const exit = progress(frame, out, 10, EASE.inQuint)
  const value = Math.round(target * progress(frame, from + 3, 22, EASE.inOutCubic))
  const dash = Math.PI * 150
  return <div style={{ position: 'absolute', left: x, top: y, width: 330, height: 150, opacity: enter * (1 - exit), transform: `translateY(${mix(20, 0, enter)}px) scale(${mix(.96, 1, enter)})` }}>
    <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="75" cy="75" r="55" fill="none" stroke={COLORS.TRACK} strokeWidth="15" />
      <circle cx="75" cy="75" r="55" fill="none" stroke={color} strokeWidth="15" strokeDasharray={dash} strokeDashoffset={dash * (1 - value / 100)} />
    </svg>
    <div style={{ position: 'absolute', left: 174, top: 18, fontFamily: 'Space Mono, monospace', fontSize: 20, fontWeight: 700, letterSpacing: '.08em', color: COLORS.SOFT }}>{label}</div>
    <div style={{ position: 'absolute', left: 174, top: 48, fontFamily: 'Archivo, sans-serif', fontSize: 66, fontWeight: 900, color: COLORS.INK }}>{value}%</div>
  </div>
}

export function S01Problem() {
  const frame = useCurrentFrame()
  const exit = progress(frame, 91, 14, EASE.inQuint)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <BrandLockup iconSize={45} wordSize={44} style={{ position: 'absolute', left: SAFE, top: 54, opacity: progress(frame, 4, 12) * (1 - exit) }} />
    <Title from={8} out={91} y={260} size={111}>VOCÊ SABE<br />QUANTO JÁ<br /><span style={{ color: COLORS.BRAND_PINK }}>USOU?</span></Title>
    <MiniMetric x={1060} y={158} label="CURSOR" target={81} color={COLORS.BRAND_PINK} from={18} out={94} />
    <MiniMetric x={1330} y={430} label="CLAUDE" target={64} color={COLORS.BRAND_ORANGE} from={27} out={94} />
    <MiniMetric x={1020} y={702} label="CHATGPT" target={47} color={COLORS.BRAND_GREEN} from={36} out={94} />
    <DemoLabel style={{ position: 'absolute', right: SUPPORT_SAFE, bottom: 48, opacity: progress(frame, 44, 10) * (1 - exit) }} />
  </AbsoluteFill>
}

export function S02Solution() {
  const frame = useCurrentFrame()
  const product = progress(frame, 26, 18, EASE.inOutCubic)
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
    <Product name={H3} camera={HERO} opacity={product} scaleFrom={.91} xFrom={85} />
    <Support from={51} exitAt={91} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 136 }}>TRÊS PROVEDORES. UMA LEITURA.</Support>
  </AbsoluteFill>
}

export function S03Usage() {
  const frame = useCurrentFrame()
  const highlight = progress(frame, 12, 12)
  const pop = progress(frame, 30, 14, EASE.inOutCubic)
  const fill = progress(frame, 50, 34, EASE.inOutCubic)
  const renewal = progress(frame, 111, 14)
  const close = progress(frame, 205, 17, EASE.inOutCubic)
  const shown = pop * (1 - close)
  const align = progress(frame, 0, 28, EASE.inOutCubic)
  const restore = progress(frame, 223, 14, EASE.inOutCubic)
  const baseCamera = lerpCamera(lerpCamera(HERO, USAGE_BASE, align), HERO, restore)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Product name={H3} camera={baseCamera} opacity={1} scaleFrom={1} />
    <UsageProduct opacity={shown} fill={fill} />
    <Title from={5} out={203} y={224} size={108}>ACOMPANHE<br />SEU <span style={{ color: COLORS.BRAND_PINK }}>USO.</span></Title>
    <div style={{ position: 'absolute', left: SAFE, top: 535, opacity: renewal * (1 - close), transform: `translateY(${mix(18, 0, renewal)}px)` }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, letterSpacing: '.09em', color: COLORS.SOFT }}>PERCENTUAL UTILIZADO</div>
      <div style={{ marginTop: 14, width: 510, height: 7, background: COLORS.BRAND_GREEN, transformOrigin: 'left', transform: `scaleX(${renewal})` }} />
      <div style={{ marginTop: 22, fontFamily: 'Archivo, sans-serif', fontSize: 43, fontWeight: 900, color: COLORS.INK }}>RENOVA EM 11 DIAS.</div>
    </div>
    <div style={{ position: 'absolute', left: 1080, top: 74, width: 480, height: 7, background: COLORS.BRAND_PINK, transformOrigin: 'left', transform: `scaleX(${highlight * (1 - close)})` }} />
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 48, opacity: progress(frame, 73, 10) * (1 - close) }} />
  </AbsoluteFill>
}

export function S04Working() {
  const frame = useCurrentFrame()
  const cursor = centre(H3, 'cursor')
  const closeCamera: Camera = { focusX: cursor.x, focusY: cursor.y, atX: 1160, atY: 550, scale: 8.2 }
  const zoomIn = progress(frame, 46, 31, EASE.inOutCubic)
  const zoomOut = progress(frame, 137, 31, EASE.inOutCubic)
  const zoom = zoomIn * (1 - zoomOut)
  const cameraNow = lerpCamera(HERO, closeCamera, zoom)
  const active = progress(frame, 25, 14) * (1 - progress(frame, 157, 14, EASE.inOutCubic))
  const titleOut = progress(frame, 105, 12, EASE.inQuint)
  const answer = progress(frame, 167, 13)
  const sceneOut = progress(frame, 199, 11, EASE.inQuint)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Shot name={H3} camera={cameraNow} opacity={1 - sceneOut} />
    <ActivityShot camera={cameraNow} frame={frame} from={25} opacity={active * (1 - sceneOut)} variant="horizontal-3" />
    <div style={{ opacity: 1 - titleOut }}><Title from={4} out={105} y={185} size={101}>SUA IA ESTÁ<br /><span style={{ color: COLORS.BRAND_ORANGE }}>TRABALHANDO?</span></Title></div>
    <div style={{ position: 'absolute', left: 1015, top: 136, opacity: progress(frame, 48, 12) * (1 - progress(frame, 139, 10)) }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 25, fontWeight: 700, letterSpacing: '.13em', color: COLORS.BRAND_ORANGE }}>EM ATIVIDADE</div>
      <div style={{ width: 310, height: 7, marginTop: 13, background: COLORS.BRAND_ORANGE, transformOrigin: 'left', transform: `scaleX(${progress(frame, 55, 18)})` }} />
    </div>
    <div style={{ position: 'absolute', left: SAFE, top: 280, fontFamily: 'Archivo, sans-serif', fontSize: 130, fontWeight: 900, letterSpacing: '-.047em', color: COLORS.INK, opacity: answer * (1 - sceneOut), transform: `translateY(${mix(25, 0, answer)}px)` }}>VOCÊ <span style={{ color: COLORS.BRAND_GREEN }}>SABE.</span></div>
    <Support from={174} exitAt={198} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 110 }}>IDLE → WORKING → IDLE.</Support>
  </AbsoluteFill>
}

export function S05Themes() {
  const frame = useCurrentFrame()
  const first = progress(frame, 8, 15)
  const second = progress(frame, 20, 15)
  const out = progress(frame, 105, 15, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Title from={4} out={104} x={90} y={70} size={94} align="center">DO SEU <span style={{ color: COLORS.BRAND_PURPLE }}>JEITO.</span></Title>
    <Product name={THEME_A} camera={camera(THEME_A, 540, 580, 2.6)} opacity={first * (1 - out)} scaleFrom={.94} />
    <Product name={THEME_B} camera={camera(THEME_B, 1380, 580, 2.6)} opacity={second * (1 - out)} scaleFrom={.94} />
    <div style={{ position: 'absolute', left: 325, top: 788, width: 430, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, letterSpacing: '.09em', color: COLORS.INK, opacity: first * (1 - out) }}>MONOKAI BLACK</div>
    <div style={{ position: 'absolute', left: 1165, top: 788, width: 430, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, letterSpacing: '.09em', color: COLORS.INK, opacity: second * (1 - out) }}>CATPPUCCIN</div>
    <div style={{ position: 'absolute', left: 956, top: 400, width: 8, height: 350, background: COLORS.BRAND_PURPLE, transformOrigin: 'center', transform: `scaleY(${second * (1 - out)})` }} />
  </AbsoluteFill>
}

export function S06Benefit() {
  const frame = useCurrentFrame()
  const first = progress(frame, 5, 13)
  const second = progress(frame, 24, 13)
  const product = progress(frame, 35, 15)
  const out = progress(frame, 94, 11, EASE.inQuint)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', left: 120, right: 120, top: 165, textAlign: 'center', fontFamily: 'Archivo, sans-serif', fontSize: 118, lineHeight: .92, fontWeight: 900, letterSpacing: '-.047em', color: COLORS.INK, opacity: (1 - out) }}>
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
  const ctaCamera = camera(H3_POP, 1380, 262, 2.35)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <BrandLockup iconSize={54} wordSize={53} style={{ position: 'absolute', left: SAFE, top: 66, opacity: logo, transform: `translateY(${mix(18, 0, logo)}px)` }} />
    <div style={{ position: 'absolute', left: SAFE, top: 224, fontFamily: 'Archivo, sans-serif', fontSize: 95, fontWeight: 900, lineHeight: .90, letterSpacing: '-.047em', color: COLORS.INK, opacity: title, transform: `translateY(${mix(22, 0, title)}px)` }}>SUAS IAS,<br /><span style={{ color: COLORS.BRAND_GREEN }}>À VISTA.</span></div>
    <div style={{ position: 'absolute', inset: 0, transform: `translateX(${mix(65, 0, product)}px)` }}>
      <Product name={H3} camera={camera(H3, 1380, 262, 2.35)} opacity={product} scaleFrom={1} />
    </div>
    <UsageProduct opacity={pop} fill={progress(frame, 40, 24, EASE.inOutCubic)} camera={ctaCamera} />
    <div style={{ position: 'absolute', left: SAFE, top: 545, width: 750, height: 122, overflow: 'hidden', background: COLORS.BRAND_GREEN, transformOrigin: 'left', transform: `scaleX(${button})` }}>
      <div style={{ position: 'absolute', left: 34, top: 29, fontFamily: 'Archivo, sans-serif', fontSize: 48, fontWeight: 900, color: COLORS.INK, whiteSpace: 'nowrap', opacity: progress(frame, 50, 9) }}>CONHEÇA O WIDOKEN →</div>
    </div>
    <div style={{ position: 'absolute', left: SAFE, top: 704, width: 750, height: 7, background: COLORS.INK, transformOrigin: 'left', transform: `scaleX(${progress(frame, 55, 16)})` }} />
  </AbsoluteFill>
}
