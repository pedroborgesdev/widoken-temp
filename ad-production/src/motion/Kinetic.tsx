import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { COLORS, EASE } from '../brand/tokens'

export type RevealDirection = 'up' | 'down' | 'left' | 'right'

export interface WordMotion {
  delay?: number
  duration?: number
  direction?: RevealDirection
  /** Travel distance as a fraction of the word box. */
  distance?: number
  scaleFrom?: number
  easing?: (t: number) => number
  opacityFrom?: number
  /** Horizontal nudge in px, for asymmetric baselines. */
  offsetX?: number
  /** Solid block behind the word (knocked-out lettering). */
  background?: string
  color?: string
  paddingX?: number
}

export interface KineticProps {
  text: string
  size: number
  weight?: number
  tracking?: number
  lineHeight?: number
  color?: string
  align?: React.CSSProperties['textAlign']
  /** Frame the block starts revealing on (scene-local). */
  from?: number
  duration?: number
  stagger?: number
  perWord?: (index: number, word: string) => WordMotion
  /** Mask the reveal inside each word box (vertical directions only). */
  mask?: boolean
  /** Split by words (default) or by individual glyphs. */
  split?: 'word' | 'letter'
  /** White keyline that keeps the type legible over dark artwork. */
  halo?: string
  style?: React.CSSProperties
  className?: string
}

/**
 * Kinetic typography primitive: every word gets its own timing, direction and
 * mask, so a headline can arrive with real rhythm instead of one fade.
 */
export function Kinetic({
  text,
  size,
  weight = 900,
  tracking = -0.025,
  lineHeight = 0.86,
  color = '#0d0d0d',
  align = 'left',
  from = 0,
  duration = 16,
  stagger = 2,
  perWord,
  mask = true,
  split = 'word',
  halo,
  style,
  className
}: KineticProps) {
  const frame = useCurrentFrame()
  const words = split === 'letter' ? text.split('') : text.split(' ')

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
        WebkitTextStroke: halo ? `${halo} ${COLORS.paper}` : undefined,
        ...style
      }}
    >
      {words.map((word, index) => {
        const spec = perWord?.(index, word) ?? {}
        const delay = spec.delay ?? index * stagger
        const span = spec.duration ?? duration
        const easing = spec.easing ?? EASE.outQuint
        const direction = spec.direction ?? 'up'
        const distance = spec.distance ?? 1
        const scaleFrom = spec.scaleFrom ?? 1
        const opacityFrom = spec.opacityFrom ?? 1

        const local = frame - from - delay
        const progress = easing(Math.min(1, Math.max(0, local / span)))

        let transform = ''
        if (direction === 'up') transform = `translateY(${(1 - progress) * 100 * distance}%)`
        else if (direction === 'down') transform = `translateY(${-(1 - progress) * 100 * distance}%)`
        else if (direction === 'left') transform = `translateX(${(1 - progress) * 100 * distance}%)`
        else transform = `translateX(${-(1 - progress) * 100 * distance}%)`

        if (scaleFrom !== 1) {
          const scale = scaleFrom + (1 - scaleFrom) * progress
          transform = `${transform} scale(${scale})`
        }

        const isVertical = direction === 'up' || direction === 'down'
        const isRevealing = mask && isVertical && progress < 0.999
        const opacity = opacityFrom === 1
          ? 1
          : interpolate(progress, [0, 1], [opacityFrom, 1])

        return (
          <React.Fragment key={`${word}-${index}`}>
            {index > 0 && split === 'word' ? ' ' : null}
            <span
              style={{
                display: 'inline-block',
                verticalAlign: 'bottom',
                // Archivo's accents and cedillas extend outside tight display
                // line boxes. Preserve a gutter during the reveal and release
                // the mask after landing so diacritics are never clipped.
                overflow: isRevealing ? 'hidden' : 'visible',
                paddingTop: isRevealing ? '0.16em' : undefined,
                marginTop: isRevealing ? '-0.16em' : undefined,
                paddingBottom: isRevealing ? '0.22em' : undefined,
                marginBottom: isRevealing ? '-0.22em' : undefined,
                opacity
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  transform: `${transform}${spec.offsetX ? ` translateX(${spec.offsetX}px)` : ''}`,
                  transformOrigin: direction === 'left' || direction === 'right' ? 'center' : 'left bottom',
                  background: spec.background,
                  color: spec.color,
                  paddingLeft: spec.paddingX ? `${spec.paddingX}px` : undefined,
                  paddingRight: spec.paddingX ? `${spec.paddingX}px` : undefined,
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
}

export interface LineBlockProps {
  lines: string[]
  size: number
  weight?: number
  tracking?: number
  lineHeight?: number
  color?: string
  from?: number
  duration?: number
  stagger?: number
  perLine?: (index: number, line: string) => WordMotion
  align?: React.CSSProperties['textAlign']
  style?: React.CSSProperties
  className?: string
}

/** Line-by-line masked reveal for stacked display type. */
export function LineBlock({
  lines,
  size,
  weight = 900,
  tracking = -0.025,
  lineHeight = 0.86,
  color = '#0d0d0d',
  from = 0,
  duration = 14,
  stagger = 3,
  perLine,
  align = 'left',
  style,
  className
}: LineBlockProps) {
  const frame = useCurrentFrame()

  return (
    <div className={className} style={{ textAlign: align, ...style }}>
      {lines.map((line, index) => {
        const spec = perLine?.(index, line) ?? {}
        const delay = spec.delay ?? index * stagger
        const span = spec.duration ?? duration
        const easing = spec.easing ?? EASE.outQuint
        const progress = easing(Math.min(1, Math.max(0, (frame - from - delay) / span)))
        const offset = (1 - progress) * 100

        const isRevealing = progress < 0.999

        return (
          <div
            key={index}
            style={{
              overflow: isRevealing ? 'hidden' : 'visible',
              paddingTop: isRevealing ? '0.16em' : undefined,
              marginTop: isRevealing ? '-0.16em' : undefined,
              paddingBottom: isRevealing ? '0.22em' : undefined,
              marginBottom: isRevealing ? '-0.22em' : undefined
            }}
          >
            <div
              style={{
                fontFamily: 'Archivo, Archivo Black, sans-serif',
                fontSize: size,
                fontWeight: weight,
                fontVariationSettings: `'wght' ${weight}`,
                letterSpacing: `${tracking}em`,
                lineHeight,
                color,
                whiteSpace: 'pre',
                transform: `translateY(${offset}%)`,
                transformOrigin: 'left bottom'
              }}
            >
              {line}
            </div>
          </div>
        )
      })}
    </div>
  )
}


export interface HaloTypeProps extends KineticProps {
  /** Width of the white keyline that keeps the type legible over artwork. */
  halo: string
}

/**
 * Display type with a flat white keyline, used where the lettering cuts
 * across the black tank. Two identical layers: a white stroked copy behind
 * a black one, so the knock-out is a hard graphic edge - no glow, no blur.
 */
export function HaloType({ halo, ...rest }: HaloTypeProps) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ color: COLORS.paper, WebkitTextStroke: `${halo} ${COLORS.paper}` }}>
        <Kinetic {...rest} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0 }}>
        <Kinetic {...rest} />
      </div>
    </div>
  )
}
