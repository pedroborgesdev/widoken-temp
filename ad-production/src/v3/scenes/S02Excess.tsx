import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { COLORS, EASE, clamp } from '../tokens'
import { CountUp, Mono, Words } from '../type'
import { Meter } from '../art'

/**
 * S02 · TUDO ISSO  (00:05–00:10)
 *
 * The six wheels the tank left behind land as six meters. They bloom one
 * by one until the frame is a field of disconnected numbers, and the
 * sentence is cut in half by the question it should always have been.
 *
 * Percentages are the real fixture values captured from the widget (used,
 * not remaining) and the field is labelled as demonstration data.
 */

interface MeterDef {
  name: string
  value?: number
  money?: string
  color: string
  x: number
  y: number
  width: number
  note: string
  bloom: number
  late?: boolean
}

const METERS: MeterDef[] = [
  { name: 'CLAUDE', value: 64, color: COLORS.ringWarning, x: 96, y: 120, width: 430, note: 'SEMANAL · RENOVA EM 3 DIAS', bloom: 0 },
  { name: 'CHATGPT', value: 22, color: COLORS.ringSuccess, x: 700, y: 96, width: 380, note: '5 HORAS · 3H 32M', bloom: 8 },
  { name: 'CURSOR', value: 81, color: COLORS.ringDanger, x: 1300, y: 150, width: 540, note: 'CURSOR · 405 / 500', bloom: 16 },
  { name: 'ANTIGRAVITY', value: 44, color: COLORS.ringSuccess, x: 110, y: 470, width: 470, note: 'GEMINI · RENOVA EM 2 DIAS', bloom: 24 },
  { name: 'COPILOT', value: 56, color: COLORS.ringWarning, x: 700, y: 590, width: 520, note: 'PREMIUM · 168 / 300', bloom: 32 },
  { name: 'DEEPSEEK', money: '$2.00', color: COLORS.ringBalance, x: 1350, y: 470, width: 460, note: 'RESTANTE · HARNESS', bloom: 40 },
  { name: 'HUGGING FACE', money: '$15.00', color: COLORS.ringBalance, x: 1230, y: 820, width: 430, note: 'RESTANTE', bloom: 42, late: true }
]

const RING_R = 22

function MeterBlock({ meter, frame }: { meter: MeterDef; frame: number }) {
  const bloom = meter.bloom
  // Every element of a meter enters on its own bloom frame: at the cut from
  // S01 the block must be exactly the wheel (white ring + black hub) and
  // nothing else, or the shared circle pops.
  const click = clamp((frame - bloom) / 3)
  const nameIn = EASE.outQuint(clamp((frame - bloom) / 6))
  const barIn = EASE.outQuint(clamp((frame - bloom) / 10))
  const noteIn = clamp((frame - bloom - 2) / 6)
  const lateIn = meter.late ? EASE.outExpo(clamp((frame - bloom) / 7)) : 1
  const lateX = meter.late ? (1 - lateIn) * 1500 : 0
  const ringColor = click > 0.5 ? meter.color : COLORS.ringIdle
  const hole = 14.5 + 1.9 * click

  return (
    <div
      style={{
        position: 'absolute',
        left: meter.x + lateX,
        top: meter.y,
        width: meter.width,
        opacity: lateIn
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: RING_R * 2,
          height: RING_R * 2,
          borderRadius: '50%',
          background: ringColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: hole * 2,
            height: hole * 2,
            borderRadius: '50%',
            background: click > 0.5 ? COLORS.paper : COLORS.ink
          }}
        />
      </div>

      <div
        style={{
          marginLeft: 58,
          marginTop: 2,
          opacity: nameIn,
          transform: `translateY(${(1 - nameIn) * 10}px)`
        }}
      >
        <Mono size={25} color={COLORS.ink} tracking={0.1}>
          {meter.name}
        </Mono>
      </div>

      <div style={{ marginTop: 6, height: 86 }}>
        {meter.money ? (
          <span
            style={{
              fontFamily: 'Archivo, Archivo Black, sans-serif',
              fontSize: 74,
              fontWeight: 900,
              fontVariationSettings: "'wght' 900",
              letterSpacing: '-0.04em',
              lineHeight: 0.9,
              color: COLORS.ink,
              opacity: nameIn
            }}
          >
            {meter.money}
          </span>
        ) : (
          <div style={{ opacity: clamp((frame - bloom) / 3) }}>
            <CountUp value={meter.value ?? 0} from={bloom} duration={9} size={88} color={COLORS.ink} />
          </div>
        )}
      </div>

      {meter.money ? null : (
        <div
          style={{
            position: 'relative',
            width: meter.width,
            height: 14,
            marginTop: 12,
            opacity: barIn
          }}
        >
          <Meter x={0} y={0} width={meter.width} height={14} value={(meter.value ?? 0) * barIn} color={meter.color} />
        </div>
      )}

      <div style={{ marginTop: 12, opacity: noteIn }}>
        <Mono size={23} color={COLORS.inkMuted} tracking={0.06}>
          {meter.note}
        </Mono>
      </div>
    </div>
  )
}

export function S02Excess() {
  const frame = useCurrentFrame()

  // A slow camera push makes the field encroach on the frame.
  const push = EASE.inOutCubic(clamp((frame - 30) / 100))
  const fieldScale = 1 + 0.075 * push

  const typeIn = EASE.outExpo(clamp((frame - 75) / 5))
  const type2In = EASE.outExpo(clamp((frame - 78) / 5))
  // The field steps back so the sentence can be read; the data stays as a
  // ghost of what the sentence is dismissing.
  const metersDim = 1 - 0.9 * typeIn

  const bandIn = EASE.outQuint(clamp((frame - 105) / 8))
  const bandOut = EASE.inOutCubic(clamp((frame - 127) / 12))
  const bandTop = 356 - 356 * bandOut
  const bandHeight = 470 + 610 * bandOut
  const textIn = EASE.outQuint(clamp((frame - 107) / 6))

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${fieldScale})`,
          transformOrigin: '50% 44%',
          opacity: metersDim
        }}
      >
        {METERS.map((meter) => (
          <MeterBlock key={meter.name} meter={meter} frame={frame} />
        ))}
      </div>

      <div style={{ position: 'absolute', left: 84, bottom: 44, opacity: clamp((frame - 8) / 10) }}>
        <Mono size={22} color={COLORS.inkMuted} tracking={0.16}>
          DADOS DE DEMONSTRAÇÃO
        </Mono>
      </div>

      {/* The interruption. */}
      <div
        style={{
          position: 'absolute',
          left: 84,
          top: 150,
          opacity: typeIn,
          transform: `translateX(${(1 - typeIn) * -120}px)`
        }}
      >
        <Words
          text="TUDO"
          size={392}
          lineHeight={0.8}
          from={75}
          duration={5}
          spec={() => ({ dir: 'wipeRight', easing: EASE.outExpo, scaleFrom: 1.03 })}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 330,
          top: 486,
          opacity: type2In,
          transform: `translateX(${(1 - type2In) * 120}px)`
        }}
      >
        <Words
          text="ISSO..."
          size={392}
          lineHeight={0.8}
          from={78}
          duration={5}
          spec={() => ({ dir: 'wipeRight', easing: EASE.outExpo })}
        />
      </div>

      {/* A band of black cuts the sentence and asks the real question. */}
      {frame >= 105 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: bandTop,
            width: 1920,
            height: bandHeight,
            background: COLORS.ink,
            overflow: 'hidden',
            clipPath: `inset(0 0 0 ${(1 - bandIn) * 100}%)`,
            WebkitClipPath: `inset(0 0 0 ${(1 - bandIn) * 100}%)`,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div style={{ paddingLeft: 190, opacity: textIn, transform: `translateY(${(1 - textIn) * 34}px)` }}>
            <Words
              text="…SÓ PRA VER SEU USO?"
              size={112}
              color={COLORS.paper}
              lineHeight={0.9}
              from={107}
              duration={6}
              stagger={0.8}
              spec={(_index, word) => ({
                dir: 'up',
                easing: EASE.outExpo,
                color: word.startsWith('USO') ? COLORS.green : COLORS.paper
              })}
            />
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
