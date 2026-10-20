# WIDOKEN · RELATÓRIO DE MODIFICAÇÃO (V1 → V2)

Data: 19/10/2026
Artefatos: `output/widoken-comercial-1920x1080.mp4` (V2, entrega) ·
`output/widoken-comercial-v1-1920x1080.mp4` (V1, comparação)

---

## 1. Resumo

| | V1 | V2 |
|---|---|---|
| Duração | 40,021 s / 1200 f | 44,011 s / 1320 f |
| BPM | — (cortes em segundos redondos) | 120 (corte em beat) |
| Sequências | 8 | 9 |
| Construção | mesmo template (tipo à esquerda, arte à direita) | 9 composições distintas |
| Widget | pequeno, no canto, decorativo | protagonista: moldura, macro, prova |
| Transições | fade / slide | 9 transições motivadas por elemento |
| Tipografia | títulos de slide, logo grande e vazio | hierarquia editorial, manchetes kinéticas |
| Cor | barras decorativas laterais | só cor do produto + ícone oficial |
| Áudio | música + SFX | música + 59 cues de SFX, sem locução |
| Pico de amostra | — | −0,56 dBFS (AAC decodificado) / +0,2 dBTP |
| Loudness | — | −16,8 LUFS integrado |

O V1 está preservado em código (`src/WidokenAd.tsx`, `src/scenes/`,
`src/brand/`) e em vídeo. Nada do V1 foi apagado.

---

## 2. O que mudou, beat por beat

### 2.1 Mapa de tempos

| V1 (s) | V1 sequência | V2 (s) | V2 sequência | O que mudou |
|---|---|---|---|---|
| 0,0–4,0 | S01 O absurdo | 0,0–5,0 | S01 O absurdo | +1 s: o tanque entra aos 1,0 s e para aos 2,3 s com recuo e tremor; o tipo entra **sobre** a massa (2,3–4,1 s); as **seis rodas** desatam (4,4–5,0 s) |
| 4,0–8,0 | S02 A complexidade | 5,0–10,0 | S02 Tudo isso | os números soltos viraram **seis medidores reais** que nascem das rodas do tanque; o campo é empurrado para 10% de opacidade e a faixa preta fecha a cena com a pergunta |
| 8,0–14,0 | S03 Reveal | 10,0–15,0 | S03 Reveal | o preto abre num **disco branco** (não num fade); o ícone oficial ocupa o centro num círculo de 620 px; o disco inunda a página; o widget real doca |
| 14,0–20,0 | S04 Um só lugar | 15,0–21,0 | S04 Um só lugar | +1 s; o widget horizontal é a moldura, a câmera empurra, dá um punch no beat e mergulha no anel do Cursor |
| 20,0–26,0 | S05 Informação | 21,0–27,0 | S05 Detalhes | dois popovers reais (uso 81% = usado; saldo = restante), troca por cortina preta e entrega de pílula |
| 26,0–30,0 | S06 Atividade | 27,0–31,0 | S06 Trabalhando | câmera macro dentro do anel do Claude; NORMAL → TRABALHANDO → NORMAL com a animação real |
| 30,0–34,0 | S07 Menos é mais | 31,0–35,0 | S07 Proporção | o tanque branco atravessa o preto e **sai para sempre**; o preto encolhe até virar a pílula do widget |
| 34,0–40,0 | S08 CTA | 35,0–39,0 | S08 Simples e fácil | a frase negativa ocupa o quadro inteiro; um anel verde apaga a guerra; a frase positiva entra no lugar |
| — | — | 39,0–44,0 | S09 Assinatura | nova sequência: ícone → nome → widget → CTA → URL, e **3,8 s de repouso** |

### 2.2 O que saiu

| Item do V1 | Motivo | Substituto no V2 |
|---|---|---|
| logo minúsculo no canto | não é assinatura, é marca d'água | lockup ícone + nome em 222 px (S03) e assinatura completa (S09) |
| títulos sempre à esquerda | vira slide | tipo sobre dados (S02), produto como moldura (S04), câmera dentro do produto (S06), tipo em quadro inteiro (S08) |
| WIDOKEN gigante e vazio | escala sem função | o nome só aparece depois do ícone e ao lado do widget real |
| botão preto retangular | CTA genérico | "BAIXE O WIDOKEN." + URL oficial em duas linhas, sem caixa |
| barra de cor decorativa lateral | cor sem função | cor só dos anéis reais, do ícone oficial e do acento narrativo (verde) |
| widget pequeno no canto inferior direito | produto secundário | widget a 840 px de altura (S03/S09) e até 2015 px de largura (S04) |
| cenas praticamente vazias (00:07 e 00:26) | vazio não intencional | medidores reais (00:07) e popover de saldo (00:26) |
| fade como transição | monotonia | 9 transições por elemento (ver §3) |
| repetição do esquema texto/arte | template | ver §2.1 |

---

## 3. Transições (verificação)

| Corte | Mecanismo | Como foi verificado |
|---|---|---|
| S01→S02 | as 6 rodas voam e pousam nos centros dos 6 medidores | frame 149 = frame 150 local 0 dos medidores (MAD 0,05) |
| S02→S03 | a faixa preta cresce até o quadro inteiro; S03 abre do preto | frames 287–301 medidos como pretos (intencional) |
| S03→S04 | push de 5% no fim de S03 | `push` em S03, corte duro |
| S04→S05 | câmera mergulha no anel do Cursor (10,5×) e S05 abre no mesmo macro | `A_CLOSE` idêntico nos dois lados do corte |
| S05→S06 | cortina preta de 9 frames | frames 720–728 medidos como escuros (intencional) |
| S06→S07 | disco escuro cresce a partir do anel (r → 2300) | `outCubic((f-110)/9)` conferido |
| S07→S08 | corte duro de tipo ("MAIS CONTROLE." → "VOCÊ NÃO QUER") | mesma família/escala |
| S08→S09 | a frase se parte; o ícone já está atrás, em (960, 500), 320 px | frame 119 de S08 = frame 0 de S09 |

---

## 4. Problemas encontrados e corrigidos

| # | Defeito | Causa | Correção |
|---|---|---|---|
| 1 | widget invisível em S03 e S09 | um wrapper estático com `transform` criava um bloco contentor de altura zero | `opacity`/`transform` passaram para o `style` do `Shot` |
| 2 | palavras apareciam antes da hora (faixa de letras no topo) | máscara com 0,42 em de padding; deslocamento de 100% não escondia a letra | deslocamento de **170%** |
| 3 | barra dos medidores sobre o nome e o número | `Meter` é `position: absolute` dentro de um wrapper estático | wrapper com `position: relative`, altura 14 e `marginTop: 12` |
| 4 | "QUANTO" encostava no popover (S05) | câmera aberta demais para a esquerda | `atX` 1240 → 1345, escala 2,5 → 2,35, cursor reposicionado |
| 5 | 00:11 — quadro quase vazio (3,6% de tinta) | o disco branco inundava o quadro em 0,8 s e o ícone ficava sozinho no branco | disco para em r=620 com cantos pretos; só inunda depois (30–42) |
| 6 | 00:36 — quadro **em branco** (0,1%) | o anel apagava tudo e a frase nova só começava no frame seguinte | apagamento 22→28, frase nova a partir de 25 → 33; o negativo ganhou 0,5 s de leitura |
| 7 | frase negativa apagada 1 frame depois de ficar completa | construção lenta (última palavra em 21,2) + apagamento em 22 | construção comprimida (última palavra em 12) e apagamento em 28 |
| 8 | "E FÁCIL" com anel verde por cima no fim (S08) | anel apagava o quadro e a frase nova entrava no mesmo instante | re-timing (item 6) |
| 9 | áudio com pico +0,6 dBFS (clipando) | soma de impactos sobre a música | ganho master 0,834 → pico do mix −1,0 dBFS |
| 10 | URL com `\n` literal | string com escape em JSX | duas linhas `Mono` explícitas |
| 11 | S02 com medidores claros demais sob a faixa | faixa preta entrava antes do texto | medidores a 10% (`metersDim`) e texto em 107 |
| 12 | texto de `TRABALHANDO?` cortado à direita | tipo a 214 px estourava o quadro | 180 px |
| 13 | S07 com fundo `paper` em vez de preto | troca de token errada | `surface` (#222) |
| 14 | o nome "WIDOKEN" subia em cima do ícone (S03) | o ícone ainda viajava para o lockup quando o nome entrava | `settle` 32→44 e nome a partir de 45 (ícone a 200 px em 210,290) |
| 15 | o ícone aparecia por cima de "SIMPLES"/"E FÁCIL" (S08) | o split é lento no início (`inCubic`) e o ícone entrava em 104 | split 102→118, ícone só em 116, quando o centro já está limpo |
| 16 | S03: 11,2–11,5 s com a página inteiramente branca e o ícone pequeno sozinho | o disco inundava em 12 quadros, antes de o nome e o widget entrarem | inundação em 34 quadros (cantos pretos como moldura), widget docando desde o quadro 38 e nome a partir de 43 |
| 17 | "E FÁCIL" ainda aparecia na borda direita no último quadro de S08 | o deslocamento do split (1500 px) era menor que a largura da linha + a margem de 84 px | deslocamento para a direita 1500 → 2200 px (as linhas que saem pela esquerda continuam em 1500) |
| 18 | o filme abria com um quadro em branco | a formiga entrava em cena a partir de −90 px, fora do quadro | a formiga já está em cena no quadro 0: o filme corta numa ação em curso |
| 19 | os pneus sumiam ao sair da esteira (círculos brancos sobre papel branco) | o aro era `paper`; só o cubo preto aparecia, e o quadro 144 ficava com seis pontos soltos | aro `ringIdle` (#e6e6e6) durante o voo: o pneu vira marcador ao se soltar |
| 20 | o cubo das rodas media 14,5 px no fim de S01 e 29 px no início de S02 | a largura do cubo usava o raio, não o diâmetro | `r * 2 * (0.33 + 0.33 * p)` |
| 21 | "0%" dos seis medidores aparecia já no primeiro quadro de S02 | o `CountUp` animava o número, mas não a visibilidade | opacidade do valor amarrada ao bloom |
| 22 | 0,6 s de página quase vazia em 4,7–5,3 s | o tanque, a esteira e o tipo saíam em sequência e as rodas pousavam cedo; os medidores só acendiam do quadro 4 ao 66 | saídas reagrupadas (tipo 130, casco 134, rodas 138, esteira 142), voo das rodas em 12 quadros até o último quadro, blooms em 0/8/16/24/32/40/42 |
| 23 | a esteira ainda aparecia no canto inferior direito no último quadro de S01 | `trackOut` era `inCubic(/8)` e só zerava depois do corte | `inCubic(/6)`; costura S01→S02 com 495 pixels de diferença (só antialiasing de borda) |
| 24 | cliques de acendimento fora de sincronia em S02; whoosh da saída do tipo e clique do pouso das rodas adiantados | os cues seguiam a cadência antiga | cues realinhados (152/160/168/176/184/190 · 132 · 148) |
| 25 | o anel verde de S08 nunca aparecia | o disco branco do apagamento era pintado **depois** do anel e cobria todo o traço | disco primeiro, anel depois (traço `inset` de 12 px, raio externo intacto) |
| 26 | "UM TANQUE" estourava a margem direita (chegava a x=1919) | corpo de 300 px não cabia em 1752 px de coluna | 280 px; a linha agora termina em x=1860, dentro do quadro |
| 27 | a manchete de abertura ("UM TANQUE") terminava a 10 px da borda direita | 288 px produziam 1805 px de linha a partir de x=105 | 276 px: a linha termina em x=1834, com margem de 86 px |
---

## 5. Quadros de comparação

`output/comparison/pair-{2,7,11,18,23,26,28,33,36,38,39.5}.png` — V1 em cima,
V2 embaixo, 960×540 cada.

`output/v1-ref/` e `output/v2-ref/` guardam os quadros originais 1920×1080.

Medição objetiva de ocupação (fração de pixels não-brancos, grade 4 px):

| t | V1 | V2 | Leitura |
|---|---|---|---|
| 2 s | 0,327 | 0,212 | tanque nos dois; V2 ainda não tem tipo (entra em 2,3 s) |
| 7 s | **0,004** | 0,065 | V1 quase vazio; V2 com os seis medidores reais já formados |
| 11 s | 0,249 | 0,487 | V2: disco branco sobre preto + ícone |
| 18 s | 0,370 | 0,371 | widget horizontal nos dois; V2 com câmera e anel |
| 23 s | 0,407 | 0,353 | V2: tipo + popover real + pílula |
| 26 s | **0,000** | 0,274 | V1 quadro vazio; V2 com o saldo real |
| 28 s | 0,157 | 0,216 | V2: atividade real em macro |
| 33 s | 0,267 | 0,192 | V2: tanque branco saindo + widget |
| 36 s | 0,200 | 0,226 | V2: frase negativa completa (vermelho) |
| 38 s | 0,084 | 0,170 | V1 quase vazio; V2 com a frase positiva + ponto verde |
| 39,5 s | 0,190 | 0,146 | V2 em construção de assinatura (ícone + nome + widget) |

Nenhum quadro do V2 tem vazio não intencional (a medição com a grade de 4 px
e limiar `r<250` está na tabela). Os dois momentos pretos do filme
(9,97–10,03 s e 24,00–24,27 s) são transições de projeto; o ícone sozinho em
38,93–39,20 s é o match cut para S09.

---

## 6. Limitações que permanecem

1. **Sem locução.** A versão entregue é lettering + música + SFX. O roteiro
   PT-BR com timecodes está em `VO_SCRIPT.md` e os 7 stems Piper em
   `public/audio/vo/`, mas não foram usados: a qualidade da voz neural não
   sustentou o tom do filme. Não há locução falsa.
2. **Pico após codec.** O mix sai a −1,0 dBFS, mas o AAC decodificado mede
   +0,2 dBFS de pico verdadeiro (sobressinal do codec em amostras isoladas).
   Não é clipping do mix; é o comportamento do AAC nesse nível.
3. **Sombra do produto ampliada.** A sombra real do widget é preservada; em
   escala 4× lê-se mais difusa que num desktop. Removê-la seria alterar o
   produto.
4. **00:02 / 00:11 / 00:39,5 são quadros de construção.** São os instantes
   pedidos, e caem no meio de uma entrada. São intencionais; não são "quadros
   herói".
5. **9:16 e 1:1 não estão renderizados.** O sistema é paramétrico, mas as
   posições de câmera e os tamanhos de manchete exigem recomposição — não é
   recorte. Ver `MOTION_DESIGN_SYSTEM.md` §9.
6. **Dados de demonstração.** As fixtures não são a conta de um usuário real;
   o rótulo "DADOS DE DEMONSTRAÇÃO" aparece em S02 e S05.
