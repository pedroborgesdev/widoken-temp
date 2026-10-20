import React from 'react'
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
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
const THEMES = [
  ['monokai-black', 'MONOKAI BLACK'],
  ['dark', 'DARK'],
  ['slate', 'SLATE'],
  ['dracula', 'DRACULA'],
  ['nord', 'NORD'],
  ['catppuccin', 'CATPPUCCIN'],
  ['tokyo-night', 'TOKYO NIGHT'],
  ['gruvbox', 'GRUVBOX'],
  ['one-dark', 'ONE DARK'],
  ['solarized-dark', 'SOLARIZED'],
  ['monokai', 'MONOKAI']
] as const

const KEYS: Array<{ f: number; cam: Camera }> = [
  { f: 0, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.0 } },
  { f: 16, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.0 } },
  { f: 60, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.0 } },
  { f: 88, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.5 } },
  { f: 112, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.5 } },
  { f: 138, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.0 } },
  { f: 154, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.0 } },
  { f: 180, cam: { focusX: strip.x, focusY: strip.y, atX: 960, atY: 470, scale: 3.0 } }
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

  const typeOut = EASE.inOutCubic(clamp((frame - 84) / 12))
  const themesIn = EASE.outQuint(clamp((frame - 92) / 12))
  const themesOut = EASE.inOutCubic(clamp((frame - 156) / 8))
  const widgetReturn = EASE.outQuint(clamp((frame - 162) / 12))
  const widgetOpacity = clamp(1 - themesIn + widgetReturn)

  return (
    <AbsoluteFill>
      <Shot name={WIDGET} camera={camera} opacity={widgetOpacity} />

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

      {/* Eleven real, unmodified theme captures. They enter as a system and
          clear together so S05 receives the same horizontal widget framing. */}
      <div style={{ position: 'absolute', inset: 0, opacity: themesIn * (1 - themesOut) }}>
        <div style={{ position: 'absolute', left: 84, top: 165, width: 470 }}>
          <Words
            text="11 TEMAS."
            size={112}
            lineHeight={0.86}
            from={94}
            duration={9}
            spec={() => ({ dir: 'up', easing: EASE.outExpo })}
          />
          <div style={{ height: 28 }} />
          <Words
            lines={['O MESMO', 'CONTROLE.']}
            size={61}
            weight={700}
            tracking={-0.015}
            lineHeight={1.02}
            color={COLORS.inkSoft}
            from={102}
            duration={9}
            stagger={1.5}
            spec={() => ({ dir: 'wipeRight', easing: EASE.outQuint })}
          />
          <div style={{ marginTop: 42 }}>
            <Mono size={21} color={COLORS.inkMuted} tracking={0.13}>
              VISUAL DIFERENTE.{`\n`}LEITURA CONSISTENTE.
            </Mono>
          </div>
        </div>

        {THEMES.map(([id, label], index) => {
          const row = index < 6 ? 0 : 1
          const column = row === 0 ? index : index - 6
          const enter = EASE.outQuint(clamp((frame - 94 - index * 2) / 10))
          const left = 632 + column * 196
          const top = row === 0 ? 82 : 548
          return (
            <div
              key={id}
              style={{
                position: 'absolute',
                left,
                top: top + (1 - enter) * 52,
                width: 174,
                height: 432,
                opacity: enter,
                textAlign: 'center'
              }}
            >
              <Img
                src={staticFile(`product/themes/${id}.png`)}
                style={{ width: 108, height: 332, objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
              <Mono size={15} color={COLORS.inkSoft} tracking={0.05} align="center" style={{ marginTop: 12 }}>
                {label}
              </Mono>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
