import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { WidokenIcon } from '../brand/Illustrations'
import { Mono } from '../brand/Typography'
import { COLORS, EASE } from '../brand/tokens'
import { Kinetic } from '../motion/Kinetic'
import { ProductShot } from '../product/ProductShot'

const BREAK_LETTERS = ['P', 'R', 'A', ' ', 'Q', 'U', 'Ê', '?']
const BREAK_VECTORS = [
  [-760, -520], [-980, 140], [-820, 620],
  [0, 0],
  [220, -640], [520, -380], [760, 520], [1080, -620]
]

/**
 * SEQUENCE 03 - REVEAL DO WIDOKEN.
 *
 * The question breaks apart and the official icon takes the frame. The
 * wordmark is set beside it, the real widget docks to the edge of the screen.
 */
export function S03Reveal() {
  const frame = useCurrentFrame()

  // "PRA QUÊ?" arrives from the previous scene and bursts apart.
  const breakProgress = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 8) / 14)))
  const questionOpacity = interpolate(breakProgress, [0, 0.55], [1, 0], { extrapolateRight: 'clamp' })

  // The icon bursts in and settles into the final lockup.
  const burst = EASE.outBack(Math.min(1, Math.max(0, (frame - 8) / 20)))
  const settle = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 26) / 22)))
  const iconSize = 420 - 160 * settle
  const iconX = 960 - iconSize / 2 + (96 + 130 - 960) * settle
  const iconY = 540 - iconSize / 2 + (250 - 540) * settle
  const iconOpacity = interpolate(frame, [8, 13], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Wordmark + rule.
  const wordmark = Math.min(1, Math.max(0, (frame - 34) / 12))
  const rule = Math.min(1, Math.max(0, (frame - 46) / 10))
  const label = Math.min(1, Math.max(0, (frame - 54) / 10))

  // The real widget docks to the edge of the screen.
  const dock = EASE.outQuint(Math.min(1, Math.max(0, (frame - 58) / 22)))
  const stripX = 1790 + 250 * (1 - dock)
  const stripOpacity = interpolate(frame, [58, 64], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const line1 = Math.min(1, Math.max(0, (frame - 72) / 10))
  const line2 = Math.min(1, Math.max(0, (frame - 80) / 10))

  return (
    <AbsoluteFill>
      {/* The question, breaking apart. */}
      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 330,
          fontFamily: 'Archivo, Archivo Black, sans-serif',
          fontSize: 300,
          fontWeight: 900,
          fontVariationSettings: "'wght' 900",
          letterSpacing: '-0.025em',
          lineHeight: 0.84,
          color: COLORS.ink,
          opacity: questionOpacity,
          whiteSpace: 'pre'
        }}
      >
        {BREAK_LETTERS.map((letter, index) => {
          const [vx, vy] = BREAK_VECTORS[index]
          return (
            <span
              key={index}
              style={{
                display: 'inline-block',
                transform: `translate(${vx * breakProgress}px, ${vy * breakProgress}px) rotate(${vx * breakProgress * 0.02}deg)`,
                transformOrigin: 'center center'
              }}
            >
              {letter}
            </span>
          )
        })}
      </div>

      {/* The official icon, untouched. */}
      <div style={{ position: 'absolute', left: iconX, top: iconY, opacity: iconOpacity }}>
        <WidokenIcon size={iconSize * burst} />
      </div>

      {/* Wordmark lockup. */}
      <div style={{ position: 'absolute', left: 400, top: 292, opacity: wordmark }}>
        <Kinetic
          text="WIDOKEN"
          size={206}
          tracking={-0.02}
          lineHeight={0.86}
          from={34}
          duration={12}
          perWord={() => ({ delay: 0, duration: 12, easing: EASE.outExpo })}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 400,
          top: 490,
          width: 1027 * rule,
          height: 16,
          background: COLORS.green,
          opacity: rule
        }}
      />
      <div style={{ position: 'absolute', left: 400, top: 534, opacity: label }}>
        <Mono size={20} color={COLORS.ink} tracking={0.22}>
          USO · LIMITE · RENOVAÇÃO
        </Mono>
      </div>

      {/* The real widget, docked to the edge of the screen. */}
      <ProductShot
        capture="widget-vertical"
        x={stripX}
        y={146}
        width={120}
        opacity={stripOpacity}
      />

      {/* The promise. */}
      <div style={{ position: 'absolute', left: 96, top: 636, opacity: line1 }}>
        <Kinetic
          text="SIMPLES."
          size={236}
          lineHeight={0.84}
          from={72}
          duration={11}
          perWord={() => ({ delay: 0, duration: 11, easing: EASE.outExpo })}
        />
      </div>
      <div style={{ position: 'absolute', left: 96, top: 839, opacity: line2 }}>
        <Kinetic
          text="COMO DEVERIA SER."
          size={140}
          lineHeight={0.88}
          from={80}
          duration={11}
          perWord={(index) => ({ delay: index * 1.1, duration: 10, easing: EASE.outExpo })}
        />
      </div>
    </AbsoluteFill>
  )
}
