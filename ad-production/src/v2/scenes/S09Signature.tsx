import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { WidokenIcon } from '../art'
import { COLORS, EASE, clamp } from '../tokens'
import { Mono, Words } from '../type'
import { Shot, centre } from '../product'

/**
 * S09 · ASSINATURA  (00:39–00:44)
 *
 * The signature is built element by element and then held, without motion,
 * for 3.8 s. Icon, name, real widget, call to action, official address.
 */

const PLAIN = 'widget-vertical' as const
const pill = centre(PLAIN, 'pill')
const WIDGET_SCALE = 840 / 390
const WIDGET_AT = { x: 1580, y: 540 }

export function S09Signature() {
  const frame = useCurrentFrame()

  // The icon continues exactly from the last frame of S08.
  const settle = EASE.inOutCubic(clamp(frame / 18))
  const iconSize = 320 + (200 - 320) * settle
  const iconCx = 960 + (210 - 960) * settle
  const iconCy = 500 + (290 - 500) * settle

  const wordIn = clamp((frame - 5) / 1)
  const dock = EASE.outQuint(clamp((frame - 8) / 12))
  const ctaIn = EASE.outExpo(clamp((frame - 12) / 10))
  const urlIn = EASE.outQuint(clamp((frame - 20) / 9))
  const noteIn = clamp((frame - 27) / 8)

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      {/* The real widget, at the edge it actually docks to. */}
      <Shot
        name={PLAIN}
        camera={{
          focusX: pill.x,
          focusY: pill.y,
          atX: WIDGET_AT.x,
          atY: WIDGET_AT.y,
          scale: WIDGET_SCALE
        }}
        style={{ opacity: dock, transform: `translateX(${(1 - dock) * 360}px)` }}
      />

      <div
        style={{
          position: 'absolute',
          left: iconCx - iconSize / 2,
          top: iconCy - iconSize / 2
        }}
      >
        <WidokenIcon size={iconSize} />
      </div>

      <div style={{ position: 'absolute', left: 350, top: 196, opacity: wordIn }}>
        <Words
          text="WIDOKEN"
          size={222}
          tracking={-0.045}
          lineHeight={0.84}
          from={5}
          duration={9}
          stagger={1.4}
          split="letter"
          spec={(index) => ({
            dir: 'up',
            easing: index < 3 ? EASE.outExpo : EASE.outQuint,
            distance: 1.05
          })}
        />
      </div>

      <div style={{ position: 'absolute', left: 84, top: 470, opacity: ctaIn }}>
        <Words
          text="BAIXE O WIDOKEN."
          size={88}
          weight={800}
          tracking={-0.025}
          lineHeight={0.92}
          from={12}
          duration={9}
          stagger={1.5}
          spec={() => ({ dir: 'wipeRight', easing: EASE.outQuint })}
        />
      </div>

      <div style={{ position: 'absolute', left: 86, top: 618, opacity: urlIn }}>
        <Mono size={34} weight={400} tracking={0.01} color={COLORS.ink} uppercase={false}>
          github.com/pedroborgesdev/widoken
        </Mono>
        <div style={{ height: 8 }} />
        <Mono size={34} weight={400} tracking={0.01} color={COLORS.ink} uppercase={false}>
          releases/latest
        </Mono>
      </div>

      <div style={{ position: 'absolute', left: 86, top: 790, opacity: noteIn }}>
        <Mono size={26} color={COLORS.inkMuted} tracking={0.12}>
          SEU USO DE IA, À VISTA. NO DESKTOP.
        </Mono>
      </div>
    </AbsoluteFill>
  )
}
