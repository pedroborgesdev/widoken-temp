import React from 'react'
import { Audio, Sequence, staticFile } from 'remotion'

const MASTER = 0.80
const CUES = [
  [5, 'blip-up', .18], [26, 'click-soft', .17], [38, 'click-soft', .17], [50, 'click-soft', .17],
  [105, 'impact-tight', .32], [132, 'whoosh-forward', .21], [184, 'whoosh-forward', .20],
  [224, 'click-hard', .18], [244, 'pop-reveal', .28], [292, 'blip-up', .18], [372, 'click-soft', .16], [421, 'whoosh-reverse', .22],
  [448, 'impact-heavy', .30], [475, 'blip-up', .22], [520, 'whoosh-forward', .18], [590, 'whoosh-reverse', .21], [634, 'whoosh-forward', .21],
  [666, 'pop-reveal', .24], [675, 'whoosh-short', .15], [684, 'whoosh-short', .15], [693, 'whoosh-short', .15], [817, 'whoosh-reverse', .18],
  [850, 'impact-tight', .27], [880, 'click-soft', .17],
  [949, 'impact-tight', .31], [978, 'pop-reveal', .22], [1004, 'click-hard', .19]
] as const

export function AudioLayerV7() {
  return <>
    <Sequence from={0} durationInFrames={1110}><Audio src={staticFile('audio/music.music.wav')} volume={MASTER} /></Sequence>
    {CUES.map(([from, name, volume], index) => (
      <Sequence key={`${name}-${from}-${index}`} from={from} durationInFrames={100}>
        <Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={volume * MASTER} />
      </Sequence>
    ))}
  </>
}
