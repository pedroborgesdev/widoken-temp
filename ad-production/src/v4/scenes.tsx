import React from 'react'
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { ActivityShot, Camera, Shot, centre, lerpCamera } from '../v3/product'
import { BrandLockup, ColorWipe, DemoLabel, Headline, MaskReveal, Support, WidokenIcon } from './motion'
import { COLORS, EASE, SAFE, SUPPORT_SAFE, clamp, mix, progress } from './tokens'

const HORIZONTAL = 'widget-horizontal' as const
const USAGE = 'widget-horizontal-popover' as const
const VERTICAL = 'widget-vertical' as const
const BALANCE = 'widget-vertical-popover-balance' as const

const hPill = centre(HORIZONTAL, 'pill')
const usagePill = centre(USAGE, 'pill')
const verticalPill = centre(VERTICAL, 'pill')
const balancePill = centre(BALANCE, 'pill')

const H_CONCEPT: Camera = { focusX: hPill.x, focusY: hPill.y, atX: 960, atY: 535, scale: 2.55 }
const H_USAGE: Camera = { focusX: hPill.x, focusY: hPill.y, atX: 1340, atY: 260, scale: 2.05 }
const U_USAGE: Camera = { focusX: usagePill.x, focusY: usagePill.y, atX: 1340, atY: 260, scale: 2.05 }
const V_BALANCE: Camera = { focusX: verticalPill.x, focusY: verticalPill.y, atX: 1320, atY: 540, scale: 1.55 }
const B_BALANCE: Camera = { focusX: balancePill.x, focusY: balancePill.y, atX: 1320, atY: 540, scale: 1.55 }
const V_GALLERY: Camera = { focusX: verticalPill.x, focusY: verticalPill.y, atX: 1710, atY: 545, scale: 1.22 }
const B_FINAL: Camera = { focusX: balancePill.x, focusY: balancePill.y, atX: 1365, atY: 500, scale: 1.4 }

function ProviderMetric({ x, y, name, value, color, from, exitAt }: {
  x: number; y: number; name: string; value: number; color: string; from: number; exitAt: number
}) {
  const frame = useCurrentFrame()
  const enter = progress(frame, from, 12)
  const out = progress(frame, exitAt, 9, EASE.inOutCubic)
  const dash = 2 * Math.PI * 52
  return <div style={{ position: 'absolute', left: x, top: y, width: 420, height: 128, opacity: enter * (1 - out), transform: `translateX(${(1 - enter) * 55 + out * 60}px)` }}>
    <svg width="128" height="128" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
      <circle cx="64" cy="64" r="52" fill="none" stroke={COLORS.TRACK} strokeWidth="13" />
      <circle cx="64" cy="64" r="52" fill="none" stroke={color} strokeWidth="13" strokeLinecap="butt" strokeDasharray={dash} strokeDashoffset={dash * (1 - value * enter)} />
    </svg>
    <div style={{ position: 'absolute', left: 158, top: 17, fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 25, letterSpacing: '.08em', color: COLORS.SOFT }}>{name}</div>
    <div style={{ position: 'absolute', left: 158, top: 54, fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: 55, letterSpacing: '-.04em', color: COLORS.INK }}>{Math.round(value * 100)}%</div>
  </div>
}

export function S01Brand() {
  const frame = useCurrentFrame()
  const enter = progress(frame, 10, 20, EASE.inOutCubic)
  const out = progress(frame, 57, 15, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE, alignItems: 'center', justifyContent: 'center' }}>
    <BrandLockup iconSize={166} wordSize={166} style={{ opacity: enter * (1 - out) }} />
  </AbsoluteFill>
}

export function S02Problem() {
  const frame = useCurrentFrame()
  const firstOut = progress(frame, 61, 9, EASE.inOutCubic)
  const secondIn = progress(frame, 70, 10)
  const secondOut = progress(frame, 132, 8, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Headline lines={['QUANTO DE IA', 'AINDA RESTA?']} from={4} exitAt={61} size={132} style={{ position: 'absolute', left: SAFE, top: 198 }} />
    <div style={{ position: 'absolute', left: SAFE, top: 225, width: 860, opacity: secondIn * (1 - secondOut), transform: `translateY(${(1 - secondIn) * 30 - secondOut * 20}px)` }}>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 78, lineHeight: .94, fontWeight: 900, letterSpacing: '-.042em', color: COLORS.INK }}>
        VOCÊ NÃO PRECISA<br />ABRIR VÁRIAS ABAS<br /><span style={{ color: COLORS.BRAND_RED }}>PRA DESCOBRIR.</span>
      </div>
    </div>
    <Support from={18} exitAt={61} size={28} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 166 }}>
      LIMITES DISPERSOS INTERROMPEM O FLUXO.
    </Support>
    <ProviderMetric x={1120} y={150} name="CURSOR" value={.81} color={COLORS.BRAND_PINK} from={10} exitAt={132} />
    <ProviderMetric x={1310} y={390} name="CLAUDE" value={.54} color={COLORS.BRAND_ORANGE} from={18} exitAt={132} />
    <ProviderMetric x={1060} y={650} name="OPENAI" value={.68} color={COLORS.BRAND_GREEN} from={26} exitAt={132} />
    <DemoLabel style={{ position: 'absolute', right: SUPPORT_SAFE, bottom: 54, opacity: progress(frame, 12, 8) * (1 - progress(frame, 132, 8)) }} />
    {frame >= 139 ? <ColorWipe frame={frame} from={139} duration={11} /> : null}
  </AbsoluteFill>
}

export function S03Solution() {
  const frame = useCurrentFrame()
  const reveal = progress(frame, 0, 11, EASE.inOutCubic)
  const productIn = progress(frame, 4, 15)
  const textSwap = progress(frame, 50, 9, EASE.inOutCubic)
  const cam = lerpCamera(
    { focusX: hPill.x, focusY: hPill.y, atX: 1335, atY: 560, scale: 2.08 },
    H_CONCEPT,
    progress(frame, 104, 28, EASE.inOutCubic)
  )
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', inset: 0, background: COLORS.BRAND_ORANGE, clipPath: `inset(0 ${reveal * 100}% 0 0)` }} />
    <BrandLockup iconSize={58} wordSize={56} style={{ position: 'absolute', left: SAFE, top: 64, opacity: productIn * (1 - progress(frame, 105, 12, EASE.inOutCubic)) }} />
    <div style={{ opacity: 1 - textSwap }}><Headline lines={['NÃO PRECISA.']} from={2} exitAt={50} size={106} style={{ position: 'absolute', left: SAFE, top: 244 }} /></div>
    <div style={{ opacity: textSwap }}><Headline lines={['CONHEÇA O', 'WIDOKEN.']} from={52} exitAt={116} size={104} accent={{ text: 'WIDOKEN.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 230 }} /></div>
    <Shot name={HORIZONTAL} camera={cam} opacity={productIn} />
    <Support from={70} exitAt={118} size={28} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 102 }}>
      SEU USO DE IA À VISTA,<br />SEM SAIR DO FLUXO.
    </Support>
  </AbsoluteFill>
}

export function S04Concept() {
  const frame = useCurrentFrame()
  const target = progress(frame, 124, 26, EASE.inOutCubic)
  const camera = lerpCamera(H_CONCEPT, H_USAGE, target)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Shot name={HORIZONTAL} camera={camera} />
    <Headline lines={['SUAS IAS.']} from={8} exitAt={45} size={146} style={{ position: 'absolute', left: SAFE, top: 86 }} />
    <Headline lines={['SEUS LIMITES.']} from={48} exitAt={87} size={142} color={COLORS.BRAND_PURPLE} style={{ position: 'absolute', right: SAFE, bottom: 90 }} align="right" />
    <Headline lines={['NUMA OLHADA.']} from={90} exitAt={124} size={148} color={COLORS.INK} accent={{ text: 'OLHADA.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 100 }} />
    <Support from={98} exitAt={126} size={25} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 98 }}>
      COMPACTO. DIRETO. SEM TROCAR DE JANELA.
    </Support>
  </AbsoluteFill>
}

export function S05Consumption() {
  const frame = useCurrentFrame()
  const pop = progress(frame, 12, 14, EASE.inOutCubic)
  const close = progress(frame, 142, 12, EASE.inOutCubic)
  const exit = progress(frame, 153, 18, EASE.inOutCubic)
  const verticalIn = progress(frame, 153, 18, EASE.inOutCubic)
  const verticalCam = { ...V_BALANCE, atX: mix(1760, V_BALANCE.atX, verticalIn) }
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-exit * 900}px)`, opacity: 1 - exit }}>
      <Shot name={HORIZONTAL} camera={H_USAGE} opacity={1 - pop + close} />
      <MaskReveal frame={frame} from={12} duration={14} direction="down" style={{ opacity: 1 - close }}>
        <Shot name={USAGE} camera={U_USAGE} />
      </MaskReveal>
    </div>
    <Headline lines={['SAIBA QUANTO', 'USOU.']} from={18} exitAt={72} size={103} accent={{ text: 'USOU.', color: COLORS.BRAND_PINK }} style={{ position: 'absolute', left: SAFE, top: 220 }} />
    <Headline lines={['E QUANDO', 'RENOVA.']} from={77} exitAt={139} size={105} accent={{ text: 'RENOVA.', color: COLORS.BRAND_ORANGE }} style={{ position: 'absolute', left: SAFE, top: 220 }} />
    <Support from={42} exitAt={139} size={29} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 160 }}>
      CURSOR · 405 / 500 USADO · 81%<br />RENOVA EM 11 DIAS
    </Support>
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 70, opacity: progress(frame, 18, 8) * (1 - exit) }} />
    <Shot name={VERTICAL} camera={verticalCam} opacity={verticalIn} />
  </AbsoluteFill>
}

export function S06Balance() {
  const frame = useCurrentFrame()
  const pop = progress(frame, 10, 14, EASE.inOutCubic)
  const close = progress(frame, 112, 13, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Shot name={VERTICAL} camera={V_BALANCE} />
    <MaskReveal frame={frame} from={10} duration={14} direction="right" style={{ opacity: 1 - close }}>
      <Shot name={BALANCE} camera={B_BALANCE} />
    </MaskReveal>
    <Headline lines={['QUANTO AINDA', 'RESTA?']} from={12} exitAt={65} size={108} accent={{ text: 'RESTA?', color: COLORS.BRAND_PURPLE }} style={{ position: 'absolute', left: SAFE, top: 225 }} />
    <Headline lines={['VOCÊ VÊ', 'NA HORA.']} from={69} exitAt={119} size={112} accent={{ text: 'NA HORA.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 225 }} />
    <Support from={35} exitAt={116} size={29} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 150 }}>
      $2.00 DISPONÍVEL · HARNESS / DEEPSEEK
    </Support>
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 68, opacity: progress(frame, 18, 8) * (1 - progress(frame, 118, 12, EASE.inOutCubic)) }} />
  </AbsoluteFill>
}

export function S07Activity() {
  const frame = useCurrentFrame()
  const active = progress(frame, 10, 10)
  const resolved = progress(frame, 70, 9, EASE.inOutCubic)
  const camera = lerpCamera(V_BALANCE, V_GALLERY, progress(frame, 108, 27, EASE.inOutCubic))
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Shot name={VERTICAL} camera={camera} />
    <ActivityShot camera={camera} frame={frame} from={10} opacity={active * (1 - resolved)} />
    <Headline lines={['SUA IA TÁ', 'TRABALHANDO?']} from={12} exitAt={66} size={112} accent={{ text: 'TRABALHANDO?', color: COLORS.BRAND_ORANGE }} style={{ position: 'absolute', left: SAFE, top: 240 }} />
    <Headline lines={['VOCÊ SABE.']} from={72} exitAt={116} size={126} accent={{ text: 'SABE.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 315 }} />
    <Support from={87} exitAt={116} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 180 }}>
      INDICADOR DE ATIVIDADE EM TEMPO REAL.
    </Support>
  </AbsoluteFill>
}

const THEMES = [
  ['monokai-black', 'MONOKAI BLACK'], ['dark', 'DARK'], ['slate', 'SLATE'],
  ['dracula', 'DRACULA'], ['nord', 'NORD'], ['catppuccin', 'CATPPUCCIN'],
  ['tokyo-night', 'TOKYO NIGHT'], ['gruvbox', 'GRUVBOX'], ['one-dark', 'ONE DARK'],
  ['solarized-dark', 'SOLARIZED'], ['monokai', 'MONOKAI']
] as const

function galleryOffset(frame: number) {
  if (frame < 27) return 0
  if (frame < 38) return mix(0, -900, progress(frame, 27, 11, EASE.inOutCubic))
  if (frame < 53) return -900
  if (frame < 64) return mix(-900, -1800, progress(frame, 53, 11, EASE.inOutCubic))
  if (frame < 78) return -1800
  if (frame < 89) return mix(-1800, -2290, progress(frame, 78, 11, EASE.inOutCubic))
  return -2290
}

export function S08Themes() {
  const frame = useCurrentFrame()
  const galleryIn = progress(frame, 6, 12)
  const galleryOut = progress(frame, 98, 13, EASE.inOutCubic)
  const priorOut = progress(frame, 6, 12, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ transform: `translateX(${-priorOut * 260}px)`, opacity: 1 - priorOut }}><Shot name={VERTICAL} camera={V_GALLERY} /></div>
    <Headline lines={['DO SEU', 'JEITO.']} from={7} exitAt={96} size={120} accent={{ text: 'JEITO.', color: COLORS.BRAND_PURPLE }} style={{ position: 'absolute', left: SAFE, top: 180, zIndex: 2 }} />
    <Support from={18} exitAt={96} size={30} color={COLORS.INK} style={{ position: 'absolute', left: SUPPORT_SAFE, top: 520, zIndex: 2 }}>
      11 TEMAS.<br />UMA EXPERIÊNCIA SIMPLES.
    </Support>
    <div style={{ position: 'absolute', left: 760, top: 150, width: 920, height: 800, overflow: 'hidden', opacity: galleryIn * (1 - galleryOut) }}>
      <div style={{ position: 'absolute', left: galleryOffset(frame) - galleryOut * 500, top: 0, display: 'flex', gap: 90 }}>
        {THEMES.map(([id, label], index) => <div key={id} style={{ width: 210, flex: '0 0 210px', textAlign: 'center', transform: `translateY(${index % 2 ? 50 : 0}px)` }}>
          <Img src={staticFile(`product/themes/${id}.png`)} style={{ width: 210, height: 646, display: 'block', objectFit: 'contain' }} />
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 25, fontWeight: 700, letterSpacing: '.04em', color: COLORS.SOFT, marginTop: 16, whiteSpace: 'nowrap' }}>{label}</div>
        </div>)}
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
  const handoff = progress(frame, 122, 18, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', inset: 0, background: COLORS.BRAND_GREEN }} />
    <div style={{ position: 'absolute', inset: 0, background: COLORS.WHITE, clipPath: `inset(0 ${mix(100, 47, revealWhite)}% 0 0)` }} />
    <div style={{ position: 'absolute', left: 1018 + panelOut * 902, top: 0, width: 902, height: 1080, background: COLORS.BRAND_GREEN }} />
    <div style={{ position: 'absolute', inset: 0, background: COLORS.WHITE, clipPath: `inset(0 ${(1 - panelOut) * 100}% 0 0)` }} />
    <Headline lines={['MENOS', 'ABAS.']} from={12} exitAt={116} size={146} accent={{ text: 'ABAS.', color: COLORS.BRAND_RED }} style={{ position: 'absolute', left: SAFE, top: 190 }} />
    <Headline lines={['MAIS', 'FOCO.']} from={34} exitAt={116} size={146} style={{ position: 'absolute', left: 1110, top: 190 }} />
    <Support from={55} exitAt={116} size={30} color={COLORS.INK} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 100 }}>
      TUDO À VISTA. NADA NO CAMINHO.
    </Support>
    <div style={{ position: 'absolute', inset: 0, opacity: widgetIn * (1 - handoff), transform: `translateY(${(1 - widgetIn) * 90 + handoff * 130}px)` }}>
      <Shot name={HORIZONTAL} camera={{ ...H_CONCEPT, atY: 715, scale: 2.85 }} />
    </div>
    <Shot name={BALANCE} camera={{ ...B_FINAL, atY: mix(620, B_FINAL.atY, handoff) }} opacity={handoff} />
    <WidokenIcon size={68} style={{ position: 'absolute', left: SAFE, top: 70, opacity: handoff }} />
  </AbsoluteFill>
}

export function S10Cta() {
  const frame = useCurrentFrame()
  const wordmark = progress(frame, 2, 10)
  const assembled = progress(frame, 22, 56)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Shot name={BALANCE} camera={B_FINAL} />
    <WidokenIcon size={68} style={{ position: 'absolute', left: SAFE, top: 70 }} />
    <div style={{ position: 'absolute', left: 180, top: 79, fontFamily: 'Archivo, sans-serif', fontSize: 66, fontWeight: 900, fontVariationSettings: "'wght' 900", letterSpacing: '-.055em', lineHeight: .84, color: COLORS.INK, opacity: wordmark }}>WIDOKEN</div>
    <Headline lines={['SEU USO DE IA,', 'À VISTA.']} from={10} exitAt={220} size={94} accent={{ text: 'À VISTA.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 212 }} />
    <div style={{ position: 'absolute', left: SAFE, top: 510, width: 850, height: 112, overflow: 'hidden', opacity: assembled, transform: `translateX(${(1 - assembled) * -70}px)` }}>
      <div style={{ position: 'absolute', inset: 0, background: COLORS.BRAND_GREEN }} />
      <div style={{ position: 'absolute', left: 34, top: 25, fontFamily: 'Archivo, sans-serif', fontSize: 50, fontWeight: 900, letterSpacing: '-.025em', color: COLORS.INK }}>BAIXE O WIDOKEN →</div>
    </div>
    <Support from={42} exitAt={220} size={28} color={COLORS.INK} style={{ position: 'absolute', left: SUPPORT_SAFE, top: 680 }}>
      SEUS LIMITES. SUAS FERRAMENTAS.<br />NUM SÓ LUGAR.
    </Support>
    <div style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 98, fontFamily: 'Space Mono, monospace', fontSize: 31, fontWeight: 700, letterSpacing: '.015em', color: COLORS.INK, opacity: progress(frame, 58, 14) }}>
      github.com/pedroborgesdev/widoken-temp
    </div>
    <div style={{ position: 'absolute', left: 1005, top: 955, width: 820, height: 4, background: COLORS.INK, transformOrigin: 'left', transform: `scaleX(${progress(frame, 35, 18)})` }} />
  </AbsoluteFill>
}
