# Widoken · Comercial de lançamento (produção)

Filme de lançamento do **Widoken** — widget de desktop que reúne o uso das suas
ferramentas de IA. Gerado por código: Remotion + React + TypeScript. Todo o
produto que aparece no filme é o aplicativo real, capturado do repositório.

```
ENTREGA V4   output/widoken-comercial-v4.mp4            46,507 s · 1920×1080 · 30 fps · H.264 + AAC
ANTERIOR     output/widoken-comercial-v3.mp4            46,720 s · preservado para comparação
ARQUIVOS     V1 e V2 permanecem registrados no Remotion e preservados em output/
```

---

## 1. Como reproduzir

```bash
cd ad-production
npm install

npm run capture       # 1. captura o widget real (Playwright, DPR 6)  → public/product/
npm run audio         # 2. sintetiza trilha e SFX                     → public/audio/
npm run render        # 3. renderiza o master 16:9                    → output/widoken-comercial-1920x1080.mp4
npm run render:v4     # renderiza o comercial V4                      → output/widoken-comercial-v4.mp4
npm run audit:v4      # contact sheets + 10 frames finais             → output/v4-audit/ e v4-scenes/

# opcionais
npm run render:v1     # re-renderiza o V1 (comparação)
npm run render:all    # master + V1
npm run styleframes   # os 5 key styleframes                          → output/styleframes/
npm run studio        # abre o Remotion Studio
npm run typecheck     # tsc --noEmit
```

Requisitos: Node 20+, Chromium do Playwright (instalado por `npm install`),
ffmpeg 8+ (só para inspecionar o resultado). `npm run voiceover` exige Python
e baixa o modelo Piper (~60 MB) — **não** é necessário para o render.

Tempo de render: ~10–15 min a `--concurrency=4` numa máquina de 8 núcleos.
Iteração: `npx remotion still src/index.ts WidokenAd out.png --frame=330`.

## 2. Estrutura

```
src/
  index.ts                 entrada do Remotion
  Root.tsx                 WidokenAdV4 + V3/V2/V1 preservados
  v4/
    tokens.ts              1395 frames · 46,5 s · 10 cenas · cor · easings
    motion.tsx             tipografia, lockup, wipes e máscaras reutilizáveis
    scenes.tsx             narrativa completa e handoffs do produto
    audio.tsx              música + cues sem tanque/formiga
    WidokenAdV4.tsx        composição principal
  v2/
    tokens.ts              1320 frames · 44 s · SCENES · CUTS · cor · easings
    type.tsx               Words / Mono / CountUp / SwapLine + GLOBAL_CSS
    product.tsx            Shot / ActivityShot — a camada de câmera
    art.tsx                tanque, formiga, ícone, cursor, medidor, disco
    audio.tsx              música + 59 cues de SFX (MASTER = 0.834)
    captures.json          manifesto de captura (gerado; não editar)
    scenes/S01…S09.tsx     as nove sequências
  brand/, scenes/, WidokenAd.tsx   o V1, preservado
scripts/
  audit-v4.mjs             revisão a cada 0,5 s e quadro a quadro nas transições
  capture-product.mjs      Playwright + preview do app real + ponte falsa
  make-audio.mjs           trilha e efeitos
  audio/dsp.mjs            kit DSP (kick, bass, pluck, pad, hat, clap, …)
  render-styleframes.mjs   os 5 key styleframes
  voiceover.sh             stems Piper (não usados no filme)
public/
  product/                 capturas reais do widget (+ activity/)
  audio/                   music.music.wav + sfx/ + vo/
output/                    mp4, styleframes, v1-ref/, v2-ref/, comparison/
docs/                      MOTION_DESIGN_SYSTEM · PRODUCT_AUDIT · MODIFICATION_REPORT
                           AUDIO · VO_SCRIPT · REVIEW
```

## 3. Documentação

| Documento | Conteúdo |
|---|---|
| `docs/V4_MOTION_SYSTEM.md` | timeline, gramática de movimento, handoffs e fidelidade de produto da V4 |
| `docs/V4_REVIEW.md` | comparação V3/V4, assets reais, QA e validação do destino público |
| `docs/V4_QA.md` | resultado técnico e visual do master V4 |
| `docs/MOTION_DESIGN_SYSTEM.md` | sistema das versões anteriores, preservado |
| `docs/PRODUCT_AUDIT.md` | o que é o widget, método de captura, geometria, semântica, limitações |
| `docs/MODIFICATION_REPORT.md` | V1 → V2: tempos antigos vs novos, defeitos encontrados e corrigidos |
| `docs/AUDIO.md` | trilha, efeitos, mixagem medida, licenças |
| `docs/VO_SCRIPT.md` | roteiro de locução PT-BR com timecodes (não usado no corte entregue) |
| `docs/REVIEW.md` | revisão visual e técnica do arquivo entregue + critérios de rejeição |

## 4. Verificar o resultado

```bash
# formato
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=codec_name,width,height,r_frame_rate -of default=noprint_wrappers=1 \
  output/widoken-comercial-1920x1080.mp4

# loudness e pico
ffmpeg -v error -i output/widoken-comercial-1920x1080.mp4 -vn -acodec pcm_f32le /tmp/a.wav
ffmpeg -hide_banner -i /tmp/a.wav -af ebur128=peak=true -f null - 2>&1 | tail -12

# quadros de comparação
ffmpeg -y -ss 11 -i output/widoken-comercial-1920x1080.mp4 -frames:v 1 /tmp/f11.png
```

Referência: −16,8 LUFS integrado · LRA 7,2 LU · pico de amostra −0,56 dBFS ·
pico verdadeiro no AAC decodificado +0,2 dBFS (sobressinal do codec).

## 5. Escopo

- **16:9 é o único formato entregue.** O sistema é paramétrico, mas 9:16 e 1:1
  exigem recomposição de câmera e de tipografia — não são recorte. Ver
  `MOTION_DESIGN_SYSTEM.md` §9.
- **Sem locução.** O filme é lettering + música + SFX; o roteiro PT-BR com
  timecodes está em `docs/VO_SCRIPT.md`.
- **Dados de demonstração.** O rótulo "DADOS DE DEMONSTRAÇÃO" aparece em S02 e
  S05.
- O produto **não foi modificado** para o filme: a única coisa escrita para a
  produção é este diretório.

## 6. Estado no git

Todo o trabalho desta produção (`ad-production/`) está **não commitado**.
