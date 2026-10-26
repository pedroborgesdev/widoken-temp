import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { ActivityShot, Camera, Shot, box, centre, lerpCamera } from '../v3/product'
import { DemoLabel, Support, BrandLockup } from '../v4/motion'
import {
  H3, H3_POP, HorizontalUsagePopover, OrientationMorph, Product,
  S01Problem, S02Solution, S06Benefit, THEME_CATPPUCCIN, THEME_DARK,
  THEME_MONOKAI, THEME_NORD, Title, UsagePopover, V3, V3_POP, V_INTRO,
  V_USAGE, camera, screenRect
} from '../v7/scenes'
import { COLORS, EASE, SAFE, SUPPORT_SAFE, mix, progress } from './tokens'

export { S01Problem, S02Solution, S06Benefit }

const V_WORK_ENTRY = camera(V3, 1260, 750, 3.25)
const V_WORK = camera(V3, 1260, 550, 3.3)
const THEME_X = [250, 723, 1197, 1670]
const THEME_Y = 555
const THEME_SCALE = 1.90
const THEME_FIRST = camera(THEME_MONOKAI, THEME_X[0], THEME_Y, THEME_SCALE)

export function S03Usage() {
  const frame = useCurrentFrame()
  const align = progress(frame, 0, 20, EASE.inOutCubic)
  const handoff = progress(frame, 205, 20, EASE.inOutCubic)
  const settledCamera = lerpCamera(V_INTRO, V_USAGE, align)
  const baseCamera = lerpCamera(settledCamera, V_WORK_ENTRY, handoff)
  const popCamera = camera(V3_POP, V_USAGE.atX, V_USAGE.atY, V_USAGE.scale)
  const highlight = progress(frame, 18, 12)
  const pop = progress(frame, 31, 15, EASE.inOutCubic)
  const fill = progress(frame, 51, 34, EASE.inOutCubic)
  const renewal = progress(frame, 96, 14)
  const close = progress(frame, 190, 15, EASE.inOutCubic)
  const shown = pop * (1 - close)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Product name={V3} camera={baseCamera} opacity={1} scaleFrom={1} />
    <UsagePopover opacity={shown} fill={fill} camera={popCamera} />
    <Title from={5} out={190} y={225} size={88} width={595}>ACOMPANHE<br />SEU <span style={{ color: COLORS.BRAND_PINK }}>USO.</span></Title>
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
  const rise = progress(frame, 0, 22, EASE.outQuint)
  const entryCamera = lerpCamera(V_WORK_ENTRY, V_WORK, rise)
  const cursor = centre(V3, 'cursor')
  const closeCamera: Camera = { focusX: cursor.x, focusY: cursor.y, atX: 1270, atY: 190, scale: 4.85 }
  const zoomIn = progress(frame, 53, 25, EASE.inOutCubic)
  const zoomOut = progress(frame, 134, 28, EASE.inOutCubic)
  const zoom = zoomIn * (1 - zoomOut)
  const cameraNow = lerpCamera(entryCamera, closeCamera, zoom)
  const active = progress(frame, 31, 14) * (1 - progress(frame, 164, 14, EASE.inOutCubic))
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
      <Shot name={V3} camera={cameraNow} opacity={1 - active} />
      <ActivityShot camera={cameraNow} frame={frame} from={31} opacity={active} variant="compact-3" />
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
      const selected = index === 0
        ? progress(frame, 55, 9) * (1 - progress(frame, 86, 9))
        : index === 2 ? progress(frame, 100, 9) * (1 - progress(frame, 133, 9)) : 0
      return <React.Fragment key={name}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${THEME_X[index]}px ${THEME_Y}px`, transform: `scale(${1 + selected * .035})` }}>
          <Product name={name} camera={camera(name, THEME_X[index], THEME_Y, THEME_SCALE)} opacity={visible} scaleFrom={.96} xFrom={index === 0 ? 0 : 46} />
        </div>
        <div style={{ position: 'absolute', left: THEME_X[index] - 215, top: 748, width: 430, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 23, fontWeight: 700, letterSpacing: '.055em', color: COLORS.INK, opacity: visible }}>{label}</div>
        <div style={{ position: 'absolute', left: THEME_X[index] - 115, top: 793, width: 230, height: 6, background: COLORS.BRAND_PURPLE, transformOrigin: 'center', transform: `scaleX(${selected * (1 - out)})` }} />
      </React.Fragment>
    })}
  </AbsoluteFill>
}

export function S07Cta() {
  const frame = useCurrentFrame()
  const logo = progress(frame, 4, 12)
  const title = progress(frame, 12, 14)
  const product = progress(frame, 19, 14)
  const pop = progress(frame, 29, 14, EASE.inOutCubic)
  const button = progress(frame, 45, 15, EASE.inOutCubic)
  const ctaCamera = camera(H3_POP, 1445, 275, 2.36)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <BrandLockup iconSize={54} wordSize={53} style={{ position: 'absolute', left: SAFE, top: 66, opacity: logo, transform: `translateY(${mix(18, 0, logo)}px)` }} />
    <div style={{ position: 'absolute', left: SAFE, top: 224, fontFamily: 'Archivo, sans-serif', fontSize: 95, fontWeight: 900, lineHeight: .90, letterSpacing: '-.047em', color: COLORS.INK, opacity: title, transform: `translateY(${mix(22, 0, title)}px)` }}>SUAS IAS,<br /><span style={{ color: COLORS.BRAND_GREEN }}>À VISTA.</span></div>
    <div style={{ position: 'absolute', inset: 0, transform: `translateX(${mix(65, 0, product)}px)` }}>
      <Product name={H3} camera={camera(H3, 1445, 275, 2.36)} opacity={product} scaleFrom={1} />
    </div>
    <HorizontalUsagePopover opacity={pop} fill={progress(frame, 40, 24, EASE.inOutCubic)} camera={ctaCamera} />
    <div style={{ position: 'absolute', left: SAFE, top: 540, width: 740, height: 130, overflow: 'hidden', background: COLORS.BRAND_GREEN, transformOrigin: 'left', transform: `scaleX(${button})` }}>
      <div style={{ position: 'absolute', left: 34, top: 31, fontFamily: 'Archivo, sans-serif', fontSize: 47, fontWeight: 900, color: COLORS.INK, whiteSpace: 'nowrap', opacity: progress(frame, 50, 9) }}>CONHEÇA O WIDOKEN →</div>
    </div>
    <div style={{ position: 'absolute', left: SAFE, top: 707, width: 740, height: 8, background: COLORS.INK, transformOrigin: 'left', transform: `scaleX(${progress(frame, 55, 16)})` }} />
  </AbsoluteFill>
}
