import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { WidokenIcon } from '../art'
import { COLORS, EASE, clamp } from '../tokens'
import { Mono, Words } from '../type'
import { Shot, capture, centre } from '../product'

/**
 * S03 · REVEAL  (00:10–00:15)
 *
 * Black. A white circle opens. The official icon is already inside it.
 * The circle becomes the page; the icon becomes the lockup; the real
 * widget arrives at the edge it actually docks to.
 */

const VERTICAL = 'widget-vertical' as const
const pill = centre(VERTICAL, 'pill')

export function S03Reveal() {
  const frame = useCurrentFrame()

  // The black frame is opened by a white disc. The disc stops as a bounded
  // circle — black corners, icon held inside — and only then floods the page.
  // (A disc that filled the frame in one move left a near-empty white frame
  // for a full second at 00:11.)
  const open = EASE.outExpo(clamp((frame - 1) / 24))
  const flood = EASE.inOutCubic(clamp((frame - 30) / 34))
  const discR = 620 * open + 1120 * flood

  // The icon pops inside the disc, then travels into the lockup. The travel
  // has to finish before the wordmark rises, or the W lands on the icon.
  const pop = EASE.outBack(clamp((frame - 8) / 12))
  const settle = EASE.inOutCubic(clamp((frame - 32) / 12))
  const iconSize = 560 * (0.8 + 0.2 * pop) * (1 - 0.643 * settle)
  const iconCx = 960 + (210 - 960) * settle
  const iconCy = 540 + (290 - 540) * settle

  // The wordmark rises letter by letter.
  const wordIn = clamp((frame - 43) / 1)
  const promise = EASE.outExpo(clamp((frame - 78) / 10))
  const promise2 = EASE.outQuint(clamp((frame - 96) / 12))

  // The widget slides in from the right edge while the name rises: the left
  // half of the frame is the brand, the right half is the proof.
  const dock = EASE.outQuint(clamp((frame - 38) / 14))
  const widgetScale = 840 / 390
  const widgetX = 1449 + (1 - dock) * 420

  // Hand-off to S04: a slow push into the cut.
  const push = EASE.inCubic(clamp((frame - 138) / 12))

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${1 + push * 0.05})`,
          transformOrigin: '46% 46%',
          background: COLORS.paper,
          clipPath: `circle(${discR}px at 960px 540px)`,
          WebkitClipPath: `circle(${discR}px at 960px 540px)`
        }}
      >
        {/* The real widget, at its real proportions, fully legible. */}
        <Shot
          name={VERTICAL}
          camera={{
            focusX: pill.x,
            focusY: pill.y,
            atX: 1580,
            atY: 540,
            scale: widgetScale
          }}
          style={{ opacity: dock, transform: `translateX(${widgetX - 1449}px)` }}
        />

        {/* Lockup */}
        <div style={{ position: 'absolute', left: iconCx - iconSize / 2, top: iconCy - iconSize / 2 }}>
          <WidokenIcon size={iconSize} />
        </div>

        <div style={{ position: 'absolute', left: 350, top: 196, opacity: wordIn }}>
          <Words
            text="WIDOKEN"
            size={222}
            tracking={-0.045}
            lineHeight={0.84}
            from={43}
            duration={6}
            stagger={0.8}
            split="letter"
            spec={(index) => ({
              dir: 'up',
              easing: index < 3 ? EASE.outExpo : EASE.outQuint,
              distance: 1.05
            })}
          />
        </div>

        <div style={{ position: 'absolute', left: 84, top: 470, opacity: promise }}>
          <Words
            text="SIMPLES."
            size={252}
            lineHeight={0.82}
            from={78}
            duration={8}
            spec={() => ({ dir: 'up', easing: EASE.outExpo, scaleFrom: 1.04 })}
          />
        </div>

        <div style={{ position: 'absolute', left: 84, top: 792, opacity: promise2 }}>
          <Words
            text="COMO DEVERIA SER."
            size={78}
            weight={600}
            tracking={-0.01}
            lineHeight={1}
            color={COLORS.inkSoft}
            from={96}
            duration={10}
            stagger={2.2}
            spec={() => ({ dir: 'wipeRight', easing: EASE.outQuint })}
          />
        </div>

        {/* The claim is a product statement, not a slogan on a slide. */}
        <div
          style={{
            position: 'absolute',
            left: 86,
            top: 912,
            opacity: clamp((frame - 108) / 10)
          }}
        >
          <Mono size={24} color={COLORS.inkMuted} tracking={0.14}>
            USO · LIMITE · RENOVAÇÃO — SEM ABRIR OUTRA ABA
          </Mono>
        </div>
      </div>
    </AbsoluteFill>
  )
}
