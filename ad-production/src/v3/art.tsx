import React from 'react'
import { Img, staticFile } from 'remotion'
import { COLORS } from './tokens'

export function WidokenIcon({ size, style, className }: { size: number; style?: React.CSSProperties; className?: string }) {
  return <Img className={className} src={staticFile('product/brand/icon.png')} style={{ width: size, height: size, display: 'block', ...style }} />
}

/** One atomic lockup: the icon and name always enter and leave together. */
export function BrandLockup({ iconSize = 170, wordSize = 170, gap = 38, style }: { iconSize?: number; wordSize?: number; gap?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, whiteSpace: 'nowrap', ...style }}>
      <WidokenIcon size={iconSize} />
      <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: wordSize, fontWeight: 900, fontVariationSettings: "'wght' 900", letterSpacing: '-0.055em', lineHeight: 0.82, color: COLORS.ink }}>
        WIDOKEN
      </div>
    </div>
  )
}

/** V3 assets are authored as standalone flat SVGs and animated as one group. */
export function Tank({ width = 1200, inverted = false, style, className }: { width?: number; inverted?: boolean; style?: React.CSSProperties; className?: string }) {
  const height = width * (440 / 960)
  return (
    <Img className={className} src={staticFile('v3/tank.svg')} style={{ width, height, display: 'block', filter: inverted ? 'invert(1)' : undefined, ...style }} />
  )
}

export function Ant({ width = 96, style, className }: { width?: number; phase?: number; color?: string; style?: React.CSSProperties; className?: string }) {
  return <Img className={className} src={staticFile('v3/ant.svg')} style={{ width, height: width * (112 / 180), display: 'block', ...style }} />
}

export function Disc({ cx, cy, r, color, opacity = 1 }: { cx: number; cy: number; r: number; color: string; opacity?: number }) {
  return <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', background: color, opacity }} />
}

export function Meter({ x, y, width, height = 16, value, color }: { x: number; y: number; width: number; height?: number; value: number; color: string }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height, background: '#e6e6e6', overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color }} />
    </div>
  )
}

export function Cursor({ x, y, scale = 1, opacity = 1 }: { x: number; y: number; scale?: number; opacity?: number }) {
  return (
    <svg viewBox="0 0 24 32" width={24 * scale} height={32 * scale} style={{ position: 'absolute', left: x, top: y, opacity, display: 'block' }}>
      <path d="M 1.5 1.5 L 1.5 25 L 7.4 19.5 L 11.3 29.5 L 15.6 27.8 L 11.8 18 L 20 17.6 Z" fill={COLORS.paper} stroke={COLORS.ink} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
