import React from 'react'
import { staticFile } from 'remotion'
import { COLORS } from './tokens'

export const GLOBAL_CSS = `
@font-face {
  font-family: 'Archivo';
  src: url('${staticFile('fonts/Archivo-Variable.ttf')}') format('truetype-variations');
  font-weight: 100 900;
  font-stretch: 62% 125%;
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

interface TypeProps {
  children: React.ReactNode
  size?: number
  weight?: number
  tracking?: number
  lineHeight?: number
  color?: string
  align?: React.CSSProperties['textAlign']
  uppercase?: boolean
  style?: React.CSSProperties
  className?: string
}

/**
 * The ad's display face. Archivo's width axis is the graphic device that
 * gives the lettering its Swiss-editorial range.
 */
export function Type({
  children,
  size = 120,
  weight = 900,
  tracking = -0.025,
  lineHeight = 0.84,
  color = COLORS.ink,
  align = 'left',
  uppercase = false,
  style,
  className
}: TypeProps) {
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
        textTransform: uppercase ? 'uppercase' : undefined,
        whiteSpace: 'pre',
        ...style
      }}
    >
      {children}
    </div>
  )
}

interface MonoProps {
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
}

/** Technical face: the ad's data and label voice. */
export function Mono({
  children,
  size = 22,
  weight = 700,
  tracking = 0.14,
  color = COLORS.ink,
  align = 'left',
  uppercase = true,
  lineHeight = 1.3,
  style,
  className
}: MonoProps) {
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
