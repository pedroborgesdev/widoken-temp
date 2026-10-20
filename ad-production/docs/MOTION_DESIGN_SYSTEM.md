# WIDOKEN · MOTION DESIGN SYSTEM (V2)

Sistema de movimento e composição do comercial de lançamento do Widoken.
Vale para o master 16:9 e para os recortes 9:16 / 1:1 (ver §9).

Arquivos de referência: `src/v2/tokens.ts`, `src/v2/type.tsx`,
`src/v2/product.tsx`, `src/v2/art.tsx`, `src/v2/scenes/S01…S09`.

---

## 1. Princípios

1. **O produto é o argumento.** Toda cena que afirma algo sobre o Widoken
   mostra o Widoken real. Gráficos externos (tanque, formiga, medidores,
   anel verde) existem para criar tensão ou escala — nunca para substituir a
   interface.
2. **Editorial suíço, não slide.** Nenhuma cena usa o esquema "título à
   esquerda, ilustração à direita". Cada sequência tem construção própria:
   tipografia sobre dados, produto como moldura, câmera dentro do produto,
   tipografia ocupando o quadro inteiro.
3. **Uma ideia por cena.** Uma proposição, uma prova, um corte.
4. **Corte é gramática.** Transições são motivadas por um elemento que
   atravessa o corte (roda → marcador, círculo → ícone, pílula → pílula,
   palavra → palavra). Não há fade como transição principal.
5. **Hierarquia constante.** Olho, produto, frase. O maior objeto do quadro
   é sempre o que a cena quer dizer.

---

## 2. Grade e tipografia

| Item | Valor |
|---|---|
| Quadro | 1920 × 1080 |
| Margem editorial | 84 px (esquerda e direita) |
| Coluna de dados | alinhada à margem, larguras de 430–520 px |
| Fonte display | Archivo variável (100–900). Peso 700/800/900 |
| Fonte técnica | Space Mono 400/700 |
| Entrelinha display | 0.80–0.84 para manchetes; 0.9–1.0 para texto corrido |
| Tracking display | −0.025 a −0.045 em manchetes grandes |
| Tracking mono | +0.06 a +0.16 (versões maiúsculas) |

**Regra do eixo `wdth`:** o Chromium do renderer ignora o eixo de largura da
Archivo. Nenhuma decisão de layout pode depender de `font-stretch`; a
condensação é obtida por tamanho e tracking.

**Tamanhos usados (px):** 392 / 300 / 288 / 266 / 260 / 240 / 222 / 190 / 184 /
180 / 150 / 118 / 112 / 88. Mono: 34 / 26 / 25 / 23 / 22.

**Máscara de texto.** Toda palavra que entra por baixo sobe dentro de uma
máscara (`overflow: hidden`) com 0,18 em de padding superior e 0,24 em
inferior para não cortar acentos (Ã, Ç, É). O deslocamento é de **170%** da
caixa de linha: com 100% o topo da letra ainda aparecia antes da palavra
começar (defeito corrigido na revisão).

---

## 3. Cor

Só existe cor vinda do produto ou do ícone oficial.

| Token | Hex | Uso |
|---|---|---|
| `paper` | `#ffffff` | fundo, silhueta invertida |
| `ink` | `#0d0d0d` | tipografia, tanque, faixa |
| `inkSoft` | `#3d3d3d` | textos de apoio |
| `inkMuted` | `#8a8a8a` | legendas técnicas |
| `surface` | `#222222` | fundo real do widget (`--color-overlay-surface`) |
| `green` | `#4aff5d` | ícone oficial; acento narrativo (ponto final, anel) |
| `amber` | `#ffad4a` | ícone oficial |
| `red` | `#ff4949` | ícone oficial; palavras "GUERRA", "TANQUE" |
| `ringSuccess` | `#a6e22e` | anel real (monokai-black) |
| `ringWarning` | `#e6db74` | anel real |
| `ringDanger` | `#f92672` | anel real |
| `ringBalance` | `#ae81ff` | anel real (saldo) |
| `ringTrack` | `#49483e` | trilho real |
| `ringIdle` | `#e6e6e6` | marcador neutro: pneu em voo, medidor antes de acender |

Narrativa de cor: preto/branco dominam; o verde oficial entra **uma vez por
ato** como acento de resolução (o ponto final de "E FÁCIL", o anel que apaga
a guerra, o farol do tanque). Vermelho é sempre o excesso. Nenhuma cor é
inventada, nenhum gradiente é usado.

---

## 4. Tempo

- **120 BPM** → 1 beat = 15 frames = 0,5 s; 1 compasso = 60 frames = 2 s.
- **44 s = 1320 frames = 22 compassos.**
- Todos os cortes caem em beat: 0 · 150 · 300 · 450 · 630 · 810 · 930 ·
  1050 · 1170 · 1320 (0 · 5 · 10 · 15 · 21 · 27 · 31 · 35 · 39 · 44 s).
- Durações de cena: 8, 10 ou 12 beats (4, 5 ou 6 s).
- Entradas de tipografia: 5–11 frames. Nunca mais de 0,4 s para uma manchete.
- Permanências: uma frase fica no mínimo 0,8 s legível; a assinatura fica
  **3,8 s imóvel** no fim.

**Vocabulário de easing**

| Nome | Uso |
|---|---|
| `outExpo` | entradas de tipo, revelações |
| `outQuint` | câmera, deslocamentos |
| `outCubic` | aberturas de máscara circulares |
| `inCubic` | saídas (tanque, hull, trilho) |
| `inOutCubic` | transições de estado |
| `outMechanical` | parada do tanque (7ª potência) |
| `outBack` | pop do ícone (overshoot 1.28) |

---

## 5. Vocabulário de movimento

| Movimento | Implementação | Onde |
|---|---|---|
| Subida mascarada | `Words dir="up"` + máscara 170% | manchetes |
| Wipe de palavra | `clip-path: inset()` da esquerda | "TUDO", "BAIXE" |
| Slide lateral | `dir="left"/"right"` + `distance` | "DE GUERRA." |
| Câmera no produto | `Shot` (focus → at, scale) | S03–S09 |
| Animação real | `ActivityShot` (33 frames, 2,2 s) | S06 |
| Máscara circular | `clip-path: circle()` | S03 (revelação), S06 (fecho), S08 (apagamento) |
| Encolhimento | retângulo que vira a pílula | S07 |
| Troca no lugar | `SwapLine` (a → b, mesma caixa) | S07 |
| Corte duro | fim de sequência | todos |

**Câmera.** `Shot` posiciona a captura real de modo que um ponto medido do
DOM (`focus`, em px CSS do clipe) caia em `at` (px do quadro) com `scale`
(px de quadro por px CSS). Nada é redesenhado: a câmera só enquadra. Escala
máxima usada: 10,5× (macro no ícone do Cursor), sobre captura a DPR 6 —
upscale real ≈ 1,75×, dentro do limite de nitidez.

---

## 6. As nove sequências

| # | Tempo | Construção | Prova |
|---|---|---|---|
| S01 | 0–5 s | Formiga atravessa; tanque entra e para com impacto; tipo monumental sobre a massa; casco sai, **seis rodas** desatam | metáfora |
| S02 | 5–10 s | As rodas pousam como **seis medidores**; campo de dados; "TUDO ISSO…" empurra o campo para 10% de opacidade; faixa preta corta e pergunta | dados reais (percentual = usado) |
| S03 | 10–15 s | Disco branco abre o preto; ícone oficial no centro; vira lockup; widget real doca na borda | produto |
| S04 | 15–21 s | Widget horizontal é a moldura; câmera entra, dá punch no beat, recua e mergulha no anel do Cursor | produto |
| S05 | 21–27 s | Popover real de uso (81% = usado) e popover real de saldo ("$2.00 remaining"); troca por cortina preta; entrega de pílula | semântica dos dados |
| S06 | 27–31 s | Câmera entra no anel do Claude; NORMAL → TRABALHANDO → NORMAL com a animação real; volta aberta | estado real |
| S07 | 31–35 s | Tanque branco atravessa o preto e sai para sempre; o preto encolhe até virar a pílula do widget; "MENOS/MAIS" troca no lugar | proporção |
| S08 | 35–39 s | "VOCÊ NÃO QUER UM TANQUE DE GUERRA." → anel verde apaga → "O QUE VOCÊ QUER É SIMPLES E FÁCIL." com ponto verde | síntese |
| S09 | 39–44 s | Ícone continua de S08; assinatura se constrói e **segura 3,8 s** | CTA |

---

## 7. Inventário de transições

| Corte | Mecanismo |
|---|---|
| S01→S02 | as 6 rodas do tanque voam e pousam exatamente nos centros dos 6 medidores (mesmo raio final, 22 px) |
| S02→S03 | a faixa preta cresce até o quadro inteiro; S03 abre do preto com um disco branco |
| S03→S04 | push: a câmera de S03 amplia 5% e S04 entra com o widget horizontal deslizando da direita |
| S04→S05 | a câmera mergulha no anel do Cursor (escala 10,5×); S05 abre no mesmo macro |
| S05→S06 | cortina preta de 9 frames; a pílula vertical aparece no mesmo ponto do quadro |
| S06→S07 | disco escuro cresce a partir do anel (r → 2300) e cobre o quadro |
| S07→S08 | corte duro de tipo: "MAIS CONTROLE." → "VOCÊ NÃO QUER" na mesma família e escala |
| S08→S09 | a frase se parte ao meio; o ícone oficial já está atrás, no centro (960, 500), 320 px |

---

## 8. Som

Ver `AUDIO.md`. Resumo: 22 compassos sintetizados a 120 BPM, 55 cues de SFX
alinhados aos frames de corte, sem locução na versão entregue.

---

## 9. Extensão para 9:16 e 1:1

O sistema é paramétrico em `tokens.ts` (WIDTH/HEIGHT), mas **não é um crop**:

- **9:16 (1080×1920):** manter a coluna de tipo com margem 72; empilhar
  tipo → produto; a câmera do produto precisa de novos `at`/`scale` porque a
  pílula vertical (54 × 390 CSS) passa a ser o eixo dominante. As cenas S02,
  S04 e S07 exigem recomposição (não recorte).
- **1:1 (1080×1080):** tipo a 70% do tamanho; produto centralizado; a faixa
  preta de S02 vira faixa de 60% da altura.
- O que **não** transfere automaticamente: as posições `at` das câmeras, os
  tamanhos de manchete acima de 200 px (estouram a largura) e o par
  tanque/formiga de S01.
- Nenhuma promessa de qualidade por recorte: a versão vertical precisa de
  render próprio com as composições recompostas.

---

## 10. O que o sistema proíbe

Gradientes, glow, bloom, reflexos, luz volumétrica, glassmorphism, 3D,
perspectiva cinematográfica, partículas luminosas, fumaça, metal, texturas
decorativas, listras sem função, sombras adicionadas ao produto, títulos de
slide, microtexto ao lado de manchete, logo minúsculo no canto.

A única sombra presente é a **sombra real** do widget, capturada do aplicativo
(`box-shadow` do `widget__board`) e ampliada junto com o produto.
