# WIDOKEN · ÁUDIO

Trilha e efeitos **sintetizados dentro do repositório**. Não há sample de
terceiro em lugar nenhum do filme, portanto não há obrigação de licenciamento
sobre a peça final.

Gerador: `scripts/make-audio.mjs` + kit DSP `scripts/audio/dsp.mjs`
(JavaScript puro, sem dependências). Repro:

```bash
npm run audio        # escreve public/audio/music.music.wav e public/audio/sfx/*.wav
```

---

## 1. Trilha

| Item | Valor |
|---|---|
| Duração | 44,000 s exatos (22 compassos) |
| Andamento | 120 BPM — 1 beat = 0,5 s; 1 compasso = 2 s |
| Formato | WAV PCM estéreo, 48 kHz |
| Tonalidade | Lá menor; progressão **i – VI – III – VII** (Am · F · C · G) |
| Elementos | kick, sub-bass, pluck/arp, pad, hat, clap, tick |
| Dinâmica | tabela `SECTIONS` — uma linha por compasso (densidade de cada elemento) |
| Acentos | 13 `HITS` + 5 `RISERS`, colocados em segundos |

### Seções (22 compassos de 2 s)

| Trecho | Filme | Bed |
|---|---|---|
| 00–02 | S01 | só bass + pad (entrada do tanque) |
| 02–04 | S01 | kick entra |
| 04–10 | S02 | clap + hat + arp — densidade máxima (o excesso) |
| 10–16 | S03/S04 | kick sai, arp e pad — respiro, produto |
| 16–22 | S04/S05 | clap + arp voltam — confirmação |
| 22–26 | S05 | só hat + arp — leitura dos dados |
| 26–30 | S06 | kick + tick — atividade |
| 30–34 | S07 | só pad — proporção, quase silêncio rítmico |
| 34–38 | S08 | kick + clap + arp — clímax |
| 38–42 | S09 | só pad — resolução |
| 42–44 | S09 | cauda, sem ritmo |

### Acentos (HITS)

| t | Tipo | O que marca na imagem |
|---|---|---|
| 2,30 s | heavy | parada do tanque (frame 69) |
| 5,00 s | tight | corte S01→S02 |
| 7,50 s | heavy | "TUDO ISSO…" (frame 225) |
| 10,00 s | sub | corte S02→S03 |
| 15,00 s | tight | corte S03→S04 |
| 21,00 s | tight | corte S04→S05 |
| 24,00 s | pop | cortina preta da troca de popover |
| 27,00 s | tight | corte S05→S06 |
| 31,00 s | sub | corte S06→S07 |
| 34,00 s | heavy | troca "MENOS"/"MAIS" |
| 35,00 s | heavy | corte S07→S08 |
| 36,40 s | tight | pouso da frase positiva |
| 39,00 s | resolve | corte S08→S09 (assinatura) |

Risers em 0,32 · 3,40 · 13,40 · 25,40 · 33,00 s.

## 2. Efeitos

14 arquivos, **59 disparos** ao longo do filme (`src/v2/audio.tsx`):

| Arquivo | Disparos | Onde |
|---|---|---|
| `ant-scuttle` | 1 | passos da formiga (S01) |
| `tank-tread` | 5 | aproximação do tanque (S01) |
| `tank-clank` | 1 | parada mecânica (S01, frame 69) |
| `impact-heavy` | 1 | parada do tanque |
| `impact-tight` | 5 | cortes |
| `whoosh-short` | 5 | rodas desatando, transições |
| `whoosh-forward` / `whoosh-reverse` | 4 / 3 | câmera, faixa, cortina |
| `click-soft` / `click-hard` | 13 / 11 | tipografia landing, troca de palavra |
| `blip-up` | 2 | percentuais subindo |
| `pop-reveal` | 2 | ícone, revelação |
| `riser` | 4 | entradas de seção |
| `sub-drop` | 2 | mergulhos de câmera |

O tanque tem **um** efeito cômico (o `tank-clank` + `impact-heavy` da parada).
Nada mais no filme é cômico.

## 3. Mixagem (medida no arquivo entregue)

Medições com `ffmpeg -af ebur128=peak=true` e `astats` sobre o áudio
decodificado de `output/widoken-comercial-1920x1080.mp4`:

| Métrica | Valor |
|---|---|
| Loudness integrada | **−16,8 LUFS** |
| Faixa de loudness (LRA) | 7,2 LU |
| Pico de amostra | 0,938 (−0,56 dBFS) |
| Pico verdadeiro (decodificado) | +0,2 dBFS |
| Silêncios > 0,4 s abaixo de −45 dB | um, na cauda: 43,24–44,01 s (−51,6 dB RMS) — decaimento do último acorde |

**Ganho master.** A soma dos impactos sobre o bed passou de 0 dBFS no primeiro
render. Foi aplicado um ganho único de **0,834 (−1,58 dB)** em
`src/v2/audio.tsx` (`const MASTER`), sobre a música e sobre cada um dos 59
cues. O mix resultante tem pico de amostra de −0,56 dBFS. O +0,2 dBFS medido depois é
sobressinal do codificador AAC em amostras isoladas, não clipping do mix.

## 4. Locução

Não usada. Ver `VO_SCRIPT.md`. Os 7 stems Piper estão em `public/audio/vo/` e
**não** entram no render.

## 5. Licenças

| Camada | Origem | Licença |
|---|---|---|
| Trilha | sintetizada em `scripts/make-audio.mjs` | obra do projeto; sem obrigação |
| Efeitos | idem, via `scripts/audio/dsp.mjs` | obra do projeto; sem obrigação |
| RNG | `mulberry32` próprio | — |
| Voz (não usada) | `rhasspy/piper-voices`, `pt_BR-faber-medium` | declarada pelo repositório de origem; **conferir antes de uso comercial** |
| Piper (não usado no render) | `piper-tts` | MIT |

Nenhum arquivo de áudio de terceiro é distribuído nem usado na peça.
