import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Ant, Tank } from '../art'
import { COLORS, EASE, clamp } from '../tokens'
import { Words } from '../type'

export function S01Absurd() {
  const frame = useCurrentFrame()
  const antX = -120 + frame * 13.8
  const antY = 458 + Math.sin(frame * 0.45) * 2
  const arrival = EASE.outMechanical(clamp((frame - 25) / 43))
  const tankExit = EASE.inCubic(clamp((frame - 126) / 20))
  const tankX = -1540 + 1590 * arrival + 2150 * tankExit
  const typeIn = EASE.outExpo(clamp((frame - 67) / 12))
  const typeExit = EASE.inOutCubic(clamp((frame - 130) / 14))
  const shake = frame >= 67 && frame < 72 ? Math.sin((frame - 67) * 3.1) * 5 : 0

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${shake}px)` }}>
        <div style={{ position: 'absolute', left: 84, top: 74, opacity: typeIn * (1 - typeExit), transform: `translateY(${-typeExit * 80}px)` }}>
          <Words text="UM TANQUE" size={226} lineHeight={0.84} from={67} duration={10} stagger={2} spec={() => ({ dir: 'up', easing: EASE.outExpo })} />
          <Words text="DE GUERRA?" size={198} lineHeight={0.86} from={75} duration={10} stagger={2} spec={(_i, word) => ({ dir: 'up', easing: EASE.outExpo, color: word.startsWith('GUERRA') ? COLORS.red : COLORS.ink })} />
        </div>
        <Tank width={1260} style={{ position: 'absolute', left: tankX, top: 520 }} />
        <Ant width={104} style={{ position: 'absolute', left: antX, top: antY, zIndex: 3 }} />
      </div>
    </AbsoluteFill>
  )
}
