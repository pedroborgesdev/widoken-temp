import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Cursor } from '../art'
import { COLORS, EASE, clamp } from '../tokens'
import { Mono, Words } from '../type'
import { Camera, Shot, centre, lerpCamera } from '../product'

/**
 * S05 · DETALHES  (00:21–00:27)
 *
 * Two real hover states, each one carried into the frame by the ring that
 * opened it.
 *
 * Data semantics, verified in the source (src/shared/providerUsage.ts and
 * src/renderer/utils/usageFormat.ts):
 *   - a percentage is USED, never remaining ("405 / 500 used" = 81%);
 *   - "left"/"right" are the two halves of a split ring, not remaining;
 *   - a monetary balance is remaining and is shown as an amount.
 * The copy therefore says "quanto já foi" for usage and "quanto resta"
 * only for the balance.
 */

const POPOVER = 'widget-horizontal-popover' as const
const BALANCE = 'widget-vertical-popover-balance' as const
const PLAIN = 'widget-vertical' as const

const cursorIcon = centre(POPOVER, 'cursor')
const popoverPill = centre(POPOVER, 'pill')
const balancePill = centre(BALANCE, 'pill')
const plainPill = centre(PLAIN, 'pill')

const A_CLOSE: Camera = {
  focusX: cursorIcon.x,
  focusY: cursorIcon.y,
  atX: 1360,
  atY: 470,
  scale: 10.5
}
const A_WIDE: Camera = {
  focusX: popoverPill.x,
  focusY: popoverPill.y,
  atX: 1345,
  atY: 200,
  scale: 2.35
}

/** The pill stays at the same frame point when the hover ends. */
const B_CAM: Camera = { focusX: balancePill.x, focusY: balancePill.y, atX: 863, atY: 596, scale: 2.45 }
const B_PLAIN: Camera = { focusX: plainPill.x, focusY: plainPill.y, atX: 863, atY: 596, scale: 2.45 }

const DEEPSEEK_ICON_FRAME = {
  x: 863 + (79 - balancePill.x) * 2.45,
  y: 596 + (337 - balancePill.y) * 2.45
}

export function S05Details() {
  const frame = useCurrentFrame()

  const pullBack = EASE.inOutCubic(clamp(frame / 26))
  const aCam = lerpCamera(A_CLOSE, A_WIDE, pullBack)
  const beatAOut = EASE.inOutCubic(clamp((frame - 86) / 8))

  const beatB = frame >= 96
  const curtainIn = EASE.outQuint(clamp((frame - 86) / 8))
  const curtainOut = EASE.inOutCubic(clamp((frame - 96) / 9))

  const typeA = EASE.outExpo(clamp((frame - 28) / 9))
  const typeA2 = EASE.outExpo(clamp((frame - 38) / 9))
  const noteA = clamp((frame - 50) / 8)

  const typeB = EASE.outExpo(clamp((frame - 108) / 9))
  const typeB2 = EASE.outExpo(clamp((frame - 118) / 9))
  const noteB = clamp((frame - 132) / 8)

  const cursorAway = EASE.inCubic(clamp((frame - 164) / 10))

  return (
    <AbsoluteFill>
      {/* ---------- beat A: usage popover, percentage ---------- */}
      {!beatB ? (
        <>
          <Shot name={POPOVER} camera={aCam} opacity={1 - beatAOut} />
          <div style={{ opacity: 1 - beatAOut }}>
            <div style={{ position: 'absolute', left: 84, top: 292, opacity: typeA, transform: `translateX(${(1 - typeA) * -70}px)` }}>
              <Words
                text="QUANTO"
                size={150}
                lineHeight={0.84}
                from={28}
                duration={8}
                spec={() => ({ dir: 'up', easing: EASE.outExpo, scaleFrom: 1.03 })}
              />
            </div>
            <div style={{ position: 'absolute', left: 84, top: 462, opacity: typeA2, transform: `translateX(${(1 - typeA2) * -70}px)` }}>
              <Words
                text="JÁ FOI."
                size={150}
                lineHeight={0.84}
                from={38}
                duration={8}
                spec={() => ({ dir: 'up', easing: EASE.outExpo })}
              />
            </div>
            <div style={{ position: 'absolute', left: 86, top: 754, opacity: noteA }}>
              <Mono size={30} color={COLORS.ink} tracking={0.08}>
                81% JÁ USADO
              </Mono>
            </div>
            <div style={{ position: 'absolute', left: 86, top: 806, opacity: noteA }}>
              <Mono size={30} color={COLORS.inkSoft} tracking={0.08}>
                405 / 500 · RENOVA EM 11 DIAS
              </Mono>
            </div>
            <div style={{ position: 'absolute', left: 86, bottom: 44, opacity: noteA }}>
              <Mono size={22} color={COLORS.inkMuted} tracking={0.14}>
                DADOS DE DEMONSTRAÇÃO
              </Mono>
            </div>
            <Cursor x={1176} y={212} scale={1.35} />
          </div>
        </>
      ) : (
        <>
          <Shot name={frame < 170 ? BALANCE : PLAIN} camera={frame < 170 ? B_CAM : B_PLAIN} />
          <div style={{ position: 'absolute', left: 84, top: 292, opacity: typeB, transform: `translateX(${(1 - typeB) * -70}px)` }}>
            <Words
              text="QUANTO"
              size={150}
              lineHeight={0.84}
              from={108}
              duration={8}
              spec={() => ({ dir: 'up', easing: EASE.outExpo, scaleFrom: 1.03 })}
            />
          </div>
          <div style={{ position: 'absolute', left: 84, top: 462, opacity: typeB2, transform: `translateX(${(1 - typeB2) * -70}px)` }}>
            <Words
              text="RESTA."
              size={150}
              lineHeight={0.84}
              from={118}
              duration={8}
              spec={() => ({ dir: 'up', easing: EASE.outExpo })}
            />
          </div>
          <div style={{ position: 'absolute', left: 86, top: 700, opacity: noteB }}>
            <div
              style={{
                fontFamily: 'Archivo, Archivo Black, sans-serif',
                fontSize: 92,
                fontWeight: 900,
                fontVariationSettings: "'wght' 900",
                letterSpacing: '-0.04em',
                lineHeight: 0.9,
                color: COLORS.ink
              }}
            >
              $2.00
            </div>
          </div>
          <div style={{ position: 'absolute', left: 86, top: 812, opacity: noteB }}>
            <Mono size={28} color={COLORS.inkSoft} tracking={0.08}>
              SALDO USD · PLANO HARNESS
            </Mono>
          </div>
          <div style={{ position: 'absolute', left: 86, bottom: 44, opacity: noteB }}>
            <Mono size={22} color={COLORS.inkMuted} tracking={0.14}>
              DADOS DE DEMONSTRAÇÃO
            </Mono>
          </div>
          {frame < 170 ? (
            <Cursor
              x={DEEPSEEK_ICON_FRAME.x + 8 + cursorAway * 460}
              y={DEEPSEEK_ICON_FRAME.y + 4 + cursorAway * 240}
              scale={1.35}
              opacity={1 - cursorAway}
            />
          ) : null}
        </>
      )}

      {/* The panel wipe between the two hover states. */}
      {frame >= 86 && frame <= 108 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: COLORS.ink,
            clipPath:
              frame < 96
                ? `inset(0 0 0 ${(1 - curtainIn) * 100}%)`
                : `inset(0 ${curtainOut * 100}% 0 0)`,
            WebkitClipPath:
              frame < 96
                ? `inset(0 0 0 ${(1 - curtainIn) * 100}%)`
                : `inset(0 ${curtainOut * 100}% 0 0)`
          }}
        />
      ) : null}
    </AbsoluteFill>
  )
}
