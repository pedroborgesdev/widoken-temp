import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { AudioLayer } from './Audio'
import { GLOBAL_CSS } from './brand/Typography'
import { COLORS, SCENES } from './brand/tokens'
import { S01Absurd } from './scenes/S01Absurd'
import { S02Excess } from './scenes/S02Excess'
import { S03Reveal } from './scenes/S03Reveal'
import { S04OnePlace } from './scenes/S04OnePlace'
import { S05Details } from './scenes/S05Details'
import { S06Activity } from './scenes/S06Activity'
import { S07LessIsMore } from './scenes/S07LessIsMore'
import { S08Cta } from './scenes/S08Cta'

/**
 * WIDOKEN - COMMERCIAL DE LANÇAMENTO.
 *
 * 1920x1080 / 30 fps / 40 s. Eight sequences cut on the bar grid of the
 * 120 BPM score. Everything below the type is a real capture of the Widoken
 * widget; everything around it is original motion design.
 */
export const WidokenAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <style>{GLOBAL_CSS}</style>
      <AudioLayer />

      <Sequence from={SCENES.s01.from} durationInFrames={SCENES.s01.to - SCENES.s01.from} name="S01 - O ABSURDO">
        <S01Absurd />
      </Sequence>
      <Sequence from={SCENES.s02.from} durationInFrames={SCENES.s02.to - SCENES.s02.from} name="S02 - A COMPLEXIDADE">
        <S02Excess />
      </Sequence>
      <Sequence from={SCENES.s03.from} durationInFrames={SCENES.s03.to - SCENES.s03.from} name="S03 - REVEAL">
        <S03Reveal />
      </Sequence>
      <Sequence from={SCENES.s04.from} durationInFrames={SCENES.s04.to - SCENES.s04.from} name="S04 - UM SÓ LUGAR">
        <S04OnePlace />
      </Sequence>
      <Sequence from={SCENES.s05.from} durationInFrames={SCENES.s05.to - SCENES.s05.from} name="S05 - INFORMAÇÃO">
        <S05Details />
      </Sequence>
      <Sequence from={SCENES.s06.from} durationInFrames={SCENES.s06.to - SCENES.s06.from} name="S06 - ATIVIDADE">
        <S06Activity />
      </Sequence>
      <Sequence from={SCENES.s07.from} durationInFrames={SCENES.s07.to - SCENES.s07.from} name="S07 - MENOS É MAIS">
        <S07LessIsMore />
      </Sequence>
      <Sequence from={SCENES.s08.from} durationInFrames={SCENES.s08.to - SCENES.s08.from} name="S08 - CTA">
        <S08Cta />
      </Sequence>
    </AbsoluteFill>
  )
}
