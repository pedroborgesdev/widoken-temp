import React from 'react'
import { Img, staticFile } from 'remotion'
import { COLORS } from './tokens'

/**
 * The official Widoken icon, used exactly as shipped
 * (app/resources/widoken.png). It is never redrawn, recoloured or deformed.
 */
export function WidokenIcon({
  size,
  style,
  className
}: {
  size: number
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <Img
      className={className}
      src={staticFile('product/brand/icon.png')}
      style={{ width: size, height: size, display: 'block', ...style }}
    />
  )
}

/**
 * Original flat vector illustration of a tank. It is the visual half of the
 * campaign metaphor: an oversized, absurdly heavy solution to a tiny problem.
 * Deliberately graphic - no gradients, no shadows, no 3D.
 */
export function Tank({
  width = 900,
  style,
  className,
  accent = COLORS.amber
}: {
  width?: number
  style?: React.CSSProperties
  className?: string
  accent?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 620 260"
      width={width}
      height={(width / 620) * 260}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      {/* tracks */}
      <rect x="30" y="170" width="560" height="76" rx="38" fill={COLORS.ink} />
      {[80, 170, 260, 350, 440, 530].map((x) => (
        <circle key={x} cx={x} cy="208" r="20" fill={COLORS.paper} />
      ))}
      {/* hull with a sloped glacis */}
      <path d="M 64 170 L 64 100 L 368 100 L 548 136 L 548 170 Z" fill={COLORS.ink} />
      {/* turret */}
      <path
        d="M 142 100 L 158 58 Q 164 42 186 42 L 296 42 Q 318 42 324 60 L 340 100 Z"
        fill={COLORS.ink}
      />
      {/* barrel */}
      <path d="M 296 56 L 566 30 L 572 56 L 300 76 Z" fill={COLORS.ink} />
      {/* commander's hatch, the single brand accent */}
      <circle cx="204" cy="66" r="13" fill={accent} />
    </svg>
  )
}

const ANT_LEGS = [
  { x: 44, dir: -1 },
  { x: 62, dir: 1 },
  { x: 78, dir: -1 }
]

/**
 * Original flat vector illustration of an ant. The legs are animated from a
 * deterministic phase so the walk cycle is reproducible frame by frame.
 */
export function Ant({
  width = 120,
  phase = 0,
  color = COLORS.ink,
  style,
  className
}: {
  width?: number
  phase?: number
  color?: string
  style?: React.CSSProperties
  className?: string
}) {
  const legs = ANT_LEGS.map((leg, index) => {
    const swing = Math.sin(phase * Math.PI * 2 + index * 2.1) * 0.34
    const angle = leg.dir * (0.95 + swing)
    const kneeX = leg.x + Math.cos(angle) * 13
    const kneeY = 40 + Math.sin(angle) * 13
    const footX = kneeX + Math.cos(angle * 0.35) * 14
    const footY = 56 + Math.abs(Math.sin(angle)) * 6
    return { leg, kneeX, kneeY, footX, footY }
  })

  return (
    <svg
      className={className}
      viewBox="0 0 124 70"
      width={width}
      height={(width / 124) * 70}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      {legs.map(({ leg, kneeX, kneeY, footX, footY }) => (
        <path
          key={leg.x}
          d={`M ${leg.x} 40 L ${kneeX.toFixed(1)} ${kneeY.toFixed(1)} L ${footX.toFixed(1)} ${footY.toFixed(1)}`}
          stroke={color}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      <ellipse cx="34" cy="42" rx="21" ry="15" fill={color} />
      <ellipse cx="66" cy="39" rx="14" ry="12" fill={color} />
      <ellipse cx="90" cy="35" rx="12" ry="11.5" fill={color} />
      <path d="M 99 28 Q 116 20 121 8" stroke={color} strokeWidth={2.8} strokeLinecap="round" fill="none" />
      <path d="M 95 26 Q 104 12 102 2" stroke={color} strokeWidth={2.8} strokeLinecap="round" fill="none" />
    </svg>
  )
}
