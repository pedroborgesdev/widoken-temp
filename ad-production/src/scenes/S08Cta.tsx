import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Ant, Tank, WidokenIcon } from '../brand/Illustrations'
import { Mono } from '../brand/Typography'
import { COLORS, EASE } from '../brand/tokens'
import { Kinetic } from '../motion/Kinetic'
import { ProductShot } from '../product/ProductShot'

const RELEASE_URL = 'github.com/pedroborgesdev/widoken/releases/latest'

/**
 * SEQUENCE 08 - CTA.
 *
 * Three typographic beats, then the end card: official icon, wordmark, the
 * real widget and the call to action.
 */
export function S08Cta() {
  const frame = useCurrentFrame()

  const beat1 = Math.min(1, Math.max(0, (frame - 2) / 9))
  const beat2 = Math.min(1, Math.max(0, (frame - 46) / 9))
  const beat3 = Math.min(1, Math.max(0, (frame - 92) / 9))
  const end = Math.min(1, Math.max(0, (frame - 134) / 10))

  const tankIn = EASE.outQuint(Math.min(1, Math.max(0, (frame - 8) / 18)))
  const tankX = 1560 - 120 * (1 - tankIn)

  const iconIn = EASE.outBack(Math.min(1, Math.max(0, (frame - 96) / 20)))
  const stripIn = EASE.outQuint(Math.min(1, Math.max(0, (frame - 136) / 18)))
  const stripX = 1790 + 240 * (1 - stripIn)

  const antX = 120 + Math.max(0, frame - 134) * 12

  return (
    <AbsoluteFill>
      {/* --- beat 1 --- */}
      {frame < 46 ? (
        <>
          <div style={{ position: 'absolute', left: 96, top: 90, opacity: beat1 }}>
            <Kinetic
              text="VOCÊ NÃO QUER"
              size={196}
              lineHeight={0.84}
              from={2}
              duration={10}
              perWord={(index) => ({ delay: index * 1.1, duration: 9, easing: EASE.outExpo })}
            />
          </div>
          <div style={{ position: 'absolute', left: 96, top: 255, opacity: beat1 }}>
            <Kinetic
              text="UM TANQUE"
              size={196}
              lineHeight={0.84}
              from={6}
              duration={10}
              perWord={(index) => ({ delay: index * 1.1, duration: 9, easing: EASE.outExpo })}
            />
          </div>
          <div style={{ position: 'absolute', left: 96, top: 420, opacity: beat1 }}>
            <Kinetic
              text="DE GUERRA."
              size={196}
              lineHeight={0.84}
              from={10}
              duration={10}
              perWord={(index) => ({ delay: index * 1.1, duration: 9, easing: EASE.outExpo })}
            />
          </div>
          <Tank width={430} style={{ position: 'absolute', left: tankX, top: 640, zIndex: 2 }} />
        </>
      ) : null}

      {/* --- beat 2 --- */}
      {frame >= 44 && frame < 92 ? (
        <>
          <div style={{ position: 'absolute', left: 96, top: 90, opacity: beat2 }}>
            <Kinetic
              text="QUER O"
              size={190}
              lineHeight={0.84}
              from={46}
              duration={10}
              perWord={(index) => ({ delay: index * 1.1, duration: 9, easing: EASE.outExpo })}
            />
          </div>
          <div style={{ position: 'absolute', left: 96, top: 253, opacity: beat2 }}>
            <Kinetic
              text="SIMPLES"
              size={206}
              lineHeight={0.84}
              from={52}
              duration={11}
              perWord={() => ({
                delay: 0,
                duration: 11,
                easing: EASE.outExpo,
                background: COLORS.green,
                color: COLORS.ink,
                paddingX: 28
              })}
            />
          </div>
          <div style={{ position: 'absolute', left: 96, top: 430, opacity: beat2 }}>
            <Kinetic
              text="E FÁCIL."
              size={206}
              lineHeight={0.84}
              from={58}
              duration={11}
              perWord={() => ({
                delay: 0,
                duration: 11,
                easing: EASE.outExpo,
                background: COLORS.amber,
                color: COLORS.ink,
                paddingX: 28
              })}
            />
          </div>
        </>
      ) : null}

      {/* --- beat 3 --- */}
      {frame >= 90 && frame < 130 ? (
        <>
          <div style={{ position: 'absolute', left: 96, top: 176, opacity: beat3 }}>
            <Kinetic
              text="E ISSO O WIDOKEN"
              size={150}
              lineHeight={0.86}
              from={92}
              duration={11}
              perWord={(index) => ({ delay: index * 1.1, duration: 10, easing: EASE.outExpo })}
            />
          </div>
          <div style={{ position: 'absolute', left: 96, top: 305, opacity: beat3 }}>
            <Kinetic
              text="ENTENDE."
              size={150}
              lineHeight={0.86}
              from={98}
              duration={11}
              perWord={() => ({ delay: 0, duration: 11, easing: EASE.outExpo })}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 1590,
              top: 210,
              opacity: Math.min(1, Math.max(0, (frame - 96) / 10)),
              transform: `scale(${0.6 + 0.4 * iconIn})`
            }}
          >
            <WidokenIcon size={280} />
          </div>
        </>
      ) : null}

      {/* --- end card --- */}
      {frame >= 132 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: 96,
              top: 300,
              opacity: end,
              transform: `scale(${0.86 + 0.14 * end})`
            }}
          >
            <WidokenIcon size={240} />
          </div>
          <div style={{ position: 'absolute', left: 390, top: 336, opacity: end }}>
            <Kinetic
              text="WIDOKEN"
              size={206}
              tracking={-0.02}
              lineHeight={0.86}
              from={134}
              duration={12}
              perWord={() => ({ delay: 0, duration: 12, easing: EASE.outExpo })}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 390,
              top: 534,
              width: 1027 * end,
              height: 16,
              background: COLORS.green,
              opacity: end
            }}
          />
          <div style={{ position: 'absolute', left: 96, top: 628, opacity: end }}>
            <Kinetic
              text="CONHEÇA O WIDOKEN."
              size={128}
              lineHeight={0.86}
              from={140}
              duration={11}
              perWord={(index) => ({ delay: index * 1.1, duration: 10, easing: EASE.outExpo })}
            />
          </div>
          <div style={{ position: 'absolute', left: 96, top: 758, opacity: end }}>
            <Mono size={22} color={COLORS.inkSoft} tracking={0.08} uppercase={false}>
              {RELEASE_URL}
            </Mono>
          </div>
          <ProductShot
            capture="widget-vertical"
            x={stripX}
            y={146}
            width={120}
            opacity={Math.min(1, Math.max(0, (frame - 136) / 8))}
          />
          <Ant
            width={58}
            phase={(frame / 7) % 1}
            style={{ position: 'absolute', left: antX, top: 892, zIndex: 8 }}
          />
        </>
      ) : null}
    </AbsoluteFill>
  )
}
