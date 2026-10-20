import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { EASE } from '../brand/tokens'
import { Kinetic } from '../motion/Kinetic'
import { ActivityStrip } from '../product/ProductShot'

/**
 * SEQUENCE 06 - ACOMPANHAMENTO DE ATIVIDADE.
 *
 * The real orbit animation of the usage ring, sampled from the running
 * widget, plus a 2D push toward the provider that is working.
 */
export function S06Activity() {
  const frame = useCurrentFrame()

  const line1 = Math.min(1, Math.max(0, (frame - 4) / 9))
  const line2 = Math.min(1, Math.max(0, (frame - 12) / 9))

  // The question leaves, the answer arrives.
  const swap = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 54) / 10)))
  const answer = Math.min(1, Math.max(0, (frame - 58) / 10))

  const shotIn = EASE.outQuint(Math.min(1, Math.max(0, (frame - 2) / 18)))
  const shotOpacity = Math.min(1, Math.max(0, (frame - 2) / 8))

  // A slow 2D push toward the provider that is working.
  const push = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 62) / 56)))
  const zoom = 1 + 0.46 * push

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 96, top: 140, opacity: line1 * (1 - swap) }}>
        <Kinetic
          text="SUA IA"
          size={140}
          lineHeight={0.86}
          from={4}
          duration={10}
          perWord={() => ({ delay: 0, duration: 10, easing: EASE.outExpo })}
        />
      </div>
      <div style={{ position: 'absolute', left: 96, top: 260, opacity: line2 * (1 - swap) }}>
        <Kinetic
          text="TÁ TRABALHANDO?"
          size={132}
          lineHeight={0.86}
          from={12}
          duration={10}
          perWord={(index) => ({ delay: index * 1.2, duration: 9, easing: EASE.outExpo })}
        />
      </div>

      <div style={{ position: 'absolute', left: 96, top: 470, opacity: answer }}>
        <Kinetic
          text="VOCÊ SABE."
          size={200}
          lineHeight={0.84}
          from={58}
          duration={12}
          perWord={(index) => ({ delay: index * 1.4, duration: 11, easing: EASE.outExpo })}
        />
      </div>

      {/* The activity capture, pushed in on the working provider. */}
      <div
        style={{
          position: 'absolute',
          left: 1470 + 60 * (1 - shotIn),
          top: 240 + 40 * (1 - shotIn),
          width: 380,
          height: 380,
          overflow: 'hidden',
          opacity: shotOpacity
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `scale(${zoom})`,
            transformOrigin: '50% 46%'
          }}
        >
          <ActivityStrip
            x={0}
            y={0}
            width={380}
            crop={{ x: 118, y: 190, width: 252, height: 252 }}
            from={0}
          />
        </div>
      </div>
    </AbsoluteFill>
  )
}
