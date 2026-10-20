import React from 'react'
import { Img, staticFile } from 'remotion'
import { COLORS } from './tokens'

/**
 * ART LAYER — V2.
 *
 * Everything here is original flat vector artwork drawn for the film.
 * The only product asset is the official icon, which is never redrawn.
 */

/** The shipped icon, untouched. */
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

/* ------------------------------------------------------------------ *
 * TANK
 *
 * A flat, graphic side view built from a track, a hull and a turret.
 * It is deliberately a cartoon of overkill: no insignia, no weapon
 * detail, no violence. One official-green headlight is the only colour.
 * ------------------------------------------------------------------ */

const TANK_VIEWBOX = { width: 900, height: 420 }

function tankFrame(width: number) {
  return { width, height: (width / TANK_VIEWBOX.width) * TANK_VIEWBOX.height }
}

/** Road-wheel centres inside the tank viewBox. Exported so scenes can hand
 *  the wheels off to the next shot with exact geometry. */
export const TANK_WHEEL_CX = [128, 244, 360, 476, 592, 708] as const
export const TANK_WHEEL_CY = 338
export const TANK_WHEEL_R = 36

export function TankTrack({
  width,
  wheels = true,
  inverted = false,
  style,
  className
}: {
  width: number
  /** Hide the road wheels (they are handed off to the next shot). */
  wheels?: boolean
  /** White silhouette on a black field. */
  inverted?: boolean
  style?: React.CSSProperties
  className?: string
}) {
  const size = tankFrame(width)
  const mass = inverted ? COLORS.paper : COLORS.ink
  const cut = inverted ? COLORS.ink : COLORS.paper
  return (
    <svg
      className={className}
      viewBox={`0 0 ${TANK_VIEWBOX.width} ${TANK_VIEWBOX.height}`}
      width={size.width}
      height={size.height}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <rect x="34" y="292" width="800" height="104" rx="52" fill={mass} />
      {/* tread notches, cut in paper so the track reads as a track */}
      {Array.from({ length: 17 }).map((_, index) => (
        <rect
          key={index}
          x={58 + index * 44}
          y="378"
          width="20"
          height="10"
          fill={cut}
          opacity="0.92"
        />
      ))}
      {wheels
        ? TANK_WHEEL_CX.map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={TANK_WHEEL_CY} r={TANK_WHEEL_R} fill={cut} />
              <circle cx={cx} cy={TANK_WHEEL_CY} r="12" fill={mass} />
            </g>
          ))
        : null}
      {/* drive sprocket / idler */}
      <circle cx="70" cy="338" r="24" fill={cut} />
      <circle cx="70" cy="338" r="8" fill={mass} />
      <circle cx="798" cy="338" r="24" fill={cut} />
      <circle cx="798" cy="338" r="8" fill={mass} />
    </svg>
  )
}

export function TankHull({
  width,
  inverted = false,
  style,
  className
}: {
  width: number
  inverted?: boolean
  style?: React.CSSProperties
  className?: string
}) {
  const size = tankFrame(width)
  const mass = inverted ? COLORS.paper : COLORS.ink
  const cut = inverted ? COLORS.ink : COLORS.paper
  const plate = inverted ? '#d6d6d6' : '#2b2b2b'
  return (
    <svg
      className={className}
      viewBox={`0 0 ${TANK_VIEWBOX.width} ${TANK_VIEWBOX.height}`}
      width={size.width}
      height={size.height}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      {/* hull with sloped glacis */}
      <path d="M 92 302 L 132 190 L 636 190 L 760 302 Z" fill={mass} />
      {/* one lighter plate keeps the mass from reading as a silhouette */}
      <path d="M 160 286 L 186 212 L 610 212 L 690 286 Z" fill={plate} />
      {/* turret */}
      <path d="M 292 198 L 330 104 Q 337 88 356 88 L 512 88 Q 531 88 538 106 L 566 198 Z" fill={mass} />
      {/* hatch */}
      <circle cx="392" cy="118" r="22" fill={cut} />
      <circle cx="392" cy="118" r="9" fill={mass} />
      {/* commander's cupola detail */}
      <rect x="450" y="104" width="40" height="10" rx="5" fill={cut} opacity="0.85" />
      {/* antenna */}
      <path d="M 520 96 L 552 26" stroke={mass} strokeWidth="6" strokeLinecap="round" />
      <circle cx="552" cy="26" r="7" fill={mass} />
      {/* barrel */}
      <path d="M 522 118 L 872 96 L 876 124 L 526 146 Z" fill={mass} />
      {/* muzzle brake, drawn as two hard slots */}
      <rect x="838" y="88" width="44" height="46" fill={mass} />
      <rect x="848" y="96" width="7" height="14" fill={cut} />
      <rect x="864" y="96" width="7" height="14" fill={cut} />
      {/* headlight: the single official-colour accent */}
      <circle cx="704" cy="252" r="13" fill={COLORS.green} />
    </svg>
  )
}

export function Tank({
  width = 1200,
  hullX = 0,
  trackX = 0,
  inverted = false,
  style,
  className
}: {
  width?: number
  hullX?: number
  trackX?: number
  /** White silhouette on a black field. */
  inverted?: boolean
  style?: React.CSSProperties
  className?: string
}) {
  const size = tankFrame(width)
  return (
    <div
      className={className}
      style={{ position: 'relative', width: size.width, height: size.height, ...style }}
    >
      <TankTrack
        width={width}
        inverted={inverted}
        style={{ position: 'absolute', left: trackX, top: 0 }}
      />
      <TankHull
        width={width}
        inverted={inverted}
        style={{ position: 'absolute', left: hullX, top: 0 }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * ANT
 *
 * Three body segments, six legs, two antennae, one eye. At 84 px it is
 * unmistakably an ant, which is the whole point of the scale comparison.
 * ------------------------------------------------------------------ */

const LEG_PHASES = [0, 2.1, 0.9, 3.0, 1.7, 3.9]

export function Ant({
  width = 96,
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
  const legPoints = [
    { hipX: 40, hipY: 34, dir: -1 },
    { hipX: 54, hipY: 36, dir: -1 },
    { hipX: 68, hipY: 36, dir: -1 },
    { hipX: 40, hipY: 44, dir: 1 },
    { hipX: 54, hipY: 46, dir: 1 },
    { hipX: 68, hipY: 46, dir: 1 }
  ].map((leg, index) => {
    const swing = Math.sin(phase * Math.PI * 2 + LEG_PHASES[index]) * 0.45
    const reach = 20 + swing * 8
    const kneeX = leg.hipX + leg.dir * reach * 0.55
    const kneeY = leg.hipY + leg.dir * 12
    const footX = leg.hipX + leg.dir * (reach + 10)
    const footY = leg.hipY + leg.dir * 20
    return { ...leg, kneeX, kneeY, footX, footY }
  })

  return (
    <svg
      className={className}
      viewBox="0 0 124 72"
      width={width}
      height={(width / 124) * 72}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      {legPoints.map((leg, index) => (
        <path
          key={index}
          d={`M ${leg.hipX} ${leg.hipY} L ${leg.kneeX.toFixed(1)} ${leg.kneeY.toFixed(
            1
          )} L ${leg.footX.toFixed(1)} ${leg.footY.toFixed(1)}`}
          stroke={color}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {/* abdomen, thorax, head */}
      <ellipse cx="30" cy="40" rx="24" ry="16" fill={color} />
      <ellipse cx="64" cy="37" rx="15" ry="12.5" fill={color} />
      <ellipse cx="90" cy="33" rx="12.5" ry="11.5" fill={color} />
      {/* mandibles */}
      <path d="M 100 39 Q 111 41 113 47" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M 100 30 Q 111 27 113 21" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* antennae */}
      <path d="M 96 25 Q 108 12 105 2" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M 90 23 Q 96 9 90 1" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* eye */}
      <circle cx="95" cy="29" r="2.4" fill={COLORS.paper} />
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * GRAPHIC DEVICES
 * ------------------------------------------------------------------ */

/** Hard-edged circular wipe. Flat, no gradient. */
export function Disc({
  cx,
  cy,
  r,
  color,
  opacity = 1
}: {
  cx: number
  cy: number
  r: number
  color: string
  opacity?: number
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: color,
        opacity
      }}
    />
  )
}

/** Editorial meter: the external graphic echo of the widget's usage bar. */
export function Meter({
  x,
  y,
  width,
  height = 16,
  value,
  color
}: {
  x: number
  y: number
  width: number
  height?: number
  value: number
  color: string
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        background: '#e6e6e6',
        overflow: 'hidden'
      }}
    >
      <div style={{ width: `${value}%`, height: '100%', background: color }} />
    </div>
  )
}

/** Standard pointer, used only to show the real hover interaction. */
export function Cursor({
  x,
  y,
  scale = 1,
  opacity = 1
}: {
  x: number
  y: number
  scale?: number
  opacity?: number
}) {
  return (
    <svg
      viewBox="0 0 24 32"
      width={24 * scale}
      height={32 * scale}
      style={{ position: 'absolute', left: x, top: y, opacity, display: 'block' }}
    >
      <path
        d="M 1.5 1.5 L 1.5 25 L 7.4 19.5 L 11.3 29.5 L 15.6 27.8 L 11.8 18 L 20 17.6 Z"
        fill={COLORS.paper}
        stroke={COLORS.ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
