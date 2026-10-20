import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { AudioLayerV4 } from './audio'
import { GLOBAL_CSS } from './motion'
import { S01Brand, S02Problem, S03Solution, S04Concept, S05Consumption, S06Balance, S07Activity, S08Themes, S09Benefit, S10Cta } from './scenes'
import { COLORS, SCENES } from './tokens'

const entries = [
  [SCENES.s01, S01Brand], [SCENES.s02, S02Problem], [SCENES.s03, S03Solution],
  [SCENES.s04, S04Concept], [SCENES.s05, S05Consumption], [SCENES.s06, S06Balance],
  [SCENES.s07, S07Activity], [SCENES.s08, S08Themes], [SCENES.s09, S09Benefit],
  [SCENES.s10, S10Cta]
] as const

export function WidokenAdV4() {
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <style>{GLOBAL_CSS}</style>
    {entries.map(([scene, Component]) => (
      <Sequence key={scene.name} from={scene.from} durationInFrames={scene.to - scene.from} name={scene.name}>
        <Component />
      </Sequence>
    ))}
    <AudioLayerV4 />
  </AbsoluteFill>
}
