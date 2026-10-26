import React from 'react'
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { ActivityShot, Camera, CaptureName, Shot, box, centre, lerpCamera } from '../v3/product'
import { BrandLockup, DemoLabel, Headline, Support, WidokenIcon } from '../v4/motion'
import { COLORS, EASE, SAFE, SUPPORT_SAFE, mix, progress } from './tokens'

const FULL = 'widget-horizontal' as const
const H1 = 'widget-horizontal-1' as const
const H2 = 'widget-horizontal-2' as const
const H3 = 'widget-horizontal-3' as const
const H4 = 'widget-horizontal-4' as const
const H2_POP = 'widget-horizontal-popover-cursor-2' as const
const V1 = 'widget-vertical-1' as const
const V2 = 'widget-vertical-2' as const
const V3 = 'widget-vertical-3' as const
const V3_POP = 'widget-vertical-popover-cursor-3' as const

const camera = (name: CaptureName, atX: number, atY: number, scale: number): Camera => {
  const point = centre(name, 'pill')
  return { focusX: point.x, focusY: point.y, atX, atY, scale }
}

const FULL_CENTER = camera(FULL, 1240, 610, 2.18)
const PRESENTATION_END = camera(H2, 1370, 250, 2.30)
const H2_POP_CAMERA = camera(H2_POP, 1370, 250, 2.30)
const V3_USAGE = camera(V3_POP, 1010, 520, 2.35)
const V3_BASE = camera(V3, 1010, 520, 2.35)
const WORK_FULL = camera(V3, 1370, 540, 2.76)

function AnimatedShot({ name, camera: shotCamera, opacity, scaleFrom = .95, xFrom = 0, originX = shotCamera.atX, originY = shotCamera.atY }: {
  name: CaptureName; camera: Camera; opacity: number; scaleFrom?: number; xFrom?: number; originX?: number; originY?: number
}) {
  return <div style={{
    position: 'absolute', inset: 0, opacity,
    transformOrigin: `${originX}px ${originY}px`,
    transform: `translateX(${(1 - opacity) * xFrom}px) scale(${mix(scaleFrom, 1, opacity)})`
  }}><Shot name={name} camera={shotCamera} /></div>
}

function UsageShot({ name, camera: shotCamera, opacity, fill }: {
  name: typeof H2_POP | typeof V3_POP; camera: Camera; opacity: number; fill: number
}) {
  const bars = [box(name, 'bar-0'), box(name, 'bar-1')]
  const targets = [.81, .35]
  return <div style={{ position: 'absolute', inset: 0, opacity, transformOrigin: `${shotCamera.atX}px ${shotCamera.atY}px`, transform: `scale(${mix(.96, 1, opacity)})` }}>
    <Shot name={name} camera={shotCamera} />
    {bars.map((bar, index) => {
      const revealed = targets[index] * fill
      const left = shotCamera.atX + (bar.x - shotCamera.focusX) * shotCamera.scale
      const top = shotCamera.atY + (bar.y - shotCamera.focusY) * shotCamera.scale
      return <div key={index} style={{
        position: 'absolute', left: left + bar.width * shotCamera.scale * revealed, top,
        width: bar.width * shotCamera.scale * (1 - revealed), height: bar.height * shotCamera.scale,
        borderRadius: 999, background: '#49483e'
      }} />
    })}
  </div>
}

function Word({ children, from, out, x, y, size, color = COLORS.INK }: {
  children: React.ReactNode; from: number; out: number; x: number; y: number; size: number; color?: string
}) {
  const frame = useCurrentFrame()
  const enter = progress(frame, from, 12)
  const exit = progress(frame, out, 9, EASE.inQuint)
  return <div style={{
    position: 'absolute', left: x, top: y, fontFamily: 'Archivo, sans-serif', fontWeight: 900,
    fontSize: size, lineHeight: .86, letterSpacing: '-.047em', color,
    opacity: enter * (1 - exit), filter: `blur(${(1 - enter) * 5}px)`,
    transform: `translateY(${(1 - enter) * 28 + exit * 16}px)`
  }}>{children}</div>
}

function Metric({ x, y, label, target, color, from, out, primary = false }: {
  x: number; y: number; label: string; target: number; color: string; from: number; out: number; primary?: boolean
}) {
  const frame = useCurrentFrame()
  const enter = progress(frame, from, 12)
  const exit = progress(frame, out, 10, EASE.inQuint)
  const value = Math.round(target * progress(frame, from + 5, 22, EASE.inOutCubic))
  const size = primary ? 168 : 116
  const dash = Math.PI * 92
  return <div style={{ position: 'absolute', left: x, top: y, width: primary ? 520 : 390, height: size, opacity: enter * (1 - exit), transform: `translateY(${(1 - enter) * 24 + exit * 18}px) scale(${mix(.94, 1, enter)})` }}>
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={46} fill="none" stroke={COLORS.TRACK} strokeWidth="13" />
      <circle cx={size / 2} cy={size / 2} r={46} fill="none" stroke={color} strokeWidth="13" strokeDasharray={dash} strokeDashoffset={dash * (1 - value / 100)} />
    </svg>
    <div style={{ position: 'absolute', left: size + 24, top: primary ? 20 : 6, fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: primary ? 27 : 21, letterSpacing: '.08em', color: COLORS.SOFT }}>{label}</div>
    <div style={{ position: 'absolute', left: size + 24, top: primary ? 58 : 37, fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: primary ? 84 : 58, color: COLORS.INK }}>{value}%</div>
  </div>
}

export function S01Brand() {
  const frame = useCurrentFrame()
  const enter = progress(frame, 7, 18)
  const exit = progress(frame, 47, 13, EASE.inQuint)
  const line = progress(frame, 14, 22, EASE.inOutCubic) * (1 - exit)
  return <AbsoluteFill style={{ background: COLORS.WHITE, alignItems: 'center', justifyContent: 'center' }}>
    <BrandLockup iconSize={160} wordSize={160} style={{ opacity: enter * (1 - exit), transform: `translateY(${mix(26, 0, enter) + exit * 15}px) scale(${mix(.96, 1, enter)})` }} />
    <div style={{ position: 'absolute', left: 560, top: 704, width: 800, height: 7, background: COLORS.BRAND_GREEN, transformOrigin: 'center', transform: `scaleX(${line})` }} />
  </AbsoluteFill>
}

export function S02Opening() {
  const frame = useCurrentFrame()
  const second = progress(frame, 72, 12)
  const orange = progress(frame, 163, 17, EASE.inOutCubic)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Word from={4} out={68} x={SAFE} y={162} size={120}>QUANTO DE IA</Word>
    <Word from={12} out={68} x={SAFE} y={278} size={132}>AINDA RESTA?</Word>
    <Metric x={1060} y={94} label="CURSOR" target={81} color={COLORS.BRAND_PINK} from={12} out={155} primary />
    <Metric x={1310} y={382} label="CLAUDE" target={54} color={COLORS.BRAND_ORANGE} from={34} out={151} />
    <Metric x={1040} y={638} label="CHATGPT" target={68} color={COLORS.BRAND_GREEN} from={54} out={147} />
    <div style={{ position: 'absolute', left: SAFE, top: 202, width: 850, opacity: second * (1 - progress(frame, 148, 12)), filter: `blur(${(1 - second) * 5}px)`, transform: `translateY(${mix(28, 0, second)}px)` }}>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 78, lineHeight: .94, fontWeight: 900, letterSpacing: '-.042em', color: COLORS.INK }}>
        VOCÊ NÃO PRECISA<br />ABRIR VÁRIAS ABAS<br /><span style={{ color: COLORS.BRAND_RED }}>PRA DESCOBRIR.</span>
      </div>
    </div>
    <DemoLabel style={{ position: 'absolute', right: SUPPORT_SAFE, bottom: 56, opacity: progress(frame, 22, 10) * (1 - progress(frame, 148, 10)) }} />
    <div style={{ position: 'absolute', inset: 0, background: COLORS.BRAND_ORANGE, clipPath: `circle(${orange * 145}% at 76% 46%)` }} />
  </AbsoluteFill>
}

export function S03Introduction() {
  const frame = useCurrentFrame()
  const white = progress(frame, 18, 16, EASE.inOutCubic)
  const product = progress(frame, 38, 17)
  const noOut = progress(frame, 48, 10, EASE.inQuint)
  const title = progress(frame, 54, 12)
  const shift = progress(frame, 110, 25, EASE.inOutCubic)
  const cam = lerpCamera(FULL_CENTER, { ...FULL_CENTER, atX: 1220, atY: 590, scale: 2.28 }, shift)
  return <AbsoluteFill style={{ background: COLORS.BRAND_ORANGE }}>
    <div style={{ position: 'absolute', inset: 0, background: COLORS.WHITE, clipPath: `inset(0 0 0 ${mix(100, 0, white)}%)` }} />
    <div style={{ position: 'absolute', left: SAFE, top: 235, fontFamily: 'Archivo, sans-serif', fontSize: 116, fontWeight: 900, letterSpacing: '-.047em', color: COLORS.INK, opacity: progress(frame, 3, 11) * (1 - noOut), transform: `translateY(${noOut * 18}px)` }}>NÃO PRECISA.</div>
    <BrandLockup iconSize={58} wordSize={56} style={{ position: 'absolute', left: SAFE, top: 62, opacity: title }} />
    <div style={{ opacity: title }}><Headline lines={['CONHEÇA O', 'WIDOKEN.']} from={54} exitAt={126} size={102} accent={{ text: 'WIDOKEN.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 218 }} /></div>
    <AnimatedShot name={FULL} camera={cam} opacity={product} xFrom={90} />
    <Support from={72} exitAt={126} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 96 }}>TODAS AS SUAS IAS. UM SÓ WIDGET.</Support>
  </AbsoluteFill>
}

export function S04ResponsiveWidget() {
  const frame = useCurrentFrame()
  const names: CaptureName[] = [FULL, H4, H3, V3, H2]
  const starts = [0, 20, 45, 72, 102]
  const cams = [
    { ...FULL_CENTER, atX: 1220, atY: 590, scale: 2.28 },
    camera(H4, 1190, 570, 3.05), camera(H3, 1190, 570, 3.30),
    camera(V3, 1320, 540, 2.55), PRESENTATION_END
  ]
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 22, height: 1080, background: COLORS.BRAND_PURPLE, transformOrigin: 'top', transform: `scaleY(${progress(frame, 4, 18)})` }} />
    {names.map((name, index) => {
      const enter = index === 0 ? 1 : progress(frame, starts[index], 14, EASE.inOutCubic)
      const leave = index < names.length - 1 ? progress(frame, starts[index + 1], 14, EASE.inOutCubic) : 0
      return <AnimatedShot key={name} name={name} camera={cams[index]} opacity={enter * (1 - leave)} scaleFrom={.94} />
    })}
    <Headline lines={['SUAS IAS.']} from={8} exitAt={46} size={134} style={{ position: 'absolute', left: SAFE, top: 74 }} />
    <Headline lines={['SEUS LIMITES.']} from={50} exitAt={91} size={130} color={COLORS.BRAND_PURPLE} style={{ position: 'absolute', left: SAFE, top: 74 }} />
    <Headline lines={['DO SEU JEITO.']} from={95} exitAt={128} size={126} accent={{ text: 'JEITO.', color: COLORS.BRAND_GREEN }} style={{ position: 'absolute', left: SAFE, top: 74 }} />
    <Support from={106} exitAt={130} size={25} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 82 }}>O WIDGET SE ADAPTA AO SEU FLUXO.</Support>
  </AbsoluteFill>
}

function Counter({ frame, from, target, x, y, label, color }: { frame: number; from: number; target: number; x: number; y: number; label: string; color: string }) {
  const p = progress(frame, from, 27, EASE.inOutCubic)
  return <div style={{ position: 'absolute', left: x, top: y, opacity: progress(frame, from - 7, 10) }}>
    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, letterSpacing: '.08em', color: COLORS.SOFT }}>{label}</div>
    <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 96, fontWeight: 900, letterSpacing: '-.05em', color }}>{Math.round(target * p)}%</div>
  </div>
}

export function S05Usage() {
  const frame = useCurrentFrame()
  const productIn = progress(frame, 0, 16)
  const pop = progress(frame, 27, 13, EASE.inOutCubic)
  const close = progress(frame, 142, 13, EASE.inQuint)
  const shown = pop * (1 - close)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <AnimatedShot name={H2} camera={PRESENTATION_END} opacity={productIn * (1 - shown)} />
    <UsageShot name={H2_POP} camera={H2_POP_CAMERA} opacity={shown} fill={progress(frame, 45, 28, EASE.inOutCubic)} />
    <Headline lines={['QUANTO', 'VOCÊ USOU?']} from={8} exitAt={62} size={105} accent={{ text: 'USOU?', color: COLORS.BRAND_PINK }} style={{ position: 'absolute', left: SAFE, top: 190 }} />
    <Counter frame={frame} from={44} target={81} x={SAFE} y={500} label="CURSOR MODELS" color={COLORS.BRAND_PINK} />
    <Counter frame={frame} from={58} target={35} x={430} y={500} label="OTHER MODELS" color={COLORS.BRAND_GREEN} />
    <Support from={91} exitAt={140} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 104 }}>PERCENTUAIS REAIS. SEM TROCAR DE JANELA.</Support>
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 48, opacity: progress(frame, 48, 9) * (1 - close) }} />
  </AbsoluteFill>
}

export function S06Renewal() {
  const frame = useCurrentFrame()
  const turn = progress(frame, 8, 24, EASE.inOutCubic)
  const pop = progress(frame, 28, 14, EASE.inOutCubic)
  const close = progress(frame, 96, 13, EASE.inQuint)
  const move = progress(frame, 108, 27, EASE.inOutCubic)
  const baseCam = lerpCamera(V3_BASE, WORK_FULL, move)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <Shot name={H2} camera={PRESENTATION_END} opacity={1 - turn} />
    <AnimatedShot name={V3} camera={baseCam} opacity={turn * (1 - pop + close)} />
    <UsageShot name={V3_POP} camera={V3_USAGE} opacity={pop * (1 - close)} fill={progress(frame, 43, 27, EASE.inOutCubic)} />
    <Headline lines={['E QUANDO', 'RENOVA?']} from={9} exitAt={91} size={112} accent={{ text: 'RENOVA?', color: COLORS.BRAND_ORANGE }} style={{ position: 'absolute', left: SAFE, top: 205 }} />
    <Support from={57} exitAt={96} size={29} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 146 }}>RENOVA EM 11 DIAS.</Support>
    <DemoLabel style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 76, opacity: progress(frame, 48, 9) * (1 - close) }} />
  </AbsoluteFill>
}

export function S07Working() {
  const frame = useCurrentFrame()
  const cursor = centre(V3, 'cursor')
  const closeCamera: Camera = { focusX: cursor.x, focusY: cursor.y, atX: 1370, atY: 520, scale: 6.1 }
  const zoomIn = progress(frame, 78, 30, EASE.inOutCubic)
  const zoomOut = progress(frame, 150, 30, EASE.inOutCubic)
  const zoom = zoomIn * (1 - zoomOut)
  const active = progress(frame, 54, 12) * (1 - progress(frame, 158, 14, EASE.inOutCubic))
  const cam = lerpCamera(WORK_FULL, closeCamera, zoom)
  const introStages: Array<[CaptureName, number, number]> = [[V1, 4, 20], [V2, 18, 34], [V3, 32, 58]]
  const headlineOut = progress(frame, 126, 10, EASE.inQuint)
  const answer = progress(frame, 166, 12)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    {introStages.map(([name, from, out]) => <AnimatedShot key={name} name={name} camera={camera(name, 1370, 540, 2.76)} opacity={progress(frame, from, 10) * (1 - progress(frame, out, 9, EASE.inOutCubic))} scaleFrom={.88} />)}
    <Shot name={V3} camera={cam} opacity={progress(frame, 45, 10)} />
    <ActivityShot camera={cam} frame={frame} from={54} opacity={active} variant="compact-3" />
    <div style={{ opacity: 1 - headlineOut }}>
      <Word from={8} out={126} x={SAFE} y={210} size={104}>SUA IA TÁ</Word>
      <Word from={20} out={126} x={SAFE} y={318} size={104} color={COLORS.BRAND_ORANGE}>TRABALHANDO?</Word>
    </div>
    <div style={{ position: 'absolute', left: 1030, top: 162, opacity: progress(frame, 72, 12) * (1 - progress(frame, 146, 10)), transform: `translateY(${mix(18, 0, progress(frame, 72, 12))}px)` }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 25, fontWeight: 700, letterSpacing: '.12em', color: COLORS.BRAND_ORANGE }}>IA EM ATIVIDADE</div>
      <div style={{ width: 360, height: 6, marginTop: 14, background: COLORS.BRAND_ORANGE, transformOrigin: 'left', transform: `scaleX(${progress(frame, 78, 18)})` }} />
    </div>
    <div style={{ position: 'absolute', left: SAFE, top: 282, fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: 126, letterSpacing: '-.047em', color: COLORS.INK, opacity: answer * (1 - progress(frame, 198, 12)), transform: `translateY(${mix(26, 0, answer)}px)` }}>VOCÊ <span style={{ color: COLORS.BRAND_GREEN }}>SABE.</span></div>
    <Support from={174} exitAt={199} size={27} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 148 }}>IDLE → WORKING → IDLE. EM TEMPO REAL.</Support>
    <div style={{ position: 'absolute', left: 0, bottom: 0, width: 1920, height: 18, background: COLORS.BRAND_PURPLE, transformOrigin: 'left', transform: `scaleX(${progress(frame, 190, 20)})` }} />
  </AbsoluteFill>
}

const THEMES = [
  ['monokai-black', 'MONOKAI BLACK'], ['dark', 'DARK'], ['slate', 'SLATE'], ['dracula', 'DRACULA'],
  ['nord', 'NORD'], ['catppuccin', 'CATPPUCCIN'], ['tokyo-night', 'TOKYO NIGHT'], ['gruvbox', 'GRUVBOX'],
  ['one-dark', 'ONE DARK'], ['solarized-dark', 'SOLARIZED'], ['monokai', 'MONOKAI']
] as const

export function S08Themes() {
  const frame = useCurrentFrame()
  const enter = progress(frame, 5, 15)
  const exit = progress(frame, 105, 15, EASE.inQuint)
  const center = mix(1, 9, progress(frame, 22, 76, EASE.inOutCubic))
  return <AbsoluteFill style={{ background: '#f7f7f4' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 28, height: 1080, background: COLORS.BRAND_PURPLE, transformOrigin: 'top', transform: `scaleY(${enter * (1 - exit)})` }} />
    <Headline lines={['DO SEU JEITO.']} from={5} exitAt={103} size={98} accent={{ text: 'JEITO.', color: COLORS.BRAND_PURPLE }} style={{ position: 'absolute', left: SAFE, top: 54 }} />
    <Support from={15} exitAt={103} size={25} style={{ position: 'absolute', left: SUPPORT_SAFE, top: 170 }}>TRÊS TEMAS EM FOCO. ONZE POSSIBILIDADES.</Support>
    <div style={{ position: 'absolute', left: 80, right: 80, top: 260, bottom: 70, overflow: 'hidden', opacity: enter * (1 - exit) }}>
      {THEMES.map(([id, label], index) => {
        const distance = Math.abs(index - center)
        const scale = Math.max(.72, 1 - distance * .18)
        const opacity = Math.max(0, Math.min(1, 1.15 - distance * .75))
        const x = 960 + (index - center) * 430
        return <div key={id} style={{ position: 'absolute', left: x - 180, top: 18 + distance * 40, width: 360, textAlign: 'center', opacity, transform: `scale(${scale})` }}>
          <Img src={staticFile(`product/themes-v42/${id}.png`)} style={{ width: 360, height: 500, objectFit: 'contain', display: 'block' }} />
          <div style={{ display: 'inline-flex', marginTop: 8, padding: '9px 13px', background: index % 3 === 0 ? COLORS.BRAND_GREEN : index % 3 === 1 ? '#eadfff' : '#ffe7c8', fontFamily: 'Space Mono, monospace', fontSize: 18, fontWeight: 700, color: COLORS.INK }}>{label}</div>
        </div>
      })}
    </div>
    <div style={{ position: 'absolute', inset: 0, background: COLORS.BRAND_GREEN, clipPath: `inset(${mix(100, 0, progress(frame, 106, 14, EASE.inOutCubic))}% 0 0 0)` }} />
  </AbsoluteFill>
}

export function S09Benefit() {
  const frame = useCurrentFrame()
  const split = progress(frame, 0, 16, EASE.inOutCubic)
  const swap = progress(frame, 50, 18, EASE.inOutCubic)
  const out = progress(frame, 105, 15, EASE.inQuint)
  const widget = progress(frame, 12, 16) * (1 - out)
  return <AbsoluteFill style={{ background: COLORS.BRAND_GREEN }}>
    <div style={{ position: 'absolute', inset: 0, background: COLORS.WHITE, clipPath: `inset(0 ${mix(100, 47, split)}% 0 0)` }} />
    <div style={{ position: 'absolute', left: SAFE, top: 206, opacity: (1 - swap) * (1 - out), transform: `translateY(${swap * -24}px)` }}>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 142, fontWeight: 900, lineHeight: .86, letterSpacing: '-.047em', color: COLORS.INK }}>MENOS<br /><span style={{ color: COLORS.BRAND_RED }}>ABAS.</span></div>
    </div>
    <div style={{ position: 'absolute', left: 1110, top: 206, opacity: swap * (1 - out), transform: `translateY(${mix(28, 0, swap)}px)` }}>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 142, fontWeight: 900, lineHeight: .86, letterSpacing: '-.047em', color: COLORS.INK }}>MAIS<br />FOCO.</div>
    </div>
    <AnimatedShot name={FULL} camera={{ ...FULL_CENTER, atX: 960, atY: 720, scale: 3.0 }} opacity={widget} scaleFrom={.96} />
    <Support from={68} exitAt={104} size={28} style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 82 }}>TUDO À VISTA. NADA NO CAMINHO.</Support>
    <div style={{ position: 'absolute', inset: 0, background: COLORS.WHITE, clipPath: `inset(0 0 0 ${mix(100, 0, out)}%)` }} />
  </AbsoluteFill>
}

export function S10Cta() {
  const frame = useCurrentFrame()
  const plain = progress(frame, 0, 17)
  const pop = progress(frame, 22, 13, EASE.inOutCubic)
  const title = progress(frame, 36, 13)
  const button = progress(frame, 62, 18, EASE.inOutCubic)
  const arrow = progress(frame, 79, 10)
  const url = progress(frame, 99, 14)
  const finalCam = camera(V3_POP, 1100, 500, 2.06)
  const plainCam = camera(V3, 1100, 500, 2.06)
  return <AbsoluteFill style={{ background: COLORS.WHITE }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 24, height: 1080, background: COLORS.BRAND_GREEN, transformOrigin: 'top', transform: `scaleY(${progress(frame, 0, 20)})` }} />
    <AnimatedShot name={V3} camera={plainCam} opacity={plain * (1 - pop)} xFrom={110} />
    <UsageShot name={V3_POP} camera={finalCam} opacity={pop} fill={progress(frame, 34, 26, EASE.inOutCubic)} />
    <WidokenIcon size={66} style={{ position: 'absolute', left: SAFE, top: 64, opacity: title, transform: `scale(${mix(.92, 1, title)})` }} />
    <div style={{ position: 'absolute', left: 176, top: 74, fontFamily: 'Archivo, sans-serif', fontSize: 64, fontWeight: 900, letterSpacing: '-.055em', color: COLORS.INK, opacity: title, transform: `translateY(${mix(20, 0, title)}px)` }}>WIDOKEN</div>
    <div style={{ position: 'absolute', left: SAFE, top: 198, fontFamily: 'Archivo, sans-serif', fontSize: 92, fontWeight: 900, lineHeight: .87, letterSpacing: '-.047em', color: COLORS.INK, opacity: title, transform: `translateX(${mix(-28, 0, title)}px)` }}>SUA IDEIA,<br /><span style={{ color: COLORS.BRAND_GREEN }}>À VISTA.</span></div>
    <div style={{ position: 'absolute', left: SAFE, top: 486, width: 900, height: 126, overflow: 'hidden', background: COLORS.BRAND_GREEN, transformOrigin: 'left', transform: `scaleX(${button})` }}>
      <div style={{ position: 'absolute', left: 38, top: 27, fontFamily: 'Archivo, sans-serif', fontSize: 54, fontWeight: 900, color: COLORS.INK, whiteSpace: 'nowrap' }}>BAIXE O WIDOKEN <span style={{ display: 'inline-block', opacity: arrow, transform: `translateX(${mix(-18, 0, arrow)}px)` }}>→</span></div>
    </div>
    <div style={{ position: 'absolute', left: SUPPORT_SAFE, bottom: 102, opacity: url, transform: `translateY(${mix(18, 0, url)}px)` }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 18, fontWeight: 700, letterSpacing: '.14em', color: COLORS.BRAND_PURPLE, marginBottom: 12 }}>DISPONÍVEL AGORA</div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 34, fontWeight: 700, color: COLORS.INK }}>github.com/pedroborgesdev/widoken-temp</div>
      <div style={{ width: 900, height: 6, marginTop: 17, background: COLORS.INK, transformOrigin: 'left', transform: `scaleX(${progress(frame, 108, 18)})` }} />
    </div>
  </AbsoluteFill>
}
