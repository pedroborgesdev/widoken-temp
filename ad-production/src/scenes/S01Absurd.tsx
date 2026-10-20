import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Ant, Tank } from '../brand/Illustrations'
import { COLORS, EASE } from '../brand/tokens'
import { HaloType, Kinetic } from '../motion/Kinetic'

/**
 * SEQUENCE 01 - O ABSURDO.
 *
 * A tiny ant crosses the frame. A flat vector tank arrives, grotesquely
 * oversized, and points at it without ever firing. The headline interrupts
 * the illustration instead of sitting above it.
 */
export function S01Absurd() {
  const frame = useCurrentFrame()

  // The ant keeps walking right, unaware of the overkill arriving behind it.
  const antX = 1150 + frame * 3.9
  const antPhase = (frame / 7) % 1

  // The tank rolls in from the left and settles, dwarfing everything.
  const tankEnter = EASE.outCubic(Math.min(1, Math.max(0, (frame - 10) / 58)))
  const tankX = -1480 + tankEnter * 1540
  const tankY = 330 + Math.sin(frame * 0.9) * 1.6

  // The graphic cut at 96f: the tank is gone and a green field takes over.
  const band = EASE.outQuint(Math.min(1, Math.max(0, (frame - 96) / 9)))
  const cut = Math.min(1, Math.max(0, (frame - 100) / 7))

  const headline = (
    <>
      <div style={{ position: 'absolute', left: 96, top: 66, zIndex: 4 }}>
        <HaloType
          halo="16px"
          text="UM TANQUE"
          size={236}
          lineHeight={0.82}
          from={16}
          duration={12}
          perWord={(index) => {
            if (index === 0) return { delay: 0, duration: 9, easing: EASE.outQuint }
            return { delay: 5, duration: 15, easing: EASE.outExpo, scaleFrom: 1.05 }
          }}
        />
      </div>
      <div style={{ position: 'absolute', left: 96, top: 260, zIndex: 4 }}>
        <HaloType
          halo="14px"
          text="DE GUERRA..."
          size={190}
          lineHeight={0.82}
          from={26}
          duration={12}
          perWord={(index) => {
            if (index === 0) return { delay: 0, duration: 9, easing: EASE.outQuint, offsetX: -18 }
            return { delay: 3, duration: 13, easing: EASE.outExpo, scaleFrom: 1.04, offsetX: -18 }
          }}
        />
      </div>
    </>
  )

  return (
    <AbsoluteFill>
      {frame < 96 ? (
        <>
          <Tank
            width={1400}
            style={{
              position: 'absolute',
              left: tankX,
              top: tankY,
              zIndex: 2
            }}
          />
          {headline}
        </>
      ) : null}

      {/* --- graphic cut --- */}
      {band > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 1920,
            height: 420 * band,
            background: COLORS.green,
            zIndex: 6
          }}
        />
      ) : null}

      {cut > 0 ? (
        <>
          <div style={{ position: 'absolute', left: 96, top: 104, zIndex: 7, opacity: cut }}>
            <Kinetic
              text="...PRA MATAR UMA"
              size={180}
              lineHeight={0.86}
              from={100}
              duration={13}
              perWord={(index) => ({ delay: index * 1.4, duration: 12, easing: EASE.outExpo })}
            />
          </div>
          <div style={{ position: 'absolute', left: 96, bottom: 68, zIndex: 7, opacity: cut }}>
            <Kinetic
              text="FORMIGA?"
              size={300}
              lineHeight={0.8}
              from={104}
              duration={15}
              perWord={(index) => ({
                delay: index * 2,
                duration: 15,
                easing: EASE.outExpo,
                scaleFrom: 1.04
              })}
            />
          </div>
        </>
      ) : null}

      {/* The ant, tiny, walking the bottom of the frame. */}
      <Ant
        width={78}
        phase={antPhase}
        style={{ position: 'absolute', left: antX, top: 944, zIndex: 8 }}
      />
    </AbsoluteFill>
  )
}
