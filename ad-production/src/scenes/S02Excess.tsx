import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { Mono } from '../brand/Typography'
import { COLORS, EASE } from '../brand/tokens'
import { Kinetic } from '../motion/Kinetic'

interface Fragment {
  text: string
  x: number
  y: number
  size: number
  color: string
  from: 'left' | 'right' | 'top' | 'bottom'
  delay: number
  mono?: boolean
}

/**
 * The scattered data of seven different tools. Abstract typographic elements
 * and demonstrative numbers - never a fake provider interface.
 */
const FRAGMENTS: Fragment[] = [
  { text: 'CLAUDE', x: 118, y: 92, size: 27, color: COLORS.ink, from: 'left', delay: 0, mono: true },
  { text: '81%', x: 1592, y: 62, size: 92, color: COLORS.ringDanger, from: 'right', delay: 2 },
  { text: '4h 12m', x: 1418, y: 208, size: 48, color: COLORS.ink, from: 'right', delay: 4 },
  { text: '$2.00', x: 1596, y: 300, size: 56, color: COLORS.ringBalance, from: 'right', delay: 6 },
  { text: 'RESETS IN 11 DAYS', x: 1236, y: 396, size: 22, color: COLORS.ink, from: 'right', delay: 8, mono: true },
  { text: 'CHATGPT', x: 132, y: 902, size: 27, color: COLORS.ink, from: 'left', delay: 3, mono: true },
  { text: '405 / 500', x: 132, y: 958, size: 42, color: COLORS.ink, from: 'left', delay: 5 },
  { text: 'CURSOR', x: 690, y: 108, size: 27, color: COLORS.ringDanger, from: 'top', delay: 1, mono: true },
  { text: '37%', x: 752, y: 972, size: 88, color: COLORS.ringSuccess, from: 'bottom', delay: 7 },
  { text: 'ANTIGRAVITY', x: 1156, y: 52, size: 27, color: COLORS.ink, from: 'top', delay: 9, mono: true },
  { text: 'SESSION LIMIT', x: 1156, y: 98, size: 22, color: COLORS.ink, from: 'top', delay: 10, mono: true },
  { text: 'GITHUB COPILOT', x: 118, y: 604, size: 27, color: COLORS.ink, from: 'left', delay: 6, mono: true },
  { text: '56%', x: 546, y: 546, size: 80, color: COLORS.ringWarning, from: 'bottom', delay: 8 },
  { text: 'DEEPSEEK', x: 1570, y: 686, size: 27, color: COLORS.ink, from: 'right', delay: 11, mono: true },
  { text: '22%', x: 1618, y: 848, size: 72, color: COLORS.ringSuccess, from: 'right', delay: 12 },
  { text: 'HUGGING FACE', x: 196, y: 316, size: 27, color: COLORS.ink, from: 'left', delay: 13, mono: true },
  { text: '$20/MO', x: 424, y: 346, size: 40, color: COLORS.ink, from: 'left', delay: 14 },
  { text: 'WEEKLY LIMIT', x: 884, y: 244, size: 22, color: COLORS.ink, from: 'top', delay: 15, mono: true },
  { text: '12%', x: 288, y: 772, size: 70, color: COLORS.ink, from: 'left', delay: 16 },
  { text: '44%', x: 972, y: 690, size: 78, color: COLORS.ringSuccess, from: 'bottom', delay: 17 },
  { text: 'RESETS AT 04:49 PM', x: 616, y: 432, size: 20, color: COLORS.ink, from: 'bottom', delay: 18, mono: true },
  { text: '12h 40m', x: 1322, y: 872, size: 46, color: COLORS.ink, from: 'right', delay: 19 },
  { text: 'USED', x: 1316, y: 560, size: 20, color: COLORS.ink, from: 'right', delay: 20, mono: true }
]

function DataFragment({ fragment, frame }: { fragment: Fragment; frame: number }) {
  const start = fragment.delay
  const progress = EASE.outExpo(Math.min(1, Math.max(0, (frame - start) / 13)))
  // The field dissolves the moment the headline lands.
  const fade = interpolate(frame, [26, 38], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const offset = 320 * (1 - progress)
  const transform =
    fragment.from === 'left' ? `translateX(${-offset}px)`
      : fragment.from === 'right' ? `translateX(${offset}px)`
        : fragment.from === 'top' ? `translateY(${-offset}px)`
          : `translateY(${offset}px)`

  return (
    <div style={{ position: 'absolute', left: fragment.x, top: fragment.y, transform, opacity: fade }}>
      {fragment.mono ? (
        <Mono size={fragment.size} color={fragment.color} tracking={0.14}>
          {fragment.text}
        </Mono>
      ) : (
        <div
          style={{
            fontFamily: 'Archivo, Archivo Black, sans-serif',
            fontSize: fragment.size,
            fontWeight: 900,
            fontVariationSettings: "'wght' 900",
            letterSpacing: '-0.02em',
            lineHeight: 0.9,
            color: fragment.color
          }}
        >
          {fragment.text}
        </div>
      )}
    </div>
  )
}

/**
 * SEQUENCE 02 - A COMPLEXIDADE DESNECESSÁRIA.
 *
 * Seven tools, thirty different numbers, no single place to look. The field
 * of data dissolves into the question it should have been all along.
 */
export function S02Excess() {
  const frame = useCurrentFrame()

  // Beat 1 - the data field collapses into one statement.
  const beat1In = Math.min(1, Math.max(0, (frame - 26) / 8))
  const beat1Out = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 48) / 8)))

  // Beat 2 - the real question.
  const beat2In = Math.min(1, Math.max(0, (frame - 54) / 8))
  const beat2Out = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 84) / 8)))

  // Beat 3 - the answer is not a dashboard.
  const beat3In = Math.min(1, Math.max(0, (frame - 90) / 8))

  return (
    <AbsoluteFill>
      {FRAGMENTS.map((fragment, index) => (
        <DataFragment key={index} fragment={fragment} frame={frame} />
      ))}

      {/* Two brand rules holding the frame while the data flies in. */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 500,
          width: 240 * beat1In,
          height: 14,
          background: COLORS.green
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 1700,
          top: 470,
          width: 180 * beat1In,
          height: 14,
          background: COLORS.amber
        }}
      />

      {frame < 56 ? (
        <div
          style={{
            position: 'absolute',
            left: 96,
            top: 296,
            opacity: beat1In * (1 - beat1Out),
            transform: `translateY(${-120 * beat1Out}px)`
          }}
        >
          <Kinetic
            text="TUDO ISSO..."
            size={236}
            lineHeight={0.84}
            from={26}
            duration={9}
            perWord={(index) => ({ delay: index * 1.2, duration: 8, easing: EASE.outExpo, scaleFrom: 1.05 })}
          />
        </div>
      ) : null}

      {frame >= 50 && frame < 88 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: 96,
              top: 214,
              opacity: beat2In * (1 - beat2Out),
              transform: `translateY(${-140 * beat2Out}px)`
            }}
          >
            <Kinetic
              text="...SÓ PRA VER"
              size={190}
              lineHeight={0.86}
              from={54}
              duration={9}
              perWord={(index) => ({ delay: index * 1.1, duration: 8, easing: EASE.outExpo })}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 96,
              top: 386,
              opacity: beat2In * (1 - beat2Out),
              transform: `translateY(${-140 * beat2Out}px)`
            }}
          >
            <Kinetic
              text="SEU USO?"
              size={206}
              lineHeight={0.84}
              from={58}
              duration={10}
              perWord={(index) => ({
                delay: index * 1.4,
                duration: 9,
                easing: EASE.outExpo,
                background: index === 1 ? COLORS.green : undefined,
                color: index === 1 ? COLORS.ink : undefined,
                paddingX: index === 1 ? 26 : undefined
              })}
            />
          </div>
        </>
      ) : null}

      {frame >= 86 ? (
        <div style={{ position: 'absolute', left: 96, top: 330, opacity: beat3In }}>
          <Kinetic
            text="PRA QUÊ?"
            size={300}
            lineHeight={0.84}
            from={90}
            duration={11}
            perWord={(index) => ({
              delay: index * 1.6,
              duration: 10,
              easing: EASE.outExpo,
              scaleFrom: 1.06
            })}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
