import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { AudioLayerV3 } from './audio'
import { COLORS, SCENES } from './tokens'
import { GLOBAL_CSS } from './type'
import { Intro } from './scenes/Intro'
import { S01Absurd } from './scenes/S01Absurd'
import { S02Excess } from './scenes/S02Excess'
import { S03Reveal } from './scenes/S03Reveal'
import { S04OnePlace } from './scenes/S04OnePlace'
import { S05Details } from './scenes/S05Details'
import { S06Activity } from './scenes/S06Activity'
import { S07LessIsMore } from './scenes/S07LessIsMore'
import { S08Phrase } from './scenes/S08Phrase'
import { S09Signature } from './scenes/S09Signature'

const entries = [
  [SCENES.intro, Intro], [SCENES.s01, S01Absurd], [SCENES.s02, S02Excess],
  [SCENES.s03, S03Reveal], [SCENES.s04, S04OnePlace], [SCENES.s05, S05Details],
  [SCENES.s06, S06Activity], [SCENES.s07, S07LessIsMore], [SCENES.s08, S08Phrase],
  [SCENES.s09, S09Signature]
] as const

export function WidokenAdV3() {
  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <style>{GLOBAL_CSS}</style>
      {entries.map(([scene, Component]) => (
        <Sequence key={scene.name} from={scene.from} durationInFrames={scene.to - scene.from} name={scene.name}>
          <Component />
        </Sequence>
      ))}
      <AudioLayerV3 />
    </AbsoluteFill>
  )
}
