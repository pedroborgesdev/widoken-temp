import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { BrandLockup } from '../art'
import { COLORS, EASE, clamp } from '../tokens'
import { Mono, Words } from '../type'
import { Shot, centre } from '../product'

const VERTICAL = 'widget-vertical' as const
const pill = centre(VERTICAL, 'pill')

export function S03Reveal() {
  const frame = useCurrentFrame()
  const page = EASE.inOutCubic(clamp((frame - 3) / 22))
  const brand = EASE.outQuint(clamp((frame - 20) / 14))
  const dock = EASE.outQuint(clamp((frame - 35) / 18))
  const promise = EASE.outExpo(clamp((frame - 63) / 12))
  const promise2 = EASE.outQuint(clamp((frame - 82) / 13))
  const end = EASE.inOutCubic(clamp((frame - 138) / 12))

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <div style={{ position: 'absolute', inset: 0, background: COLORS.paper, clipPath: `inset(0 ${(1 - page) * 100}% 0 0)`, WebkitClipPath: `inset(0 ${(1 - page) * 100}% 0 0)`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 84, top: 176, opacity: brand, transform: `translateY(${(1 - brand) * 26 - end * 20}px)` }}>
          <BrandLockup iconSize={150} wordSize={150} gap={34} />
        </div>
        <Shot name={VERTICAL} camera={{ focusX: pill.x, focusY: pill.y, atX: 1590, atY: 540, scale: 840 / 390 }} style={{ opacity: dock, transform: `translateX(${(1 - dock) * 260}px)` }} />
        <div style={{ position: 'absolute', left: 84, top: 486, opacity: promise * (1 - end) }}>
          <Words text="SIMPLES." size={228} lineHeight={0.84} from={63} duration={9} spec={() => ({ dir: 'up', easing: EASE.outExpo })} />
        </div>
        <div style={{ position: 'absolute', left: 86, top: 758, opacity: promise2 * (1 - end) }}>
          <Words text="COMO DEVERIA SER." size={72} weight={650} tracking={-0.01} lineHeight={1} color={COLORS.inkSoft} from={82} duration={10} stagger={1.8} spec={() => ({ dir: 'wipeRight', easing: EASE.outQuint })} />
        </div>
        <div style={{ position: 'absolute', left: 86, top: 890, opacity: clamp((frame - 102) / 10) * (1 - end) }}>
          <Mono size={24} color={COLORS.inkMuted} tracking={0.14}>USO · LIMITE · RENOVAÇÃO — SEM ABRIR OUTRA ABA</Mono>
        </div>
      </div>
    </AbsoluteFill>
  )
}
