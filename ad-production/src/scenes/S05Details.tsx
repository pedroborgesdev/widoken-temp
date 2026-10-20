import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Mono } from '../brand/Typography'
import { COLORS, EASE } from '../brand/tokens'
import { Kinetic } from '../motion/Kinetic'
import { ProductShot } from '../product/ProductShot'

function Annotation({
  color,
  label,
  value
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 44 }}>
      <span style={{ width: 18, height: 18, background: color, display: 'block', marginTop: 5, flex: 'none' }} />
      <div>
        <Mono size={21} color={COLORS.ink} tracking={0.16}>
          {label}
        </Mono>
        <div
          style={{
            fontFamily: 'Archivo, Archivo Black, sans-serif',
            fontSize: 46,
            fontWeight: 900,
            fontVariationSettings: "'wght' 900",
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: COLORS.ink,
            marginTop: 4
          }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

/**
 * SEQUENCE 05 - INFORMAÇÃO IMEDIATA.
 *
 * The real hover popover, captured from the running widget. The graphic
 * highlights live entirely outside the interface.
 */
export function S05Details() {
  const frame = useCurrentFrame()

  const beatA = Math.min(1, Math.max(0, (frame - 2) / 9))
  const beatAOut = 1 - EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 92) / 10)))
  const shotIn = EASE.outQuint(Math.min(1, Math.max(0, (frame - 16) / 18)))
  const shotX = 790 + (1980 - 790) * (1 - shotIn)
  const shotOpacity = Math.min(1, Math.max(0, (frame - 16) / 8))

  // A slow 2D push toward the popover.
  const push = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 44) / 56)))
  const tagA = Math.min(1, Math.max(0, (frame - 34) / 9))
  const tagB = Math.min(1, Math.max(0, (frame - 44) / 9))

  const beatB = Math.min(1, Math.max(0, (frame - 104) / 9))
  const balanceIn = EASE.outQuint(Math.min(1, Math.max(0, (frame - 110) / 18)))
  const balanceX = 760 + (1960 - 760) * (1 - balanceIn)
  const balanceOpacity = Math.min(1, Math.max(0, (frame - 110) / 8))
  const tagC = Math.min(1, Math.max(0, (frame - 130) / 9))

  return (
    <AbsoluteFill>
      {/* --- beat A: the Cursor usage popover --- */}
      <div style={{ position: 'absolute', left: 96, top: 66, opacity: beatA * beatAOut }}>
        <Kinetic
          text="QUER"
          size={180}
          lineHeight={0.84}
          from={2}
          duration={10}
          perWord={() => ({ delay: 0, duration: 10, easing: EASE.outExpo })}
        />
      </div>
      <div style={{ position: 'absolute', left: 96, top: 221, opacity: beatA * beatAOut }}>
        <Kinetic
          text="DETALHES?"
          size={180}
          lineHeight={0.84}
          from={6}
          duration={10}
          perWord={() => ({ delay: 0, duration: 10, easing: EASE.outExpo })}
        />
      </div>

      <div style={{ position: 'absolute', left: 96, top: 500, opacity: tagA * beatAOut }}>
        <Annotation color={COLORS.ringDanger} label="USO" value="81% · 35%" />
      </div>
      <div style={{ position: 'absolute', left: 96, top: 648, opacity: tagB * beatAOut }}>
        <Annotation color={COLORS.ink} label="RENOVAÇÃO" value="EM 11 DIAS" />
      </div>

      <ProductShot
        capture="widget-horizontal-popover"
        x={shotX}
        y={420}
        width={900}
        from={{ scale: 1 + 0.12 * push, x: -26 * push, y: -22 * push }}
        to={{ scale: 1 + 0.12 * push, x: -26 * push, y: -22 * push }}
        opacity={shotOpacity * beatAOut}
      />

      {/* --- beat B: the monetary balance popover --- */}
      {frame >= 100 ? (
        <>
          <div style={{ position: 'absolute', left: 96, top: 150, opacity: beatB }}>
            <Kinetic
              text="É SÓ OLHAR."
              size={236}
              lineHeight={0.84}
              from={104}
              duration={11}
              perWord={(index) => ({ delay: index * 1.2, duration: 10, easing: EASE.outExpo })}
            />
          </div>
          <div style={{ position: 'absolute', left: 96, top: 470, opacity: tagC }}>
            <Annotation color={COLORS.ringBalance} label="SALDO" value="US$ 2,00" />
          </div>
          <div style={{ position: 'absolute', left: 96, top: 640, opacity: tagC }}>
            <Mono size={21} color={COLORS.inkSoft} tracking={0.12}>
              DEEPSEEK · HARNESS
            </Mono>
          </div>
          <ProductShot
            capture="widget-vertical-popover-balance"
            crop={{ x: 120, y: 1040, width: 1540, height: 460 }}
            x={balanceX}
            y={430}
            width={1040}
            opacity={balanceOpacity}
          />
        </>
      ) : null}
    </AbsoluteFill>
  )
}
