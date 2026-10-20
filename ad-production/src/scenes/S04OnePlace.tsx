import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Mono } from '../brand/Typography'
import { COLORS, EASE } from '../brand/tokens'
import { Kinetic } from '../motion/Kinetic'
import { ProductShot } from '../product/ProductShot'

/** The seven integrations the widget actually shows, with their ring colours. */
const PROVIDERS: Array<{ name: string; color: string }> = [
  { name: 'Claude', color: COLORS.ringSuccess },
  { name: 'ChatGPT', color: COLORS.ringSuccess },
  { name: 'Cursor', color: COLORS.ringDanger },
  { name: 'Antigravity', color: COLORS.ringSuccess },
  { name: 'GitHub Copilot', color: COLORS.ringWarning },
  { name: 'DeepSeek', color: COLORS.ringBalance },
  { name: 'Hugging Face', color: COLORS.ringBalance }
]

/**
 * SEQUENCE 04 - TODAS AS IAS EM UMA VISÃO.
 *
 * The real widget becomes the hero of the frame: every provider, one strip.
 * The provider list is editorial annotation beside the product, never on it.
 */
export function S04OnePlace() {
  const frame = useCurrentFrame()

  const line1 = Math.min(1, Math.max(0, (frame - 6) / 10))
  const line2 = Math.min(1, Math.max(0, (frame - 50) / 10))

  const widgetIn = EASE.outQuint(Math.min(1, Math.max(0, (frame - 22) / 20)))
  const widgetX = -70 + 166 * widgetIn
  const widgetY = 660 - 60 * widgetIn
  const widgetOpacity = Math.min(1, Math.max(0, (frame - 22) / 8))

  // A slow 2D push toward the provider icons.
  const push = EASE.inOutCubic(Math.min(1, Math.max(0, (frame - 64) / 100)))
  const listIn = Math.min(1, Math.max(0, (frame - 72) / 10))

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 96, top: 66, opacity: line1 }}>
        <Kinetic
          text="SUAS IAS."
          size={272}
          lineHeight={0.84}
          from={6}
          duration={13}
          perWord={(index) => ({
            delay: index * 1.6,
            duration: 12,
            easing: EASE.outExpo,
            scaleFrom: index === 1 ? 1.05 : 1
          })}
        />
      </div>

      <div style={{ position: 'absolute', left: 96, top: 294, opacity: line2 }}>
        <Kinetic
          text="UM SÓ LUGAR."
          size={190}
          lineHeight={0.86}
          from={50}
          duration={12}
          perWord={(index) => ({
            delay: index * 1.3,
            duration: 11,
            easing: EASE.outExpo,
            offsetX: index === 1 ? -14 : 0
          })}
        />
      </div>

      {/* The real widget, in full width, as the hero of the frame. */}
      <ProductShot
        capture="widget-horizontal"
        x={widgetX}
        y={widgetY}
        width={1345}
        from={{ scale: 1 + 0.05 * push, x: -18 * push, y: 0 }}
        to={{ scale: 1 + 0.05 * push, x: -18 * push, y: 0 }}
        opacity={widgetOpacity}
      />

      {/* Editorial annotation, outside the interface. */}
      <div style={{ position: 'absolute', left: 1560, top: 90, opacity: listIn }}>
        <Mono size={19} color={COLORS.inkSoft} tracking={0.2}>
          7 INTEGRAÇÕES
        </Mono>
        <div style={{ marginTop: 18 }}>
          {PROVIDERS.map((provider, index) => (
            <div
              key={provider.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                height: 33,
                opacity: Math.min(1, Math.max(0, (frame - 74 - index * 2.2) / 8))
              }}
            >
              <span style={{ width: 14, height: 14, background: provider.color, display: 'block' }} />
              <Mono size={20} color={COLORS.ink} tracking={0.06} uppercase={false}>
                {provider.name}
              </Mono>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  )
}
