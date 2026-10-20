import React from 'react'
import { Audio, Sequence, staticFile } from 'remotion'
import { CONTENT_START } from './tokens'

/**
 * AUDIO LAYER — V2.
 *
 * The score and every effect are synthesised in this repository by
 * scripts/make-audio.mjs; there are no third-party samples and therefore no
 * licensing obligations. Cues below are absolute frames and are locked to
 * the same cut grid as the picture (0 · 150 · 300 · 450 · 630 · 810 · 930 ·
 * 1050 · 1170 · 1320).
 *
 * There is deliberately no voice-over: the film is built for lettering, and
 * the PT-BR VO script with timecodes ships separately (see VO_SCRIPT.md) for
 * a human read if one is ever wanted.
 */

interface Cue {
  f: number
  name: string
  volume: number
}

const CUES: Cue[] = [
  // S01 · the absurd
  { f: 4, name: 'ant-scuttle', volume: 0.3 },
  { f: 30, name: 'tank-tread', volume: 0.55 },
  { f: 48, name: 'tank-tread', volume: 0.4 },
  { f: 69, name: 'tank-clank', volume: 0.55 },
  { f: 132, name: 'whoosh-short', volume: 0.32 },
  { f: 148, name: 'click-soft', volume: 0.24 },

  // S02 · the meters bloom
  { f: 152, name: 'click-hard', volume: 0.16 },
  { f: 160, name: 'click-hard', volume: 0.18 },
  { f: 168, name: 'click-hard', volume: 0.2 },
  { f: 176, name: 'click-hard', volume: 0.2 },
  { f: 184, name: 'click-hard', volume: 0.22 },
  { f: 190, name: 'blip-up', volume: 0.18 },
  { f: 216, name: 'whoosh-short', volume: 0.3 },
  { f: 225, name: 'impact-tight', volume: 0.4 },
  { f: 255, name: 'whoosh-reverse', volume: 0.42 },
  { f: 278, name: 'riser', volume: 0.24 },

  // S03 · reveal
  { f: 300, name: 'sub-drop', volume: 0.5 },
  { f: 310, name: 'pop-reveal', volume: 0.42 },
  { f: 344, name: 'click-soft', volume: 0.2 },
  { f: 364, name: 'whoosh-short', volume: 0.28 },
  { f: 378, name: 'click-hard', volume: 0.24 },
  { f: 396, name: 'click-soft', volume: 0.18 },

  // S04 · one place
  { f: 450, name: 'impact-tight', volume: 0.4 },
  { f: 456, name: 'whoosh-forward', volume: 0.3 },
  { f: 520, name: 'click-soft', volume: 0.2 },
  { f: 538, name: 'whoosh-short', volume: 0.2 },
  { f: 600, name: 'riser', volume: 0.18 },
  { f: 606, name: 'whoosh-forward', volume: 0.3 },

  // S05 · details
  { f: 630, name: 'impact-tight', volume: 0.35 },
  { f: 642, name: 'click-soft', volume: 0.24 },
  { f: 660, name: 'click-soft', volume: 0.18 },
  { f: 690, name: 'whoosh-forward', volume: 0.34 },
  { f: 726, name: 'click-soft', volume: 0.2 },
  { f: 800, name: 'click-soft', volume: 0.2 },

  // S06 · working
  { f: 810, name: 'impact-tight', volume: 0.35 },
  { f: 818, name: 'click-hard', volume: 0.24 },
  { f: 820, name: 'blip-up', volume: 0.2 },
  { f: 890, name: 'click-soft', volume: 0.24 },
  { f: 900, name: 'click-soft', volume: 0.18 },
  { f: 922, name: 'riser', volume: 0.24 },

  // S07 · proportion
  { f: 930, name: 'sub-drop', volume: 0.45 },
  { f: 934, name: 'tank-tread', volume: 0.55 },
  { f: 944, name: 'tank-tread', volume: 0.5 },
  { f: 954, name: 'tank-tread', volume: 0.42 },
  { f: 960, name: 'whoosh-forward', volume: 0.34 },
  { f: 960, name: 'whoosh-reverse', volume: 0.3 },
  { f: 973, name: 'click-hard', volume: 0.3 },
  { f: 974, name: 'click-soft', volume: 0.2 },
  { f: 1010, name: 'click-hard', volume: 0.3 },

  // S08 · the phrase
  { f: 1050, name: 'impact-heavy', volume: 0.42 },
  { f: 1056, name: 'impact-tight', volume: 0.3 },
  { f: 1072, name: 'riser', volume: 0.26 },
  { f: 1086, name: 'click-hard', volume: 0.28 },
  { f: 1154, name: 'whoosh-reverse', volume: 0.3 },

  // S09 · signature
  { f: 1170, name: 'pop-reveal', volume: 0.38 },
  { f: 1176, name: 'click-soft', volume: 0.2 },
  { f: 1184, name: 'whoosh-short', volume: 0.24 },
  { f: 1192, name: 'click-hard', volume: 0.2 },
  { f: 1200, name: 'click-soft', volume: 0.14 }
]

/**
 * The synthesised bed peaks slightly above full scale where the impacts stack
 * on the music. One master gain keeps the whole mix under -1 dBFS without
 * touching the internal balance. Measured after this gain: true peak -1.0 dBFS,
 * integrated loudness about -16.8 LUFS.
 */
const MASTER = 0.68

export function AudioLayerV3() {
  return (
    <>
      <Sequence from={CONTENT_START} durationInFrames={1320}>
        <Audio src={staticFile('audio/music.music.wav')} volume={MASTER} />
      </Sequence>
      {CUES.map((cue, index) => (
        <Sequence key={`${cue.name}-${cue.f}-${index}`} from={CONTENT_START + cue.f} durationInFrames={100}>
          <Audio src={staticFile(`audio/sfx/${cue.name}.wav`)} volume={cue.volume * MASTER} />
        </Sequence>
      ))}
    </>
  )
}
