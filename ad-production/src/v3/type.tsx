import React from 'react'
import { staticFile, useCurrentFrame } from 'remotion'
import { COLORS, EASE, clamp } from './tokens'

export const GLOBAL_CSS = `
@font-face {
  font-family: 'Archivo';
  src: url('${staticFile('fonts/Archivo-Variable.ttf')}') format('truetype-variations');
  font-weight: 100 900;
  font-display: block;
}
@font-face {
  font-family: 'Space Mono';
  src: url('${staticFile('fonts/SpaceMono-Bold.ttf')}') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'Space Mono';
  src: url('${staticFile('fonts/SpaceMono-Regular.ttf')}') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
`

export type Direction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'wipeRight'
  | 'wipeLeft'
  | 'none'

export interface WordSpec {
  delay?: number
  duration?: number
  dir?: Direction
  /** Travel distance, as a fraction of the word box. */
  distance?: number
  scaleFrom?: number
  easing?: (t: number) => number
  opacityFrom?: number
  color?: string
  /** Extra horizontal / vertical nudge in px. */
  dx?: number
  dy?: number
  /** 2D rotation in degrees (never 3D). */
  rotate?: number
}

export interface WordsProps {
  text?: string
  lines?: string[]
  size: number
  weight?: number
  tracking?: number
  lineHeight?: number
  color?: string
  align?: React.CSSProperties['textAlign']
  from?: number
  stagger?: number
  duration?: number
  spec?: (index: number, word: string, lineIndex: number) => WordSpec
  style?: React.CSSProperties
  className?: string
  /** Per-word (default) or per-letter reveals. */
  split?: 'word' | 'letter'
}

/**
 * Typographic primitive: each word owns its own mask, direction, timing and
 * easing. Lines are explicit so the line breaks are directed, never wrapped
 * by the browser.
 */
export function Words({
  text,
  lines,
  size,
  weight = 900,
  tracking = -0.03,
  lineHeight = 0.84,
  color = COLORS.ink,
  align = 'left',
  from = 0,
  stagger = 2,
  duration = 12,
  spec,
  style,
  className,
  split = 'word'
}: WordsProps) {
  const frame = useCurrentFrame()
  const rows = lines ?? (text ? [text] : [])
  let globalIndex = 0

  return (
    <div
      className={className}
      style={{
        fontFamily: 'Archivo, Archivo Black, sans-serif',
        fontSize: size,
        fontWeight: weight,
        fontVariationSettings: `'wght' ${weight}`,
        letterSpacing: `${tracking}em`,
        lineHeight,
        color,
        textAlign: align,
        whiteSpace: 'pre',
        ...style
      }}
    >
      {rows.map((row, lineIndex) => {
        const rowWords = split === 'letter' ? row.split('') : row.split(' ')
        return (
          <div key={`${row}-${lineIndex}`} style={{ display: 'block' }}>
            {rowWords.map((word, wordIndex) => {
              const index = globalIndex
              globalIndex += 1
              const s = spec?.(index, word, lineIndex) ?? {}
              const delay = s.delay ?? index * stagger
              const span = s.duration ?? duration
              const easing = s.easing ?? EASE.outQuint
              const dir = s.dir ?? 'up'
              const distance = s.distance ?? 1
              const scaleFrom = s.scaleFrom ?? 1
              const p = easing(clamp((frame - from - delay) / Math.max(1, span)))

              const moving = dir === 'up' || dir === 'down'
              const wiping = dir === 'wipeRight' || dir === 'wipeLeft'

              let transform = ''
              // The mask box is taller than the line box (it carries padding so
              // accents are not clipped), so a 100% travel leaves the top of the
              // word visible before it starts. 170% parks it fully outside.
              if (dir === 'up') transform = `translateY(${(1 - p) * 170 * distance}%)`
              else if (dir === 'down') transform = `translateY(${-(1 - p) * 170 * distance}%)`
              else if (dir === 'left') transform = `translateX(${(1 - p) * 100 * distance}%)`
              else if (dir === 'right') transform = `translateX(${-(1 - p) * 100 * distance}%)`

              if (scaleFrom !== 1) transform += ` scale(${scaleFrom + (1 - scaleFrom) * p})`
              if (s.rotate) transform += ` rotate(${s.rotate * (1 - p)}deg)`
              if (s.dx) transform += ` translateX(${s.dx * (1 - p)}px)`
              if (s.dy) transform += ` translateY(${s.dy * (1 - p)}px)`

              const clip = wiping
                ? dir === 'wipeRight'
                  ? `inset(0 ${(1 - p) * 100}% 0 0)`
                  : `inset(0 0 0 ${(1 - p) * 100}%)`
                : undefined

              const opacity =
                s.opacityFrom === undefined
                  ? 1
                  : s.opacityFrom + (1 - s.opacityFrom) * p

              return (
                <React.Fragment key={`${word}-${wordIndex}`}>
                  {wordIndex > 0 && split === 'word' ? ' ' : null}
                  <span
                    style={{
                      display: 'inline-block',
                      verticalAlign: 'bottom',
                      // Archivo's accents and cedillas leave the em box.
                      // Open the mask only while the word is actually moving.
                      overflow: moving && p < 0.999 ? 'hidden' : 'visible',
                      paddingTop: moving && p < 0.999 ? '0.18em' : undefined,
                      marginTop: moving && p < 0.999 ? '-0.18em' : undefined,
                      paddingBottom: moving && p < 0.999 ? '0.24em' : undefined,
                      marginBottom: moving && p < 0.999 ? '-0.24em' : undefined,
                      opacity,
                      clipPath: clip,
                      WebkitClipPath: clip
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        transform: transform || undefined,
                        transformOrigin: 'left bottom',
                        color: s.color ?? 'inherit',
                        willChange: 'transform'
                      }}
                    >
                      {word}
                    </span>
                  </span>
                </React.Fragment>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/** Technical voice: labels, counts, timestamps, URLs. */
export function Mono({
  children,
  size = 24,
  weight = 700,
  tracking = 0.12,
  color = COLORS.ink,
  align = 'left',
  uppercase = true,
  lineHeight = 1.35,
  style,
  className
}: {
  children: React.ReactNode
  size?: number
  weight?: number
  tracking?: number
  color?: string
  align?: React.CSSProperties['textAlign']
  uppercase?: boolean
  lineHeight?: number
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        fontFamily: 'Space Mono, ui-monospace, monospace',
        fontSize: size,
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        color,
        textAlign: align,
        textTransform: uppercase ? 'uppercase' : undefined,
        lineHeight,
        whiteSpace: 'pre',
        ...style
      }}
    >
      {children}
    </div>
  )
}

/** Integer counter driven by the scene clock. */
export function CountUp({
  value,
  from,
  duration,
  start = 0,
  suffix = '%',
  size = 96,
  color = COLORS.ink
}: {
  value: number
  from: number
  duration: number
  start?: number
  suffix?: string
  size?: number
  color?: string
}) {
  const frame = useCurrentFrame()
  const p = EASE.outQuint(clamp((frame - from) / Math.max(1, duration)))
  const current = Math.round((start + (value - start) * p) * 1) / 1
  return (
    <span
      style={{
        fontFamily: 'Archivo, Archivo Black, sans-serif',
        fontSize: size,
        fontWeight: 900,
        fontVariationSettings: "'wght' 900",
        letterSpacing: '-0.035em',
        lineHeight: 0.9,
        color,
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {current}
      {suffix}
    </span>
  )
}

/**
 * Two strings in the same typographic slot. The incoming string is revealed
 * by a hard horizontal wipe, so the substitution reads as a decision rather
 * than a cross-fade.
 */
export function SwapLine({
  a,
  b,
  at,
  size,
  weight = 900,
  tracking = -0.03,
  colorA = COLORS.ink,
  colorB = COLORS.ink,
  duration = 8,
  style
}: {
  a: string
  b: string
  at: number
  size: number
  weight?: number
  tracking?: number
  colorA?: string
  colorB?: string
  duration?: number
  style?: React.CSSProperties
}) {
  const frame = useCurrentFrame()
  const p = EASE.inOutCubic(clamp((frame - at) / duration))
  const base: React.CSSProperties = {
    fontFamily: 'Archivo, Archivo Black, sans-serif',
    fontSize: size,
    fontWeight: weight,
    fontVariationSettings: `'wght' ${weight}`,
    letterSpacing: `${tracking}em`,
    lineHeight: 0.84,
    whiteSpace: 'pre'
  }
  return (
    <div style={{ position: 'relative', ...style }}>
      <div
        style={{
          ...base,
          color: colorA,
          clipPath: `inset(0 0 0 ${p * 100}%)`,
          WebkitClipPath: `inset(0 0 0 ${p * 100}%)`
        }}
      >
        {a}
      </div>
      <div
        style={{
          ...base,
          position: 'absolute',
          left: 0,
          top: 0,
          color: colorB,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          WebkitClipPath: `inset(0 ${(1 - p) * 100}% 0 0)`
        }}
      >
        {b}
      </div>
    </div>
  )
}
