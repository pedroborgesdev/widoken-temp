import React from 'react'
import { Audio, Sequence, staticFile } from 'remotion'

const MASTER = 0.81
const CUES = [
  [72, 'impact-tight', .32], [96, 'click-soft', .22], [146, 'blip-up', .18], [207, 'riser', .20],
  [211, 'whoosh-forward', .36], [222, 'impact-tight', .34], [250, 'pop-reveal', .28],
  [354, 'impact-tight', .30], [390, 'click-soft', .20], [430, 'click-soft', .18], [482, 'whoosh-forward', .28],
  [504, 'pop-reveal', .30], [530, 'click-soft', .22], [576, 'click-hard', .20], [648, 'whoosh-reverse', .28],
  [675, 'impact-tight', .30], [704, 'click-soft', .20], [772, 'whoosh-short', .25],
  [810, 'blip-up', .22], [846, 'click-soft', .18], [924, 'whoosh-forward', .26],
  [945, 'pop-reveal', .28], [977, 'whoosh-short', .20], [1007, 'whoosh-short', .20], [1038, 'whoosh-short', .20],
  [1056, 'impact-heavy', .34], [1090, 'click-hard', .18], [1178, 'riser', .22],
  [1200, 'impact-tight', .36], [1230, 'pop-reveal', .26], [1260, 'click-hard', .20]
] as const

export function AudioLayerV4() {
  return <>
    <Sequence from={72} durationInFrames={1320}><Audio src={staticFile('audio/music.music.wav')} volume={MASTER} /></Sequence>
    {CUES.map(([from, name, volume], index) => (
      <Sequence key={`${name}-${from}-${index}`} from={from} durationInFrames={100}>
        <Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={volume * MASTER} />
      </Sequence>
    ))}
  </>
}
