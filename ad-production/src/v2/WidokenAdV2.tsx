import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { AudioLayerV2 } from './audio'
import { COLORS, SCENES } from './tokens'
import { GLOBAL_CSS } from './type'
import { S01Absurd } from './scenes/S01Absurd'
import { S02Excess } from './scenes/S02Excess'
import { S03Reveal } from './scenes/S03Reveal'
import { S04OnePlace } from './scenes/S04OnePlace'
import { S05Details } from './scenes/S05Details'
import { S06Activity } from './scenes/S06Activity'
import { S07LessIsMore } from './scenes/S07LessIsMore'
import { S08Phrase } from './scenes/S08Phrase'
import { S09Signature } from './scenes/S09Signature'

/**
 * WIDOKEN — COMMERCIAL V2 · 44 s.
 *
 * Nine sequences, each built for its own beat and joined by a motivated
 * handoff (see MOTION_DESIGN_SYSTEM.md). The product is the real application
 * capture, photographed by scripts/capture-product.mjs; nothing about the
 * widget — geometry, colours, ring weight, icons, copy — is redrawn here.
 */
export function WidokenAdV2() {
  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <style>{GLOBAL_CSS}</style>

      <Sequence from={SCENES.s01.from} durationInFrames={SCENES.s01.to - SCENES.s01.from} name={SCENES.s01.name}>
        <S01Absurd />
      </Sequence>
      <Sequence from={SCENES.s02.from} durationInFrames={SCENES.s02.to - SCENES.s02.from} name={SCENES.s02.name}>
        <S02Excess />
      </Sequence>
      <Sequence from={SCENES.s03.from} durationInFrames={SCENES.s03.to - SCENES.s03.from} name={SCENES.s03.name}>
        <S03Reveal />
      </Sequence>
      <Sequence from={SCENES.s04.from} durationInFrames={SCENES.s04.to - SCENES.s04.from} name={SCENES.s04.name}>
        <S04OnePlace />
      </Sequence>
      <Sequence from={SCENES.s05.from} durationInFrames={SCENES.s05.to - SCENES.s05.from} name={SCENES.s05.name}>
        <S05Details />
      </Sequence>
      <Sequence from={SCENES.s06.from} durationInFrames={SCENES.s06.to - SCENES.s06.from} name={SCENES.s06.name}>
        <S06Activity />
      </Sequence>
      <Sequence from={SCENES.s07.from} durationInFrames={SCENES.s07.to - SCENES.s07.from} name={SCENES.s07.name}>
        <S07LessIsMore />
      </Sequence>
      <Sequence from={SCENES.s08.from} durationInFrames={SCENES.s08.to - SCENES.s08.from} name={SCENES.s08.name}>
        <S08Phrase />
      </Sequence>
      <Sequence from={SCENES.s09.from} durationInFrames={SCENES.s09.to - SCENES.s09.from} name={SCENES.s09.name}>
        <S09Signature />
      </Sequence>

      <AudioLayerV2 />
    </AbsoluteFill>
  )
}
