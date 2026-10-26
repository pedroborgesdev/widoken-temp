import React from 'react'
import { Audio, Sequence, staticFile } from 'remotion'

const MASTER = 0.80
const CUES = [
  [5, 'blip-up', .18], [26, 'click-soft', .17], [38, 'click-soft', .17], [50, 'click-soft', .17],
  [105, 'impact-tight', .32], [132, 'whoosh-forward', .21],
  [224, 'click-hard', .18], [244, 'pop-reveal', .28], [292, 'blip-up', .18], [372, 'click-soft', .16], [425, 'whoosh-reverse', .22],
  [462, 'impact-heavy', .30], [500, 'blip-up', .22], [535, 'whoosh-forward', .18], [610, 'whoosh-reverse', .21],
  [666, 'pop-reveal', .24], [686, 'whoosh-short', .17], [752, 'whoosh-reverse', .18],
  [790, 'impact-tight', .27], [820, 'click-soft', .17],
  [889, 'impact-tight', .31], [918, 'pop-reveal', .22], [944, 'click-hard', .19]
] as const

export function AudioLayerV6() {
  return <>
    <Sequence from={0} durationInFrames={1020}><Audio src={staticFile('audio/music.music.wav')} volume={MASTER} /></Sequence>
    {CUES.map(([from, name, volume], index) => (
      <Sequence key={`${name}-${from}-${index}`} from={from} durationInFrames={100}>
        <Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={volume * MASTER} />
      </Sequence>
    ))}
  </>
}
