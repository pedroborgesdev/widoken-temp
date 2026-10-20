import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { COLORS, EASE, clamp } from '../tokens'
import { Words } from '../type'
import { WidokenIcon } from '../art'

/**
 * S08 · SIMPLES E FÁCIL  (00:35–00:39)
 *
 * The negative and the positive occupy the same typographic slots. A green
 * ring — the shape of the product's own indicators — sweeps the war out,
 * and the simple sentence lands in the space it cleared.
 * On the last beat the sentence splits and the brand is already behind it.
 */

const RING_CX = 700
const RING_CY = 520
const RING_MAX = 1620

export function S08Phrase() {
  const frame = useCurrentFrame()

  // The negative sentence needs a beat of its own before the ring wipes it:
  // it used to be erased one frame after its last word landed.
  const erase = EASE.inOutCubic(clamp((frame - 28) / 8))
  const r = RING_MAX * erase
  const ringOpacity = clamp((RING_MAX - r) / 340)
  const erased = frame >= 36

  const revealFrom = 33
  // The sentence must be off the centre before the brand shows through it.
  const split = EASE.inCubic(clamp((frame - 102) / 16))
  const iconIn = EASE.outQuint(clamp((frame - 116) / 3))
  const iconSize = 320 * (0.82 + 0.18 * iconIn)

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      {/* The brand waits behind the sentence. */}
      {frame >= 116 ? (
        <div
          style={{
            position: 'absolute',
            left: 960 - iconSize / 2,
            top: 500 - iconSize / 2,
            opacity: iconIn
          }}
        >
          <WidokenIcon size={iconSize} />
        </div>
      ) : null}

      {/* Layer 1: the excess. */}
      <div style={{ position: 'absolute', left: 84, top: 140, opacity: erased ? 0 : 1 }}>
        <Words
          text="VOCÊ NÃO QUER"
          size={118}
          weight={700}
          tracking={0.01}
          lineHeight={1}
          color={COLORS.inkSoft}
          from={-6}
          duration={7}
          stagger={1}
          spec={() => ({ dir: 'wipeRight', easing: EASE.outQuint })}
        />
      </div>
      <div style={{ position: 'absolute', left: 84, top: 296, opacity: erased ? 0 : 1 }}>
        <Words
          text="UM TANQUE"
          size={280}
          lineHeight={0.82}
          from={1}
          duration={8}
          stagger={0.8}
          spec={(_index, word) => ({
            dir: 'up',
            easing: EASE.outExpo,
            scaleFrom: 1.05,
            color: word === 'TANQUE' ? COLORS.red : COLORS.ink
          })}
        />
      </div>
      <div style={{ position: 'absolute', left: 84, top: 610, opacity: erased ? 0 : 1 }}>
        <Words
          text="DE GUERRA."
          size={260}
          lineHeight={0.84}
          from={3}
          duration={8}
          stagger={1}
          spec={(_index, word) => ({
            dir: 'right',
            distance: 0.16,
            easing: EASE.outExpo,
            color: word.startsWith('GUERRA') ? COLORS.red : COLORS.ink
          })}
        />
      </div>

      {/* Layer 2: a white disc erases the sentence, led by the product's own
          green indicator ring. The ring is painted *after* the disc, otherwise
          the disc covers its stroke and the sweep has no edge. */}
      {erase > 0 && erase < 1 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: COLORS.paper,
            clipPath: `circle(${r}px at ${RING_CX}px ${RING_CY}px)`,
            WebkitClipPath: `circle(${r}px at ${RING_CX}px ${RING_CY}px)`
          }}
        />
      ) : null}
      {erase > 0 && erase < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: RING_CX - r,
            top: RING_CY - r,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            boxShadow: `inset 0 0 0 12px ${COLORS.green}`,
            opacity: ringOpacity
          }}
        />
      ) : null}

      {/* …and the simple sentence lands in the cleared space. */}
      <div
        style={{
          position: 'absolute',
          left: 84,
          top: 140,
          opacity: frame >= revealFrom ? 1 : 0,
          transform: `translateX(${-split * 1500}px)`
        }}
      >
        <Words
          text="O QUE VOCÊ QUER É"
          size={118}
          weight={700}
          tracking={0.01}
          lineHeight={1}
          color={COLORS.inkSoft}
          from={revealFrom}
          duration={7}
          stagger={1}
          spec={() => ({ dir: 'up', easing: EASE.outExpo })}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 84,
          top: 296,
          opacity: frame >= revealFrom ? 1 : 0,
          transform: `translateX(${-split * 1500}px)`
        }}
      >
        <Words
          text="SIMPLES"
          size={300}
          lineHeight={0.82}
          from={revealFrom + 1}
          duration={9}
          spec={() => ({ dir: 'up', easing: EASE.outExpo, scaleFrom: 1.04 })}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 84,
          top: 610,
          opacity: frame >= revealFrom ? 1 : 0,
          transform: `translateX(${split * 2200}px)`,
          display: 'flex',
          alignItems: 'flex-end'
        }}
      >
        <Words
          text="E FÁCIL"
          size={260}
          lineHeight={0.84}
          from={revealFrom + 2}
          duration={9}
          spec={() => ({ dir: 'up', easing: EASE.outExpo })}
        />
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            background: COLORS.green,
            marginBottom: 24,
            marginLeft: 14,
            opacity: EASE.outQuint(clamp((frame - revealFrom - 9) / 6))
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
