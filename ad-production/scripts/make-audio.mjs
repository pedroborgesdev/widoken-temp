/**
 * Widoken ad production - AUDIO LAYER.
 *
 * Renders the soundtrack and every sound effect from scratch with the
 * deterministic DSP kit in ./audio/dsp.mjs. Nothing is sampled from a third
 * party, so the finished spot carries no licensing obligations.
 *
 *   music.music.wav          44.0s stereo bed, 120 BPM, 22 bars
 *   sfx/*.wav                one-shot design elements
 *
 * The cut grid of the film is:
 *   0 · 5 · 10 · 15 · 21 · 27 · 31 · 35 · 39 · 44 s
 * Every accent below is placed on one of those points, or on a beat inside
 * the bar that contains it.
 *
 * Usage: node scripts/make-audio.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Track, SR, mulberry32, kick, subBass, pluck, pad, hat, clap, riser, impact,
  whoosh, click, blip, clank, tread, scuttle, pop, reverb, pingPong, writeWav,
  onePoleHighpass
} from './audio/dsp.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const OUT = path.join(ROOT, 'public', 'audio')
const SFX = path.join(OUT, 'sfx')

const BPM = 120
const BEAT = 60 / BPM
const BAR = BEAT * 4
const STEP = BEAT / 4
const BARS = 22
const DURATION = BAR * BARS // 44.0

/* Chord progression: i - VI - III - VII in A minor. */
const CHORDS = [
  { name: 'Am', root: 55.0, tones: [220.0, 261.63, 329.63, 440.0], pad: [220.0, 261.63, 329.63] },
  { name: 'F', root: 43.65, tones: [174.61, 220.0, 261.63, 349.23], pad: [174.61, 220.0, 261.63] },
  { name: 'C', root: 65.41, tones: [261.63, 329.63, 392.0, 523.25], pad: [261.63, 329.63, 392.0] },
  { name: 'G', root: 49.0, tones: [196.0, 246.94, 293.66, 392.0], pad: [196.0, 246.94, 293.66] }
]

/**
 * One entry per 2 s bar. The film's boundaries fall mid-bar (5 s, 21 s,
 * 27 s, 31 s, 35 s, 39 s), so the section table describes the bed and the
 * HITS table lands the accents exactly on the cut.
 */
const SECTIONS = [
  /* 00–02 */ { kick: 0, clap: 0, hat: 0, bass: 1, arp: 0, pad: 1 },
  /* 02–04 */ { kick: 1, clap: 0, hat: 1, bass: 1, arp: 0, pad: 1 },
  /* 04–06 */ { kick: 1, clap: 1, hat: 2, bass: 2, arp: 1, pad: 0 },
  /* 06–08 */ { kick: 1, clap: 1, hat: 2, bass: 2, arp: 2, pad: 0 },
  /* 08–10 */ { kick: 1, clap: 1, hat: 2, bass: 2, arp: 2, pad: 0 },
  /* 10–12 */ { kick: 0, clap: 0, hat: 1, bass: 1, arp: 1, pad: 1 },
  /* 12–14 */ { kick: 0, clap: 0, hat: 1, bass: 1, arp: 1, pad: 1 },
  /* 14–16 */ { kick: 0, clap: 0, hat: 1, bass: 1, arp: 1, pad: 1 },
  /* 16–18 */ { kick: 1, clap: 1, hat: 2, bass: 2, arp: 2, pad: 0 },
  /* 18–20 */ { kick: 1, clap: 1, hat: 2, bass: 2, arp: 2, pad: 0 },
  /* 20–22 */ { kick: 1, clap: 1, hat: 2, bass: 2, arp: 1, pad: 0 },
  /* 22–24 */ { kick: 0, clap: 0, hat: 1, bass: 1, arp: 1, pad: 1 },
  /* 24–26 */ { kick: 0, clap: 0, hat: 1, bass: 1, arp: 1, pad: 1 },
  /* 26–28 */ { kick: 1, clap: 0, hat: 2, bass: 2, arp: 1, pad: 0, tick: true },
  /* 28–30 */ { kick: 1, clap: 1, hat: 2, bass: 2, arp: 2, pad: 0, tick: true },
  /* 30–32 */ { kick: 0, clap: 0, hat: 0, bass: 1, arp: 0, pad: 1 },
  /* 32–34 */ { kick: 0, clap: 0, hat: 0, bass: 0, arp: 0, pad: 1 },
  /* 34–36 */ { kick: 1, clap: 1, hat: 2, bass: 2, arp: 1, pad: 0 },
  /* 36–38 */ { kick: 1, clap: 1, hat: 2, bass: 2, arp: 2, pad: 0 },
  /* 38–40 */ { kick: 0, clap: 0, hat: 0, bass: 0, arp: 0, pad: 1 },
  /* 40–42 */ { kick: 0, clap: 0, hat: 0, bass: 0, arp: 0, pad: 1 },
  /* 42–44 */ { kick: 0, clap: 0, hat: 0, bass: 0, arp: 0, pad: 0 }
]

const sectionFor = (bar) => SECTIONS[bar] ?? SECTIONS[SECTIONS.length - 1]

/** Accents, in seconds. These are the cut points and the word change. */
const HITS = [
  { t: 2.3, kind: 'heavy', gain: 0.62 },
  { t: 5.0, kind: 'tight', gain: 0.5 },
  { t: 7.5, kind: 'heavy', gain: 0.62 },
  { t: 10.0, kind: 'sub', gain: 0.55 },
  { t: 15.0, kind: 'tight', gain: 0.5 },
  { t: 21.0, kind: 'tight', gain: 0.46 },
  { t: 24.0, kind: 'pop', gain: 0.28 },
  { t: 27.0, kind: 'tight', gain: 0.5 },
  { t: 31.0, kind: 'sub', gain: 0.5 },
  { t: 34.0, kind: 'heavy', gain: 0.5 },
  { t: 35.0, kind: 'heavy', gain: 0.62 },
  { t: 36.4, kind: 'tight', gain: 0.46 },
  { t: 39.0, kind: 'resolve', gain: 0.58 }
]

const RISERS = [
  { t: 0.32, dur: 1.9 },
  { t: 3.4, dur: 1.5 },
  { t: 13.4, dur: 1.5 },
  { t: 25.4, dur: 1.5 },
  { t: 33.0, dur: 1.9 }
]

const KICK_STEPS = [0, 4, 8, 12]
const CLAP_STEPS = [4, 12]
const ARP_MASK = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1]
const BASS_STEPS = [
  { step: 0, offset: 0, dur: 0.26 },
  { step: 3, offset: 0, dur: 0.16 },
  { step: 6, offset: 0, dur: 0.2 },
  { step: 8, offset: 0, dur: 0.24 },
  { step: 11, offset: 7, dur: 0.16 },
  { step: 14, offset: 0, dur: 0.2 }
]

function buildMusic() {
  const rand = mulberry32(20261019)
  const track = new Track(DURATION, 2)

  for (let bar = 0; bar < BARS; bar += 1) {
    const section = sectionFor(bar)
    const chord = CHORDS[bar % CHORDS.length]
    const barStart = bar * BAR

    // The last five bars resolve on one sustained A minor chord.
    if (bar === 19) {
      for (const tone of [220.0, 261.63, 329.63, 440.0, 523.25]) {
        track.addMono(
          pad({ duration: 5.4, freq: tone, cutoff: 1500, q: 1.1, attack: 0.03, release: 1.8, level: 0.16, rand }),
          0.9,
          (tone / 440) - 0.55,
          barStart
        )
      }
    } else if (bar >= 20) {
      // no new pad: let the final chord ring
    } else if (section.pad) {
      for (const tone of chord.pad) {
        track.addMono(
          pad({ duration: BAR + 0.6, freq: tone, cutoff: 900 + (bar % 4) * 180, q: 1.05, attack: 0.45, release: 0.7, level: 0.2, rand }),
          0.85,
          (tone / 440) - 0.4,
          barStart
        )
      }
    }

    for (let step = 0; step < 16; step += 1) {
      const at = barStart + step * STEP

      if (section.kick && KICK_STEPS.includes(step)) {
        track.addMono(kick({ rand, level: 1 }), 0.42, 0, at)
      }
      if (section.clap && CLAP_STEPS.includes(step)) {
        track.addMono(clap({ rand }), 0.62, -0.08, at)
      }
      if (section.hat) {
        const sixteenth = section.hat === 2
        if (sixteenth || step % 2 === 0) {
          const accent = step % 4 === 2 ? 0.3 : 0.17
          const open = step === 14
          track.addMono(hat({ duration: open ? 0.2 : 0.05, cutoff: 7800 + (step % 4) * 500, decay: open ? 0.09 : 0.016, level: accent, rand }), 0.95, 0.22, at)
          track.addMono(hat({ duration: open ? 0.2 : 0.05, cutoff: 8000, decay: open ? 0.09 : 0.016, level: accent * 0.8, rand }), 0.7, -0.25, at)
        }
      }
      if (section.bass >= 1) {
        for (const note of BASS_STEPS) {
          if (note.step !== step) continue
          const frequency = chord.root * Math.pow(2, note.offset / 12)
          track.addMono(subBass({ duration: note.dur + 0.12, freq: frequency, decay: note.dur * 0.72, level: 1 }), 0.15, 0, at)
          if (section.bass >= 2) {
            track.addMono(pluck({ duration: 0.2, freq: frequency * 2, cutoff: 420, cutoffPeak: 1900, q: 5, decay: 0.1, level: 0.55, rand }), 0.42, 0, at)
          }
        }
      }
      if (section.arp >= 1 && ARP_MASK[step]) {
        const toneIndex = [0, 2, 1, 3, 2, 1, 3, 2][step % 8]
        const octave = step % 8 === 6 ? 2 : 1
        const frequency = chord.tones[toneIndex] * octave
        const bright = section.arp >= 2
        track.addMono(
          pluck({
            duration: 0.26,
            freq: frequency,
            cutoff: bright ? 700 : 380,
            cutoffPeak: bright ? 6400 : 1500,
            q: bright ? 8 : 4,
            decay: bright ? 0.14 : 0.2,
            level: bright ? 0.3 : 0.18,
            rand
          }),
          bright ? 1.05 : 0.55,
          step % 2 === 0 ? -0.42 : 0.42,
          at
        )
      }
      // A dry sixteenth tick marks the "working" state.
      if (section.tick && step % 2 === 0) {
        track.addMono(
          click({ duration: 0.02, cutoff: 7200, level: step % 4 === 0 ? 0.16 : 0.09, rand }),
          0.5,
          step % 4 === 0 ? -0.3 : 0.3,
          at
        )
      }
    }
  }

  // Accents on the cut grid.
  for (const hit of HITS) {
    if (hit.kind === 'heavy') {
      track.addMono(impact({ duration: 1.8, level: 1, rand }), hit.gain, 0, hit.t)
      track.addMono(whoosh({ duration: 0.6, startCutoff: 600, endCutoff: 9000, reverse: true, level: 0.34, rand }), 0.45, 0, hit.t - 0.3)
    } else if (hit.kind === 'tight') {
      track.addMono(impact({ duration: 0.85, freqStart: 200, freqEnd: 48, level: 0.9, rand }), hit.gain, 0, hit.t)
    } else if (hit.kind === 'sub') {
      track.addMono(subBass({ duration: 1.6, freq: 92, decay: 0.55, level: 1 }), hit.gain, 0, hit.t)
      track.addMono(whoosh({ duration: 0.5, startCutoff: 8200, endCutoff: 300, reverse: true, level: 0.4, rand }), 0.3, 0, hit.t - 0.22)
    } else if (hit.kind === 'pop') {
      track.addMono(pop({ duration: 0.26, freq: 170, freqEnd: 720, level: 0.8 }), hit.gain, 0, hit.t)
    } else if (hit.kind === 'resolve') {
      track.addMono(impact({ duration: 1.4, level: 0.9, rand }), hit.gain, 0, hit.t)
      track.addMono(subBass({ duration: 3.2, freq: 55, decay: 1.4, level: 0.9 }), 0.4, 0, hit.t)
      // a rising figure that lands on the sustained chord
      const notes = [440.0, 523.25, 659.25, 880.0]
      notes.forEach((freq, index) => {
        track.addMono(pluck({ duration: 0.5, freq, cutoff: 520, cutoffPeak: 7200, q: 6, decay: 0.22, level: 0.26, rand }), 0.7, (index - 1.5) * 0.35, hit.t + index * 0.12)
      })
    }
  }

  for (const rise of RISERS) {
    track.addMono(riser({ duration: rise.dur, startCutoff: 320, endCutoff: 11500, level: 0.3, rand }), 0.5, 0, rise.t)
  }

  const wet = reverb(track.data[0], { mix: 0.14, decay: 0.83, damp: 0.32, width: 1 })
  const wetR = reverb(track.data[1], { mix: 0.14, decay: 0.81, damp: 0.32, width: 1 })
  const ping = pingPong(track.data[0], { time: 0.375, feedback: 0.26, mix: 0.1 })

  const out = new Track(DURATION, 2)
  const rumbleL = onePoleHighpass(track.data[0], 34)
  const rumbleR = onePoleHighpass(track.data[1], 34)
  for (let i = 0; i < track.length; i += 1) {
    const fadeIn = Math.min(1, i / (SR * 0.05))
    const fadeOut = Math.min(1, Math.max(0, (track.length - i) / (SR * 1.6)))
    const env = fadeIn * fadeOut
    out.data[0][i] = (rumbleL[i] + wet.left[i] + ping.left[i] * 0.6) * env
    out.data[1][i] = (rumbleR[i] + wetR.right[i] + ping.right[i] * 0.6) * env
  }
  return out.finish({ targetRms: 0.125, ceiling: 0.94 })
}

async function buildSfx() {
  const rand = mulberry32(77123)
  const files = {}

  const write = async (name, channels) => {
    await writeFile(path.join(SFX, `${name}.wav`), writeWav(null, channels))
    files[name] = `audio/sfx/${name}.wav`
  }

  const mono = (buffer) => [buffer, buffer]

  await write('whoosh-forward', mono(whoosh({ duration: 0.5, startCutoff: 320, endCutoff: 8200, level: 0.9, rand })))
  await write('whoosh-reverse', mono(whoosh({ duration: 0.55, startCutoff: 8200, endCutoff: 320, reverse: true, level: 0.9, rand })))
  await write('whoosh-short', mono(whoosh({ duration: 0.28, startCutoff: 500, endCutoff: 9600, level: 0.85, rand })))
  await write('impact-heavy', mono(impact({ duration: 1.8, level: 1, rand })))
  await write('impact-tight', mono(impact({ duration: 0.9, freqStart: 200, freqEnd: 48, level: 0.85, rand })))
  await write('click-soft', mono(click({ duration: 0.05, cutoff: 3600, level: 0.7, rand })))
  await write('click-hard', mono(click({ duration: 0.04, cutoff: 5600, level: 1, rand })))
  await write('blip-up', mono(blip({ duration: 0.18, freq: 760, freqEnd: 1240, level: 0.6 })))
  await write('pop-reveal', mono(pop({ duration: 0.3, freq: 150, freqEnd: 700, level: 0.85 })))
  await write('tank-clank', mono(clank({ duration: 0.9, level: 0.85, rand })))
  await write('tank-tread', mono(tread({ duration: 1.0, level: 0.85, rand })))
  await write('ant-scuttle', mono(scuttle({ duration: 0.6, level: 0.55, rand })))
  await write('riser', mono(riser({ duration: 2.0, startCutoff: 300, endCutoff: 11000, level: 0.75, rand })))
  await write('sub-drop', mono(subBass({ duration: 1.2, freq: 120, decay: 0.4, level: 1 })))
  return files
}

async function main() {
  await mkdir(SFX, { recursive: true })
  const music = buildMusic()
  await writeFile(path.join(OUT, 'music.music.wav'), writeWav(null, music.data))
  console.log(`music.music.wav  ${DURATION.toFixed(1)}s  ${BPM} BPM  ${BARS} bars`)
  const sfx = await buildSfx()
  console.log(`sfx: ${Object.keys(sfx).length} one-shots`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
