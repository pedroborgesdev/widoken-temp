import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { GLOBAL_CSS } from '../v4/motion'
import { AudioLayerV5 } from './audio'
import { S01Brand, S02Opening, S03Introduction, S04ResponsiveWidget, S05Usage, S06Renewal, S07Working, S08Themes, S09Benefit, S10Cta } from './scenes'
import { COLORS, SCENES } from './tokens'

const entries = [
  [SCENES.s01, S01Brand], [SCENES.s02, S02Opening], [SCENES.s03, S03Introduction],
  [SCENES.s04, S04ResponsiveWidget], [SCENES.s05, S05Usage], [SCENES.s06, S06Renewal],
  [SCENES.s07, S07Working], [SCENES.s08, S08Themes], [SCENES.s09, S09Benefit], [SCENES.s10, S10Cta]
] as const

export function WidokenAdV5() {
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <style>{GLOBAL_CSS}</style>
    {entries.map(([scene, Component]) => (
      <Sequence key={scene.name} from={scene.from} durationInFrames={scene.to - scene.from} premountFor={20} name={scene.name}>
        <Component />
      </Sequence>
    ))}
    <AudioLayerV5 />
  </AbsoluteFill>
}
