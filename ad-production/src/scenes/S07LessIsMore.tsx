import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Ant, Tank, WidokenIcon } from '../brand/Illustrations'
import { COLORS, EASE } from '../brand/tokens'
import { Kinetic } from '../motion/Kinetic'
import { ProductShot } from '../product/ProductShot'

/**
 * SEQUENCE 07 - MENOS É MAIS.
 *
 * The metaphor returns for one last time. The tank drives out of the frame
 * and the icon takes over; the real widget docks to the screen edge.
 */
export function S07LessIsMore() {
  const frame = useCurrentFrame()

  // The tank leaves the frame to the left.
  const tankOut = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 26) / 26)))
  const tankX = 120 - 900 * tankOut

  // The icon takes the tank's place.
  const iconIn = EASE.outBack(Math.min(1, Math.max(0, (frame - 52) / 22)))
  const iconX = -420 + 540 * iconIn

  const line1 = Math.min(1, Math.max(0, (frame - 4) / 9))
  const line2 = Math.min(1, Math.max(0, (frame - 12) / 9))
  const swap = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 52) / 10)))
  const line3 = Math.min(1, Math.max(0, (frame - 56) / 9))
  const line4 = Math.min(1, Math.max(0, (frame - 62) / 9))

  // The real widget returns, docked to the edge.
  const dock = EASE.outQuint(Math.min(1, Math.max(0, (frame - 76) / 20)))
  const stripX = 1790 + 250 * (1 - dock)
  const stripOpacity = Math.min(1, Math.max(0, (frame - 76) / 8))

  const antX = 150 + frame * 8.5

  return (
    <AbsoluteFill>
      <Tank width={560} style={{ position: 'absolute', left: tankX, top: 596, zIndex: 2 }} />

      <div style={{ position: 'absolute', left: 96, top: 130, opacity: line1 * (1 - swap) }}>
        <Kinetic
          text="MENOS"
          size={236}
          lineHeight={0.84}
          from={4}
          duration={11}
          perWord={() => ({ delay: 0, duration: 11, easing: EASE.outExpo })}
        />
      </div>
      <div style={{ position: 'absolute', left: 96, top: 328, opacity: line2 * (1 - swap) }}>
        <Kinetic
          text="COMPLICAÇÃO."
          size={190}
          lineHeight={0.84}
          from={12}
          duration={11}
          perWord={() => ({ delay: 0, duration: 11, easing: EASE.outExpo })}
        />
      </div>

      <div style={{ position: 'absolute', left: 96, top: 130, opacity: line3 }}>
        <Kinetic
          text="MAIS"
          size={236}
          lineHeight={0.84}
          from={56}
          duration={11}
          perWord={() => ({ delay: 0, duration: 11, easing: EASE.outExpo })}
        />
      </div>
      <div style={{ position: 'absolute', left: 96, top: 328, opacity: line4 }}>
        <Kinetic
          text="CONTROLE."
          size={236}
          lineHeight={0.84}
          from={62}
          duration={11}
          perWord={() => ({
            delay: 0,
            duration: 11,
            easing: EASE.outExpo,
            background: COLORS.green,
            color: COLORS.ink,
            paddingX: 26
          })}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: iconX,
          top: 560,
          opacity: Math.min(1, Math.max(0, (frame - 52) / 8))
        }}
      >
        <WidokenIcon size={300} />
      </div>

      <Ant width={64} phase={(frame / 7) % 1} style={{ position: 'absolute', left: antX, top: 900, zIndex: 8 }} />

      <ProductShot
        capture="widget-vertical"
        x={stripX}
        y={146}
        width={120}
        opacity={stripOpacity}
      />
    </AbsoluteFill>
  )
}
