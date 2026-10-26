import React from 'react'
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { ActivityShot, Camera, CaptureName, Shot, box, centre, lerpCamera } from '../v3/product'
import { BrandLockup, ColorWipe, DemoLabel, Headline, Support, WidokenIcon } from './motion'
import { COLORS, EASE, SAFE, SUPPORT_SAFE, mix, progress } from './tokens'

export { S01Brand, S02Problem } from './scenes'

const FULL = 'widget-horizontal' as const
const H1 = 'widget-horizontal-1' as const
const H2 = 'widget-horizontal-2' as const
const H3 = 'widget-horizontal-3' as const
const H4 = 'widget-horizontal-4' as const
const H2_POP = 'widget-horizontal-popover-cursor-2' as const
const V3 = 'widget-vertical-3' as const
const V3_POP = 'widget-vertical-popover-cursor-3' as const
const V4_POP = 'widget-vertical-popover-cursor-4' as const

const pill = (name: CaptureName) => centre(name, 'pill')

const fullPill = pill(FULL)
const h2Pill = pill(H2)
const h2PopPill = pill(H2_POP)
const v3Pill = pill(V3)
const v3PopPill = pill(V3_POP)
const v4PopPill = pill(V4_POP)

const FULL_HERO: Camera = { focusX: fullPill.x, focusY: fullPill.y, atX: 1320, atY: 590, scale: 2.22 }
const H2_BASE: Camera = { focusX: h2Pill.x, focusY: h2Pill.y, atX: 1370, atY: 238, scale: 2.28 }
const H2_USAGE: Camera = { focusX: h2PopPill.x, focusY: h2PopPill.y, atX: 1370, atY: 238, scale: 2.28 }
const V3_BASE: Camera = { focusX: v3Pill.x, focusY: v3Pill.y, atX: 980, atY: 520, scale: 2.38 }
const V3_USAGE: Camera = { focusX: v3PopPill.x, focusY: v3PopPill.y, atX: 980, atY: 520, scale: 2.38 }
const V4_USAGE: Camera = { focusX: v4PopPill.x, focusY: v4PopPill.y, atX: 1120, atY: 500, scale: 2.02 }

function ProductFade({
  name,
  camera,
  amount,
  originX = camera.atX,
  originY = camera.atY,
  minScale = 0.94
}: {
  name: CaptureName
  camera: Camera
  amount: number
  originX?: number
  originY?: number
  minScale?: number
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: amount,
      transformOrigin: `${originX}px ${originY}px`,
      transform: `scale(${mix(minScale, 1, amount)})`
    }}>
      <Shot name={name} camera={camera} />
    </div>
  )
}

function UsageProduct({
  name,
  camera,
  amount,
  fill,
  originX = camera.atX,
  originY = camera.atY
}: {
  name: typeof H2_POP | typeof V3_POP | typeof V4_POP
  camera: Camera
  amount: number
  fill: number
  originX?: number
  originY?: number
}) {
  const bars = [box(name, 'bar-0'), box(name, 'bar-1')]
  return <div style={{
    position: 'absolute', inset: 0, opacity: amount,
    transformOrigin: `${originX}px ${originY}px`,
    transform: `scale(${mix(0.92, 1, amount)})`
  }}>
    <Shot name={name} camera={camera} />
    {bars.map((bar, index) => {
      const revealed = [0.81, 0.35][index] * fill
      const left = camera.atX + (bar.x - camera.focusX) * camera.scale
      const top = camera.atY + (bar.y - camera.focusY) * camera.scale
      return <div key={index} style={{
        position: 'absolute',
        left: left + bar.width * camera.scale * revealed,
        top,
        width: bar.width * camera.scale * (1 - revealed),
        height: bar.height * camera.scale,
        borderRadius: 999,
        background: '#49483e'
      }} />
    })}
  </div>
}

function ProgressiveWidget({ frame }: { frame: number }) {
  const variants: CaptureName[] = [H1, H2, H3, H4]
  const starts = [8, 31, 54, 77]
  return (
    <>
      {variants.map((name, index) => {
        const point = pill(name)
        const camera: Camera = { focusX: point.x, focusY: point.y, atX: 1190, atY: 540, scale: 3.18 }
        const enter = progress(frame, starts[index], 11, EASE.inOutCubic)
        const leave = index < variants.length - 1 ? progress(frame, starts[index + 1], 9, EASE.inOutCubic) : 0
        return <ProductFade key={name} name={name} camera={camera} amount={enter * (1 - leave)} minScale={0.9} />
      })}
    </>
  )
}

export function S03Solution() {
  const frame = useCurrentFrame()
  const reveal = progress(frame, 0, 11, EASE.inOutCubic)
  const productIn = progress(frame, 5, 15)
  const textSwap = progress(frame, 50, 9, EASE.inOutCubic)
  const camera = lerpCamera(
    { ...FULL_HERO, atX: 1370, atY: 600, scale: 2.02 },
    FULL_HERO,
    progress(frame, 100, 30, EASE.inOutCubic)
  )
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', inset: 0, background: COLORS.BRAND_ORANGE, clipPath: `inset(0 ${reveal * 100}% 0 0)` }} />
    <BrandLockup iconSize={58} wordSize={56} style={{ position: 'absolute', left: SAFE, top: 64, opacity: productIn * (1 - progress(frame, 105, 12)) }} />
    <div style={{ opacity: 1 - textSwap }}><Headline lines={['NÃO PRECISA.']} from={2} exitAt={50} size={106} style={{ position: 'absolute', left: SAFE, top: 244 }} /></div>
    <div style={{ opacity: textSwap }}><Headline lines={['CONHEÇA O', 'WIDOKEN.']} from={52} exitAt={116} size={104} accent={{ text: 'WIDOKEN.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 230 }} /></div>
    <Shot name={FULL} camera={camera} opacity={productIn} />
    <Support from={70} exitAt={118} size={28} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 102 }}>
      TODAS AS SUAS IAS. UM SÓ WIDGET.
    </Support>
  </AbsoluteFill>
}

export function S04Concept() {
  const frame = useCurrentFrame()
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 22, height: 1080, background: COLORS.BRAND_PURPLE }} />
    <div style={{ position: 'absolute', right: 0, bottom: 0, width: 310, height: 18, background: COLORS.BRAND_GREEN }} />
    <ProgressiveWidget frame={frame} />
    <Headline lines={['SUAS IAS.']} from={8} exitAt={45} size={142} style={{ position: 'absolute', left: SAFE, top: 72 }} />
    <Headline lines={['SEUS LIMITES.']} from={48} exitAt={87} size={138} color={COLORS.BRAND_PURPLE} style={{ position: 'absolute', right: SAFE, bottom: 82 }} align="right" />
    <Headline lines={['NUMA OLHADA.']} from={90} exitAt={132} size={150} accent={{ text: 'OLHADA.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 72 }} />
    <Support from={98} exitAt={134} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 82 }}>
      UM, DOIS, TRÊS OU QUATRO. SEM RUÍDO.
    </Support>
  </AbsoluteFill>
}

export function S05Consumption() {
  const frame = useCurrentFrame()
  const enter = progress(frame, 8, 13)
  const pop = progress(frame, 25, 14, EASE.inOutCubic)
  const close = progress(frame, 145, 12, EASE.inOutCubic)
  const shown = pop * (1 - close)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Shot name={H2} camera={H2_BASE} opacity={enter * (1 - shown)} />
    <UsageProduct name={H2_POP} camera={H2_USAGE} amount={shown} fill={progress(frame, 40, 22, EASE.inOutCubic)} originX={1370} originY={238} />
    <Headline lines={['SAIBA QUANTO', 'USOU.']} from={12} exitAt={72} size={103} accent={{ text: 'USOU.', color: COLORS.BRAND_PINK }} style={{ position: 'absolute', left: SAFE, top: 220 }} />
    <Headline lines={['E QUANDO', 'RENOVA.']} from={77} exitAt={139} size={105} accent={{ text: 'RENOVA.', color: COLORS.BRAND_ORANGE }} style={{ position: 'absolute', left: SAFE, top: 220 }} />
    <Support from={40} exitAt={141} size={29} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 160 }}>
      CURSOR MODELS · 81%<br />OTHER MODELS · 35% · RENOVA EM 11 DIAS
    </Support>
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 70, opacity: progress(frame, 22, 8) * (1 - close) }} />
  </AbsoluteFill>
}

export function S06Balance() {
  const frame = useCurrentFrame()
  const active = progress(frame, 8, 10) * (1 - progress(frame, 34, 10, EASE.inOutCubic))
  const pop = progress(frame, 28, 14, EASE.inOutCubic)
  const close = progress(frame, 112, 12, EASE.inOutCubic)
  const shown = pop * (1 - close)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', left: 820, top: 80, width: 18, height: 820, background: COLORS.BRAND_PURPLE }} />
    <Shot name={V3} camera={V3_BASE} opacity={1 - shown} />
    <ActivityShot camera={V3_BASE} frame={frame} from={8} opacity={active} variant="compact-3" />
    <UsageProduct name={V3_POP} camera={V3_USAGE} amount={shown} fill={progress(frame, 43, 22, EASE.inOutCubic)} originX={980} originY={520} />
    <Headline lines={['VOCÊ VÊ', 'NA HORA.']} from={10} exitAt={116} size={112} accent={{ text: 'NA HORA.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 205 }} />
    <Support from={34} exitAt={116} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 146 }}>
      CURSOR · 81% USADO<br />RENOVAÇÃO VISÍVEL NO MESMO LUGAR.
    </Support>
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 68, opacity: progress(frame, 30, 8) * (1 - close) }} />
  </AbsoluteFill>
}

export function S07Activity() {
  const frame = useCurrentFrame()
  const active = progress(frame, 12, 10)
  const resolved = progress(frame, 72, 10, EASE.inOutCubic)
  const camera: Camera = { ...V3_BASE, atX: 1360, atY: 520, scale: 2.62 }
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', left: 104, top: 166, width: 148, height: 12, background: COLORS.BRAND_ORANGE }} />
    <div style={{ position: 'absolute', left: 104, top: 178, width: 82, height: 12, background: COLORS.BRAND_PINK }} />
    <Shot name={V3} camera={camera} />
    <ActivityShot camera={camera} frame={frame} from={12} opacity={active * (1 - resolved)} variant="compact-3" />
    <Headline lines={['SUA IA TÁ', 'TRABALHANDO?']} from={12} exitAt={68} size={108} accent={{ text: 'TRABALHANDO?', color: COLORS.BRAND_ORANGE }} style={{ position: 'absolute', left: SAFE, top: 226 }} />
    <Headline lines={['VOCÊ SABE.']} from={74} exitAt={118} size={126} accent={{ text: 'SABE.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 284 }} />
    <Support from={29} exitAt={68} size={25} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 178 }}>
      O ANEL MUDA DE ESTADO<br />ENQUANTO A IA TRABALHA.
    </Support>
    <Support from={84} exitAt={118} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 178 }}>
      ATIVIDADE EM TEMPO REAL.
    </Support>
  </AbsoluteFill>
}

const THEMES = [
  ['monokai-black', 'MONOKAI BLACK'], ['dark', 'DARK'], ['slate', 'SLATE'],
  ['dracula', 'DRACULA'], ['nord', 'NORD'], ['catppuccin', 'CATPPUCCIN'],
  ['tokyo-night', 'TOKYO NIGHT'], ['gruvbox', 'GRUVBOX'], ['one-dark', 'ONE DARK'],
  ['solarized-dark', 'SOLARIZED'], ['monokai', 'MONOKAI']
] as const

export function S08Themes() {
  const frame = useCurrentFrame()
  const galleryIn = progress(frame, 5, 14)
  const galleryOut = progress(frame, 98, 13, EASE.inOutCubic)
  const offset = mix(0, -352, progress(frame, 58, 16, EASE.inOutCubic))
  return <AbsoluteFill style={{ background: '#f7f7f4' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 28, height: 1080, background: COLORS.BRAND_PURPLE }} />
    <Headline lines={['DO SEU JEITO.']} from={7} exitAt={96} size={102} accent={{ text: 'JEITO.', color: COLORS.BRAND_PURPLE }} style={{ position: 'absolute', left: SAFE, top: 56, zIndex: 2 }} />
    <Support from={17} exitAt={96} size={27} color={COLORS.INK} style={{ position: 'absolute', left: SUPPORT_SAFE, top: 180, zIndex: 2 }}>
      11 TEMAS. DE 2 A 4 PROVEDORES.
    </Support>
    <div style={{ position: 'absolute', left: 190, top: 286, width: 1560, height: 680, overflow: 'hidden', opacity: galleryIn * (1 - galleryOut), transform: `translateY(${mix(42, 0, galleryIn)}px)` }}>
      <div style={{ position: 'absolute', left: offset, top: 0, display: 'flex', gap: 18 }}>
        {THEMES.map(([id, label], index) => {
          const itemIn = progress(frame, 7 + index * 2, 10)
          return <div key={id} style={{ width: 170, flex: '0 0 170px', textAlign: 'center', opacity: itemIn, transform: `translateX(${mix(34, 0, itemIn)}px)` }}>
            <Img src={staticFile(`product/themes-v42/${id}.png`)} style={{ width: 170, height: 448, display: 'block', objectFit: 'contain' }} />
            <div style={{ display: 'inline-flex', minHeight: 34, alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono, monospace', fontSize: 16, fontWeight: 700, letterSpacing: '.035em', color: COLORS.INK, background: index % 3 === 0 ? COLORS.BRAND_GREEN : index % 3 === 1 ? '#eadfff' : '#ffe7c8', marginTop: 16, padding: '7px 10px', whiteSpace: 'nowrap' }}>{label}</div>
          </div>
        })}
      </div>
    </div>
    {frame >= 99 ? <ColorWipe frame={frame} from={99} duration={12} color={COLORS.BRAND_GREEN} /> : null}
  </AbsoluteFill>
}

export function S09Benefit() {
  const frame = useCurrentFrame()
  const revealWhite = progress(frame, 0, 13, EASE.inOutCubic)
  const panelOut = progress(frame, 126, 18, EASE.inOutCubic)
  const widgetIn = progress(frame, 14, 16)
  const widgetOut = progress(frame, 122, 18, EASE.inOutCubic)
  const camera: Camera = { ...FULL_HERO, atX: 960, atY: 718, scale: 3.02 }
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', inset: 0, background: COLORS.BRAND_GREEN }} />
    <div style={{ position: 'absolute', inset: 0, background: COLORS.WHITE, clipPath: `inset(0 ${mix(100, 47, revealWhite)}% 0 0)` }} />
    <div style={{ position: 'absolute', left: 1018 + panelOut * 902, top: 0, width: 902, height: 1080, background: COLORS.BRAND_GREEN }} />
    <Headline lines={['MENOS', 'ABAS.']} from={12} exitAt={116} size={146} accent={{ text: 'ABAS.', color: COLORS.BRAND_RED }} style={{ position: 'absolute', left: SAFE, top: 190 }} />
    <Headline lines={['MAIS', 'FOCO.']} from={34} exitAt={116} size={146} style={{ position: 'absolute', left: 1110, top: 190 }} />
    <Support from={55} exitAt={116} size={30} color={COLORS.INK} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 100 }}>
      TUDO À VISTA. NADA NO CAMINHO.
    </Support>
    <div style={{ position: 'absolute', inset: 0, opacity: widgetIn * (1 - widgetOut), transform: `translateY(${(1 - widgetIn) * 90 + widgetOut * 110}px)` }}>
      <Shot name={FULL} camera={camera} />
    </div>
  </AbsoluteFill>
}

export function S10Cta() {
  const frame = useCurrentFrame()
  const wordmark = progress(frame, 2, 10)
  const assembled = progress(frame, 22, 56)
  const productIn = progress(frame, 5, 16)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 24, height: 1080, background: COLORS.BRAND_GREEN }} />
    <div style={{ position: 'absolute', left: 1090, top: 0, width: 180, height: 16, background: COLORS.BRAND_PURPLE }} />
    <div style={{ position: 'absolute', left: 1270, top: 0, width: 180, height: 16, background: COLORS.BRAND_ORANGE }} />
    <div style={{ position: 'absolute', left: 1450, top: 0, width: 180, height: 16, background: COLORS.BRAND_PINK }} />
    <UsageProduct name={V4_POP} camera={V4_USAGE} amount={productIn} fill={progress(frame, 22, 26, EASE.inOutCubic)} originX={1120} originY={500} />
    <WidokenIcon size={68} style={{ position: 'absolute', left: SAFE, top: 70 }} />
    <div style={{ position: 'absolute', left: 180, top: 79, fontFamily: 'Archivo, sans-serif', fontSize: 66, fontWeight: 900, letterSpacing: '-.055em', lineHeight: .84, color: COLORS.INK, opacity: wordmark }}>WIDOKEN</div>
    <Headline lines={['SEU USO DE IA,', 'À VISTA.']} from={10} exitAt={220} size={96} accent={{ text: 'À VISTA.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 202 }} />
    <div style={{ position: 'absolute', left: SAFE, top: 500, width: 900, height: 126, overflow: 'hidden', opacity: assembled, transform: `translateX(${(1 - assembled) * -70}px)` }}>
      <div style={{ position: 'absolute', inset: 0, background: COLORS.BRAND_GREEN }} />
      <div style={{ position: 'absolute', left: 38, top: 28, fontFamily: 'Archivo, sans-serif', fontSize: 54, fontWeight: 900, letterSpacing: '-.03em', color: COLORS.INK }}>BAIXE O WIDOKEN →</div>
    </div>
    <Support from={42} exitAt={220} size={27} color={COLORS.INK} style={{ position: 'absolute', left: SUPPORT_SAFE, top: 674 }}>
      CURSOR · CLAUDE · CHATGPT · ANTIGRAVITY<br />LIMITES E RENOVAÇÃO NUM SÓ LUGAR.
    </Support>
    <div style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 108, opacity: progress(frame, 58, 14) }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 18, fontWeight: 700, letterSpacing: '.14em', color: COLORS.BRAND_PURPLE, marginBottom: 12 }}>DISPONÍVEL AGORA</div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 34, fontWeight: 700, letterSpacing: '-.01em', color: COLORS.INK }}>
        github.com/pedroborgesdev/widoken-temp
      </div>
      <div style={{ width: 900, height: 6, background: COLORS.INK, marginTop: 18, transformOrigin: 'left', transform: `scaleX(${progress(frame, 62, 18)})` }} />
    </div>
  </AbsoluteFill>
}
