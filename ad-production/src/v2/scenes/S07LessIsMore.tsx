import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { COLORS, EASE, clamp } from '../tokens'
import { Mono, SwapLine } from '../type'
import { Shot, centre } from '../product'
import { Tank } from '../art'

/**
 * S07 · PROPORÇÃO  (00:31–00:35)
 *
 * The overkill leaves the frame for good. A white tank drives across the
 * black surface, the surface itself contracts into the widget's board, and
 * the real widget is what remains. "Menos complicação" is not a caption:
 * it is what just happened.
 */

const PLAIN = 'widget-vertical' as const
const pill = centre(PLAIN, 'pill')

const WIDGET_AT = { x: 1620, y: 540, scale: 2 }
const PILL_RECT = {
  x: WIDGET_AT.x - 54,
  y: WIDGET_AT.y - 390,
  w: 108,
  h: 780
}

export function S07LessIsMore() {
  const frame = useCurrentFrame()

  // The tank: constant speed, never a tween.
  const tankX = -1850 + Math.max(0, frame - 4) * 150

  // The black surface contracts into the board.
  const shrink = EASE.inOutCubic(clamp((frame - 30) / 12))
  const coverFade = EASE.inOutCubic(clamp((frame - 42) / 4))

  const overlay = {
    x: PILL_RECT.x * shrink,
    y: PILL_RECT.y * shrink,
    w: 1920 + (PILL_RECT.w - 1920) * shrink,
    h: 1080 + (PILL_RECT.h - 1080) * shrink
  }

  const copyIn = EASE.outExpo(clamp((frame - 44) / 9))

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      {/* The clean composition is already underneath the black surface. */}
      <Shot
        name={PLAIN}
        camera={{
          focusX: pill.x,
          focusY: pill.y,
          atX: WIDGET_AT.x,
          atY: WIDGET_AT.y,
          scale: WIDGET_AT.scale
        }}
      />

      <div style={{ position: 'absolute', left: 84, top: 208, opacity: copyIn }}>
        <SwapLine a="MENOS" b="MAIS" at={80} size={266} tracking={-0.04} duration={9} />
      </div>
      <div style={{ position: 'absolute', left: 84, top: 486, opacity: copyIn }}>
        <SwapLine a="COMPLICAÇÃO." b="CONTROLE." at={80} size={190} tracking={-0.035} duration={9} />
      </div>

      <div style={{ position: 'absolute', left: 86, top: 812, opacity: clamp((frame - 60) / 10) }}>
        <Mono size={26} color={COLORS.inkSoft} tracking={0.12}>
          SEMPRE À VISTA · SEM ABRIR NADA
        </Mono>
      </div>

      {/* The black surface. */}
      {coverFade < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: overlay.x,
            top: overlay.y,
            width: overlay.w,
            height: overlay.h,
            background: COLORS.surface,
            borderRadius: shrink * 999,
            opacity: 1 - coverFade
          }}
        >
          {/* The tank, inverted: a white shape on the surface. */}
          {frame >= 4 && frame <= 32 ? (
            <div style={{ position: 'absolute', left: tankX - overlay.x, top: 360 - overlay.y }}>
              <Tank width={1450} inverted />
            </div>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
