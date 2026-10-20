import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { COLORS, EASE, clamp } from '../tokens'
import { Mono, Words } from '../type'
import { Camera, Shot, centre, lerpCamera } from '../product'

/**
 * S04 · UM SÓ LUGAR  (00:15–00:21)
 *
 * The horizontal widget is the frame, not an illustration beside the copy.
 * The camera enters wide, punches in on the beat, pulls back, and finally
 * travels into the Cursor ring — which is exactly where S05 begins.
 */

const WIDGET = 'widget-horizontal' as const
const strip = centre(WIDGET, 'pill')
const cursor = centre(WIDGET, 'cursor')

const KEYS: Array<{ f: number; cam: Camera }> = [
  { f: 0, cam: { focusX: strip.x, focusY: strip.y, atX: 1760, atY: 470, scale: 3.0 } },
  { f: 16, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.0 } },
  { f: 60, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.0 } },
  { f: 88, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.5 } },
  { f: 112, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.5 } },
  { f: 138, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.0 } },
  { f: 154, cam: { focusX: strip.x, focusY: strip.y, atX: 900, atY: 470, scale: 3.35 } },
  { f: 180, cam: { focusX: cursor.x, focusY: cursor.y, atX: 1360, atY: 470, scale: 10.5 } }
]

function cameraAt(frame: number): Camera {
  if (frame <= KEYS[0].f) return KEYS[0].cam
  for (let i = 0; i < KEYS.length - 1; i += 1) {
    const a = KEYS[i]
    const b = KEYS[i + 1]
    if (frame <= b.f) {
      const p = EASE.inOutCubic(clamp((frame - a.f) / (b.f - a.f)))
      return lerpCamera(a.cam, b.cam, p)
    }
  }
  return KEYS[KEYS.length - 1].cam
}

export function S04OnePlace() {
  const frame = useCurrentFrame()
  const camera = cameraAt(frame)

  const typeOut = EASE.inOutCubic(clamp((frame - 142) / 12))

  return (
    <AbsoluteFill>
      <Shot name={WIDGET} camera={camera} />

      {/* Type above the strip. */}
      <div
        style={{
          position: 'absolute',
          left: 84,
          top: 52 - typeOut * 150,
          opacity: 1 - typeOut
        }}
      >
        <Words
          text="SUAS IAS."
          size={240}
          tracking={-0.035}
          lineHeight={0.82}
          from={22}
          duration={9}
          stagger={2}
          spec={(index) => ({
            dir: 'up',
            easing: EASE.outExpo,
            scaleFrom: index === 1 ? 1.04 : 1
          })}
        />
      </div>

      {/* Type below the strip, right-aligned: the composition is asymmetric. */}
      <div
        style={{
          position: 'absolute',
          right: 84,
          top: 792 + typeOut * 150,
          opacity: 1 - typeOut
        }}
      >
        <Words
          text="UM SÓ LUGAR."
          size={240}
          tracking={-0.035}
          lineHeight={0.82}
          align="right"
          from={50}
          duration={10}
          stagger={2.2}
          spec={(_index, word) => ({
            dir: 'up',
            easing: EASE.outExpo,
            scaleFrom: word.startsWith('LUGAR') ? 1.03 : 1
          })}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          right: 86,
          top: 100,
          opacity: clamp((frame - 40) / 10) * (1 - typeOut),
          textAlign: 'right'
        }}
      >
        <Mono size={25} color={COLORS.inkSoft} tracking={0.16} align="right">
          7 INTEGRAÇÕES{'\n'}1 WIDGET
        </Mono>
      </div>
    </AbsoluteFill>
  )
}
