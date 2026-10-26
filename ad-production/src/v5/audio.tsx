import React from 'react'
import { Audio, Sequence, staticFile } from 'remotion'

const MASTER = 0.81
const CUES = [
  [60, 'impact-tight', .30], [92, 'click-soft', .18], [116, 'click-soft', .18], [140, 'blip-up', .18],
  [225, 'riser', .22], [240, 'impact-tight', .34], [278, 'pop-reveal', .25],
  [375, 'impact-tight', .28], [400, 'click-soft', .18], [426, 'click-soft', .18], [452, 'whoosh-forward', .24],
  [510, 'pop-reveal', .30], [555, 'click-hard', .18], [645, 'whoosh-reverse', .25],
  [675, 'impact-tight', .28], [705, 'pop-reveal', .26], [785, 'whoosh-forward', .24],
  [810, 'impact-heavy', .32], [858, 'blip-up', .24], [884, 'click-hard', .19], [973, 'whoosh-reverse', .22],
  [1020, 'pop-reveal', .26], [1050, 'whoosh-short', .18], [1080, 'whoosh-short', .18], [1110, 'whoosh-short', .18],
  [1140, 'impact-tight', .30], [1190, 'click-hard', .18], [1240, 'riser', .20],
  [1260, 'impact-tight', .34], [1280, 'pop-reveal', .24], [1324, 'click-hard', .20]
] as const

export function AudioLayerV5() {
  return <>
    <Sequence from={60} durationInFrames={1380}><Audio src={staticFile('audio/music.music.wav')} volume={MASTER} /></Sequence>
    {CUES.map(([from, name, volume], index) => (
      <Sequence key={`${name}-${from}-${index}`} from={from} durationInFrames={100}>
        <Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={volume * MASTER} />
      </Sequence>
    ))}
  </>
}
