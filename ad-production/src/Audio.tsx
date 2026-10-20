import React from 'react'
import { Audio, Sequence, staticFile, useCurrentFrame } from 'remotion'

/** Leaves true-peak headroom after the music, VO and SFX buses are summed. */
const MASTER_GAIN = 0.78

/**
 * AUDIO LAYER.
 *
 * The score is a 40 s / 120 BPM bed with 20 bars; every cut in the film
 * lands on a bar or a beat of it. The voice-over stems and the sound
 * effects are separate files placed frame by frame.
 */

/** Voice-over placements: [absolute frame in, duration in frames]. */
const VO: Array<{ file: string; from: number; duration: number; volume: number }> = [
  { file: 'vo-01.wav', from: 8, duration: 78, volume: 1 },
  { file: 'vo-02.wav', from: 146, duration: 48, volume: 1 },
  { file: 'vo-03.wav', from: 300, duration: 35, volume: 1 },
  { file: 'vo-04.wav', from: 432, duration: 87, volume: 1 },
  { file: 'vo-05.wav', from: 618, duration: 129, volume: 1 },
  { file: 'vo-06.wav', from: 790, duration: 81, volume: 1 },
  { file: 'vo-07.wav', from: 1112, duration: 81, volume: 1 }
]

interface Sfx {
  file: string
  from: number
  volume?: number
  duration?: number
  loop?: boolean
}

const SFX: Sfx[] = [
  { file: 'tank-tread.wav', from: 10, duration: 86, volume: 0.32, loop: true },
  { file: 'tank-clank.wav', from: 12, volume: 0.5 },
  { file: 'ant-scuttle.wav', from: 0, duration: 96, volume: 0.16, loop: true },
  { file: 'click-soft.wav', from: 16, volume: 0.5 },
  { file: 'click-soft.wav', from: 22, volume: 0.42 },
  { file: 'click-hard.wav', from: 29, volume: 0.5 },
  { file: 'click-hard.wav', from: 32, volume: 0.45 },
  { file: 'whoosh-reverse.wav', from: 94, volume: 0.55 },
  { file: 'impact-tight.wav', from: 96, volume: 0.75 },
  { file: 'whoosh-forward.wav', from: 116, volume: 0.6 },
  { file: 'impact-tight.wav', from: 146, volume: 0.7 },
  { file: 'click-hard.wav', from: 172, volume: 0.5 },
  { file: 'whoosh-short.wav', from: 186, volume: 0.5 },
  { file: 'impact-heavy.wav', from: 200, volume: 0.85 },
  { file: 'whoosh-reverse.wav', from: 236, volume: 0.6 },
  { file: 'pop-reveal.wav', from: 248, volume: 0.8 },
  { file: 'blip-up.wav', from: 286, volume: 0.5 },
  { file: 'click-soft.wav', from: 300, volume: 0.4 },
  { file: 'whoosh-forward.wav', from: 416, volume: 0.55 },
  { file: 'click-soft.wav', from: 426, volume: 0.4 },
  { file: 'whoosh-short.wav', from: 596, volume: 0.5 },
  { file: 'click-hard.wav', from: 616, volume: 0.45 },
  { file: 'whoosh-reverse.wav', from: 698, volume: 0.55 },
  { file: 'impact-tight.wav', from: 700, volume: 0.7 },
  { file: 'whoosh-forward.wav', from: 776, volume: 0.55 },
  { file: 'click-hard.wav', from: 790, volume: 0.45 },
  { file: 'ant-scuttle.wav', from: 900, duration: 60, volume: 0.12, loop: true },
  { file: 'tank-clank.wav', from: 926, volume: 0.45 },
  { file: 'whoosh-short.wav', from: 936, volume: 0.5 },
  { file: 'pop-reveal.wav', from: 956, volume: 0.7 },
  { file: 'impact-heavy.wav', from: 1018, volume: 0.85 },
  { file: 'whoosh-short.wav', from: 1044, volume: 0.5 },
  { file: 'impact-tight.wav', from: 1062, volume: 0.65 },
  { file: 'whoosh-reverse.wav', from: 1088, volume: 0.5 },
  { file: 'impact-tight.wav', from: 1104, volume: 0.7 },
  { file: 'blip-up.wav', from: 1146, volume: 0.55 }
]

/** Music level, ducked under every line of voice-over. */
function musicVolume(frame: number): number {
  const base = 0.52
  let volume = base
  for (const line of VO) {
    const start = line.from - 8
    const end = line.from + line.duration + 16
    if (frame >= start && frame <= end) {
      const inRamp = Math.min(1, Math.max(0, (frame - start) / 8))
      const outRamp = Math.min(1, Math.max(0, (end - frame) / 16))
      const duck = 0.24 + 0.76 * Math.min(inRamp, outRamp)
      volume = Math.min(volume, base * duck)
    }
  }
  // A short tail into the end card.
  if (frame > 1170) volume *= Math.max(0, 1 - (frame - 1170) / 30)
  return volume
}

export function AudioLayer() {
  const frame = useCurrentFrame()
  return (
    <>
      <Audio src={staticFile('audio/music.music.wav')} volume={musicVolume(frame) * MASTER_GAIN} />
      {VO.map((line) => (
        <Sequence key={line.file} from={line.from} durationInFrames={line.duration + 6}>
          <Audio src={staticFile(`audio/vo/${line.file}`)} volume={line.volume * MASTER_GAIN} />
        </Sequence>
      ))}
      {SFX.map((cue, index) => (
        <Sequence
          key={`${cue.file}-${index}`}
          from={cue.from}
          durationInFrames={cue.duration ?? 90}
        >
          <Audio
            src={staticFile(`audio/sfx/${cue.file}`)}
            volume={(cue.volume ?? 0.6) * MASTER_GAIN}
            loop={cue.loop}
          />
        </Sequence>
      ))}
    </>
  )
}
