import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { BrandLockup } from '../art'
import { COLORS, EASE, clamp } from '../tokens'
import { Mono, Words } from '../type'
import { Shot, centre } from '../product'

const PLAIN = 'widget-vertical' as const
const pill = centre(PLAIN, 'pill')

export function S09Signature() {
  const frame = useCurrentFrame()
  const lockupIn = EASE.outQuint(clamp((frame - 2) / 14))
  const dock = EASE.outQuint(clamp((frame - 8) / 16))
  const ctaIn = EASE.outExpo(clamp((frame - 18) / 10))
  const urlIn = EASE.outQuint(clamp((frame - 28) / 10))
  const noteIn = EASE.outQuint(clamp((frame - 38) / 10))

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <Shot name={PLAIN} camera={{ focusX: pill.x, focusY: pill.y, atX: 1580, atY: 540, scale: 840 / 390 }} style={{ opacity: dock, transform: `translateX(${(1 - dock) * 220}px)` }} />
      <div style={{ position: 'absolute', left: 84, top: 182, opacity: lockupIn, transform: `translateY(${(1 - lockupIn) * 22}px)` }}>
        <BrandLockup iconSize={156} wordSize={154} gap={38} />
      </div>
      <div style={{ position: 'absolute', left: 84, top: 475, opacity: ctaIn }}>
        <Words text="BAIXE O WIDOKEN." size={88} weight={800} tracking={-0.025} lineHeight={0.92} from={18} duration={9} stagger={1.2} spec={() => ({ dir: 'wipeRight', easing: EASE.outQuint })} />
      </div>
      <div style={{ position: 'absolute', left: 86, top: 622, opacity: urlIn }}>
        <Mono size={34} weight={400} tracking={0.01} color={COLORS.ink} uppercase={false}>github.com/pedroborgesdev/widoken</Mono>
        <div style={{ height: 8 }} />
        <Mono size={34} weight={400} tracking={0.01} color={COLORS.ink} uppercase={false}>releases/latest</Mono>
      </div>
      <div style={{ position: 'absolute', left: 86, top: 792, opacity: noteIn }}>
        <Mono size={26} color={COLORS.inkMuted} tracking={0.12}>SEU USO DE IA, À VISTA. NO DESKTOP.</Mono>
      </div>
    </AbsoluteFill>
  )
}
