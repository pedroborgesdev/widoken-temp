import React from 'react'
import { Img, staticFile, useCurrentFrame } from 'remotion'
import { COLORS, EASE, clamp, enterHoldExit, mix, progress } from './tokens'

export const GLOBAL_CSS = `
@font-face { font-family:'Archivo'; src:url('${staticFile('fonts/Archivo-Variable.ttf')}') format('truetype-variations'); font-weight:100 900; font-display:block; }
@font-face { font-family:'Space Mono'; src:url('${staticFile('fonts/SpaceMono-Bold.ttf')}') format('truetype'); font-weight:700; font-display:block; }
* { box-sizing:border-box; margin:0; padding:0; }
`

export function Headline({
  lines,
  from,
  exitAt,
  size = 128,
  color = COLORS.INK,
  align = 'left',
  style,
  accent
}: {
  lines: string[]
  from: number
  exitAt: number
  size?: number
  color?: string
  align?: 'left' | 'right' | 'center'
  style?: React.CSSProperties
  accent?: { text: string; color: string }
}) {
  const frame = useCurrentFrame()
  const opacity = enterHoldExit(frame, from, 10, exitAt, 9)
  const enter = progress(frame, from, 10, EASE.outExpo)
  const exit = progress(frame, exitAt, 9, EASE.inOutCubic)
  return (
    <div style={{
      fontFamily: 'Archivo, sans-serif', fontSize: size, fontWeight: 900,
      fontVariationSettings: "'wght' 900", letterSpacing: '-0.047em', lineHeight: 0.86,
      color, textAlign: align, opacity,
      transform: `translateY(${mix(30, 0, enter) - exit * 24}px)`,
      ...style
    }}>
      {lines.map((line) => (
        <div key={line} style={{ whiteSpace: 'nowrap', overflow: 'visible' }}>
          {accent && line.includes(accent.text) ? (
            <>{line.split(accent.text)[0]}<span style={{ color: accent.color }}>{accent.text}</span>{line.split(accent.text)[1]}</>
          ) : line}
        </div>
      ))}
    </div>
  )
}

export function Support({ children, from, exitAt, size = 30, color = COLORS.SOFT, style }: {
  children: React.ReactNode; from: number; exitAt: number; size?: number; color?: string; style?: React.CSSProperties
}) {
  const frame = useCurrentFrame()
  const p = progress(frame, from, 10)
  const out = progress(frame, exitAt, 8, EASE.inOutCubic)
  return <div style={{
    fontFamily: 'Space Mono, monospace', fontSize: size, fontWeight: 700, letterSpacing: '0.045em',
    lineHeight: 1.25, color, opacity: p * (1 - out), transform: `translateX(${mix(-28, 0, p) - out * 18}px)`, ...style
  }}>{children}</div>
}

export function WidokenIcon({ size, style }: { size: number; style?: React.CSSProperties }) {
  return <Img src={staticFile('product/brand/icon.png')} style={{ width: size, height: size, display: 'block', ...style }} />
}

export function BrandLockup({ iconSize = 74, wordSize = 76, style }: { iconSize?: number; wordSize?: number; style?: React.CSSProperties }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: iconSize * 0.22, whiteSpace: 'nowrap', ...style }}>
    <WidokenIcon size={iconSize} />
    <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: wordSize, fontWeight: 900, fontVariationSettings: "'wght' 900", letterSpacing: '-0.055em', lineHeight: 0.84, color: COLORS.INK }}>WIDOKEN</div>
  </div>
}

/** Transition E: an official-colour panel that fully covers the frame. */
export function ColorWipe({ frame, from, duration = 11, color = COLORS.BRAND_ORANGE, direction = 'in' }: {
  frame: number; from: number; duration?: number; color?: string; direction?: 'in' | 'out'
}) {
  const p = progress(frame, from, duration, EASE.inOutCubic)
  const clipPath = direction === 'in' ? `inset(0 0 0 ${(1 - p) * 100}%)` : `inset(0 ${p * 100}% 0 0)`
  return <div style={{ position: 'absolute', inset: 0, background: color, clipPath, WebkitClipPath: clipPath }} />
}

/** Transition F: a capture switch through an external horizontal mask. */
export function MaskReveal({ frame, from, duration, children, direction = 'down', style }: {
  frame: number; from: number; duration: number; children: React.ReactNode; direction?: 'down' | 'right'; style?: React.CSSProperties
}) {
  const p = progress(frame, from, duration, EASE.inOutCubic)
  const clip = direction === 'down' ? `inset(0 0 ${(1 - p) * 100}% 0)` : `inset(0 ${(1 - p) * 100}% 0 0)`
  return <div style={{ position: 'absolute', inset: 0, clipPath: clip, WebkitClipPath: clip, ...style }}>{children}</div>
}

export function DemoLabel({ style }: { style?: React.CSSProperties }) {
  return <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 24, fontWeight: 700, letterSpacing: '0.12em', color: COLORS.MUTED, ...style }}>DADOS DE DEMONSTRAÇÃO</div>
}
