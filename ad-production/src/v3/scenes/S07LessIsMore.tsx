import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Tank } from '../art'
import { COLORS, EASE, clamp } from '../tokens'
import { Mono, SwapLine } from '../type'
import { Shot, centre } from '../product'

const PLAIN = 'widget-vertical' as const
const pill = centre(PLAIN, 'pill')

export function S07LessIsMore() {
  const frame = useCurrentFrame()
  const tankPass = EASE.inOutCubic(clamp((frame - 2) / 36))
  const tankOpacity = 1 - EASE.inOutCubic(clamp((frame - 31) / 8))
  const contentIn = EASE.outQuint(clamp((frame - 35) / 14))
  const sceneExit = EASE.inOutCubic(clamp((frame - 108) / 12))
  const tankX = -1080 + tankPass * 3160

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - sceneExit, transform: `translateY(${-sceneExit * 16}px)` }}>
        <Tank width={980} style={{ position: 'absolute', left: tankX, top: 520, opacity: tankOpacity }} />
        <Shot name={PLAIN} camera={{ focusX: pill.x, focusY: pill.y, atX: 1645, atY: 540, scale: 1.95 }} style={{ opacity: contentIn }} />
        <div style={{ position: 'absolute', left: 84, top: 190, width: 1220, opacity: contentIn }}>
          <SwapLine a="MENOS" b="MAIS" at={82} size={218} tracking={-0.04} duration={9} />
        </div>
        <div style={{ position: 'absolute', left: 84, top: 450, width: 1240, opacity: contentIn }}>
          <SwapLine a="COMPLICAÇÃO." b="CONTROLE." at={82} size={126} tracking={-0.035} duration={9} />
        </div>
        <div style={{ position: 'absolute', left: 86, top: 740, opacity: clamp((frame - 58) / 10) * (1 - sceneExit) }}>
          <Mono size={26} color={COLORS.inkSoft} tracking={0.12}>SEMPRE À VISTA · SEM ABRIR NADA</Mono>
        </div>
      </div>
    </AbsoluteFill>
  )
}
