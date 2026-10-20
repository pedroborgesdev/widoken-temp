import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { COLORS, EASE, clamp } from '../tokens'
import { Mono, Words } from '../type'
import { ActivityShot, Camera, Shot, centre, lerpCamera } from '../product'

/**
 * S06 · TRABALHANDO  (00:27–00:31)
 *
 * Normal → working → normal, always inside the recognisable widget.
 * The close-up is a real camera move over the real capture; the orbit is
 * the application's own activity animation (33 frames sampled across its
 * 2.2 s period and played back at real speed).
 */

const PLAIN = 'widget-vertical' as const
const pill = centre(PLAIN, 'pill') // (61, 247)
const claude = centre(PLAIN, 'claude') // (61, 79)

const KEYS: Array<{ f: number; cam: Camera }> = [
  { f: 0, cam: { focusX: pill.x, focusY: pill.y, atX: 863, atY: 596, scale: 2.45 } },
  { f: 26, cam: { focusX: claude.x, focusY: claude.y, atX: 1700, atY: 470, scale: 6.2 } },
  { f: 58, cam: { focusX: claude.x, focusY: claude.y, atX: 1700, atY: 470, scale: 6.2 } },
  { f: 88, cam: { focusX: pill.x, focusY: pill.y, atX: 1480, atY: 540, scale: 2.0 } },
  { f: 120, cam: { focusX: pill.x, focusY: pill.y, atX: 1480, atY: 540, scale: 2.0 } }
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

export function S06Activity() {
  const frame = useCurrentFrame()
  const camera = cameraAt(frame)

  const working = frame >= 8 && frame < 90
  const disc = EASE.outCubic(clamp((frame - 110) / 9))
  const discR = 2300 * disc

  const typeOut = EASE.inOutCubic(clamp((frame - 60) / 8))
  const typeIn = EASE.outExpo(clamp((frame - 76) / 8))
  const typeIn2 = EASE.outExpo(clamp((frame - 84) / 8))

  return (
    <AbsoluteFill>
      {working ? (
        <ActivityShot camera={camera} frame={frame} from={8} />
      ) : (
        <Shot name={PLAIN} camera={camera} />
      )}

      {/* Working state copy, on the left of the close-up. */}
      <div
        style={{
          position: 'absolute',
          left: 84,
          top: 360 - typeOut * 140,
          opacity: 1 - typeOut
        }}
      >
        <Words
          text="SUA IA TÁ"
          size={180}
          lineHeight={0.84}
          from={22}
          duration={9}
          stagger={2.4}
          spec={() => ({ dir: 'up', easing: EASE.outExpo, scaleFrom: 1.03 })}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 84,
          top: 530 - typeOut * 140,
          opacity: 1 - typeOut
        }}
      >
        <Words
          text="TRABALHANDO?"
          size={180}
          lineHeight={0.84}
          from={30}
          duration={9}
          stagger={2.4}
          spec={() => ({ dir: 'up', easing: EASE.outExpo })}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 86,
          top: 800,
          opacity: clamp((frame - 40) / 8) * (1 - typeOut)
        }}
      >
        <Mono size={25} color={COLORS.inkSoft} tracking={0.14}>
          INDICADOR DE ATIVIDADE · TEMPO REAL
        </Mono>
      </div>

      {/* Resolved state copy, on the left of the full widget. */}
      <div style={{ position: 'absolute', left: 84, top: 300, opacity: typeIn }}>
        <Words
          text="AGORA"
          size={184}
          lineHeight={0.84}
          from={76}
          duration={9}
          spec={() => ({ dir: 'up', easing: EASE.outExpo, scaleFrom: 1.03 })}
        />
      </div>
      <div style={{ position: 'absolute', left: 84, top: 486, opacity: typeIn2 }}>
        <Words
          text="VOCÊ SABE."
          size={184}
          lineHeight={0.84}
          from={84}
          duration={9}
          stagger={2.6}
          spec={() => ({ dir: 'up', easing: EASE.outExpo })}
        />
      </div>

      {/* The ring closes the scene: the same circle, now the wipe into black. */}
      <div
        style={{
          position: 'absolute',
          left: 1480 - discR,
          top: 204 - discR,
          width: discR * 2,
          height: discR * 2,
          borderRadius: '50%',
          background: COLORS.surface,
          opacity: disc > 0 ? 1 : 0
        }}
      />
    </AbsoluteFill>
  )
}
