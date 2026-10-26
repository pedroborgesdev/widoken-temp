import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { GLOBAL_CSS } from '../v4/motion'
import { AudioLayerV10 } from './audio'
import { S01Problem, S02Solution, S03Usage, S04Working, S05Themes, S06Benefit, S07Cta } from './scenes'
import { COLORS, SCENES } from './tokens'

const entries = [
  [SCENES.s01, S01Problem], [SCENES.s02, S02Solution], [SCENES.s03, S03Usage],
  [SCENES.s04, S04Working], [SCENES.s05, S05Themes], [SCENES.s06, S06Benefit], [SCENES.s07, S07Cta]
] as const

export function WidokenAdV10() {
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <style>{GLOBAL_CSS}</style>
    {entries.map(([scene, Component]) => (
      <Sequence key={scene.name} from={scene.from} durationInFrames={scene.to - scene.from} premountFor={20} name={scene.name}>
        <Component />
      </Sequence>
    ))}
    <AudioLayerV10 />
  </AbsoluteFill>
}
