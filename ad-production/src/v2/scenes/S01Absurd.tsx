import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Ant, TankHull, TankTrack, TANK_WHEEL_CX, TANK_WHEEL_CY, TANK_WHEEL_R } from '../art'
import { COLORS, EASE, clamp } from '../tokens'
import { Words } from '../type'

/**
 * S01 · O ABSURDO  (00:00–00:05)
 *
 * 00:00–00:01   an ant crosses the empty frame.
 * 00:01–00:02.3 an oversized tank arrives and stops like a building.
 * 00:02.3–00:04.2 the lettering takes over the composition.
 * 00:04.2–00:05   the hull drives out, the six road wheels detach and travel
 *                 to the exact positions where S02's meters will bloom.
 */

const TANK_W = 1650
const TANK_TOP = 400
const TANK_X = -60

/** Where the wheels land: the marker centres of S02's six meters. */
export const METER_MARKERS: Array<[number, number]> = [
  [118, 142],
  [722, 118],
  [1322, 172],
  [132, 492],
  [722, 612],
  [1372, 492]
]

const WHEEL_R = (TANK_WHEEL_R / 900) * TANK_W
const wheelStart = TANK_WHEEL_CX.map((cx) => ({
  x: TANK_X + (cx / 900) * TANK_W,
  y: TANK_TOP + (TANK_WHEEL_CY / 900) * TANK_W
}))

/** Handoff frames. Kept explicit so the cut at 150 is exact. */
const TYPE_OUT = 130
const HULL_OUT = 134
const WHEELS_OUT = 138
const TRACK_OUT = 142

export function S01Absurd() {
  const frame = useCurrentFrame()

  // Ant: a steady walk cycle, never a tween. It is already crossing when the
  // film cuts in — starting it off-frame left a blank white first frame.
  const antX = 30 + frame * 14.5
  const antY = 1000 + Math.sin(frame * 0.65) * 2.5
  const antPhase = (frame / 7) % 1

  // Tank arrival: fast, mechanical, with a two-frame recoil on the stop.
  const entry = EASE.outMechanical(clamp((frame - 30) / 40))
  const recoil = frame > 69 && frame < 76 ? Math.sin((frame - 69) * 1.9) * 9 : 0
  const tankX = -1900 + (TANK_X + 1900) * entry + recoil

  // The whole frame takes the impact of the stop.
  const shake = frame >= 69 && frame < 74 ? Math.sin((frame - 69) * 3.2) * 7 : 0

  const typeOut = EASE.inOutCubic(clamp((frame - TYPE_OUT) / 10))
  const hullOut = EASE.inCubic(clamp((frame - HULL_OUT) / 14))
  const trackOut = EASE.inCubic(clamp((frame - TRACK_OUT) / 6))

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${shake}px)` }}>
        {/* Hull, turret and barrel. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translateX(${tankX + hullOut * 2700}px)`
          }}
        >
          <TankHull width={TANK_W} style={{ position: 'absolute', left: 0, top: TANK_TOP }} />
        </div>

        {/* The track stays behind, then leaves once the wheels are handed off. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translateX(${tankX + trackOut * 2700}px)`
          }}
        >
          <TankTrack
            width={TANK_W}
            wheels={frame < WHEELS_OUT}
            style={{ position: 'absolute', left: 0, top: TANK_TOP }}
          />
        </div>

        {/* Six wheels in flight: exact circles, continued by S02. */}
        {frame >= WHEELS_OUT
          ? wheelStart.map((start, index) => {
              const target = METER_MARKERS[index]
              const delay = 0
              // The flight lasts until the very last frame of S01, so the
              // wheels are still airborne (large, readable) when S02 begins.
              const p = EASE.inOutCubic(clamp((frame - WHEELS_OUT - delay) / 12))
              const x = start.x + (target[0] - start.x) * p
              const y =
                start.y +
                (target[1] - start.y) * p -
                Math.sin(p * Math.PI) * (70 + index * 12)
              const r = WHEEL_R + (22 - WHEEL_R) * p
              return (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: x - r,
                    top: y - r,
                    width: r * 2,
                    height: r * 2,
                    borderRadius: '50%',
                    background: COLORS.ringIdle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div
                    style={{
                      width: r * 2 * (0.33 + 0.33 * p),
                      height: r * 2 * (0.33 + 0.33 * p),
                      borderRadius: '50%',
                      background: COLORS.ink
                    }}
                  />
                </div>
              )
            })
          : null}

        {/* Type: monumental, entering after the mass has landed. */}
        <div
          style={{
            position: 'absolute',
            left: 84,
            top: 78 - typeOut * 200,
            opacity: 1 - typeOut
          }}
        >
          <Words
            text="UM TANQUE"
            size={276}
            lineHeight={0.82}
            from={70}
            duration={11}
            stagger={3}
            spec={(index) => ({
              dir: 'up',
              easing: index === 0 ? EASE.outQuint : EASE.outExpo,
              scaleFrom: index === 0 ? 1 : 1.045
            })}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 84,
            top: 356 - typeOut * 260,
            opacity: 1 - typeOut
          }}
        >
          <Words
            lines={['DE GUERRA?']}
            size={240}
            lineHeight={0.84}
            from={81}
            duration={11}
            stagger={3}
            spec={(_index, word) => ({
              dir: 'up',
              easing: EASE.outExpo,
              scaleFrom: 1.035,
              color: word.startsWith('GUERRA') ? COLORS.red : COLORS.ink
            })}
          />
        </div>

        {/* The ant, in front of everything, at the scale that makes the joke. */}
        <Ant
          width={96}
          phase={antPhase}
          style={{ position: 'absolute', left: antX, top: antY, zIndex: 6 }}
        />
      </div>
    </AbsoluteFill>
  )
}
