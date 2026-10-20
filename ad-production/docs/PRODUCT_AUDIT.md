# WIDOKEN · AUDITORIA DE PRODUTO (V2)

O que o filme mostra do Widoken, de onde veio cada pixel e o que foi
verificado no código-fonte do aplicativo antes de filmar.

Escopo: `app/` (Electron + React). O filme **não altera** o produto; a única
coisa modificada é o pipeline de captura em `ad-production/scripts/`.

---

## 1. Regra de fidelidade

| Camada | Regra |
|---|---|
| Interface do widget | pixel real, capturado do app em execução. Nunca redesenhada, recolorida, retipada ou rearrumada |
| Ícones de provedores | assets oficiais do app (SVG/PNG em `resources/`) |
| Ícone do Widoken | `resources/widoken.png`, sem edição |
| Anéis, trilhos, pesos de traço, raios, tipografia interna | vêm do DOM/CSS real |
| Popovers, estado hover, estado "trabalhando" | capturados do app real nesses estados |
| Gráficos externos (tanque, formiga, medidores, disco, anel verde, cursor) | desenhados para o filme, em `src/v2/art.tsx`; nunca se sobrepõem a um elemento de UI |
| Dados numéricos | fixtures de demonstração, sempre rotulados "DADOS DE DEMONSTRAÇÃO" |

Não existe UI inventada no filme. Não existe botão, popover, tooltip, menu ou
estado que o aplicativo não produza.

---

## 2. Método de captura

`scripts/capture-product.mjs` (Playwright 1.64.1, Chromium, DPR 6):

1. sobe o preview web real do app (`vite.web.config.ts`, porta 5199);
2. injeta um `window.widgetDesktop` falso com as fixtures — a mesma ponte que
   o app usa no Electron;
3. monta o widget React real no estado desejado;
4. espera fontes e ícones;
5. mede o DOM (`getBoundingClientRect`) de cada nó nomeado;
6. fotografa o clipe exato, com fundo transparente;
7. grava `public/product/*.png` + `src/v2/captures.json` (geometria).

O manifesto é gerado; **não editar à mão**.

### Capturas

| Nome | Clipe (CSS) | Estado real |
|---|---|---|
| `widget-vertical` | 122 × 494 | vertical, 7 provedores, sem hover |
| `widget-horizontal` | 494 × 122 | horizontal |
| `widget-vertical-hot` | 122 × 494 | hover: alças de arrastar + engrenagem visíveis |
| `widget-horizontal-popover` | 539 × 372 | hover no provedor Cursor + popover de uso aberto |
| `widget-vertical-popover-balance` | 464 × 530 | hover no DeepSeek + popover de saldo |
| `activity-frames` | 33 × (122 × 494) | animação real do anel, um quadro a cada ~66 ms (período 2,2 s) |

Arquivos de saída: `public/product/widget-*.png`,
`public/product/activity/frame-00…32.png`.

---

## 3. Geometria verificada (lida do DOM)

- pílula vertical: **54 × 390 CSS**, `border-radius: 999px` (raio 27);
- pílula horizontal: **390 × 54**;
- board: `top: 18px`, ocupa os 54 px de largura;
- ícones de provedor: **42 × 42**, passo de 48 px;
- anel: `viewBox 0 0 28 28`, traço fino, dois arcos quando `split: true`;
- área de captura vertical: 122 × 494 (34 px de folga lateral, 52 px acima e
  abaixo) — folga suficiente para a sombra real não ser cortada.

No filme, a pílula é ampliada para 840 px de altura em S03/S09 (escala 2,15×
sobre 390 px) e até ~2015 px de largura em S04 (escala ~5,2× no pico). Como a
captura é DPR 6, o upscale efetivo fica ≤ 1,75×.

---

## 4. Semântica dos dados (verificada no código)

| Campo | Significado real | Onde foi checado |
|---|---|---|
| `percent` | **usado**, não restante. 405/500 = 81% | `src/shared/providerUsage.ts`, `usageFormat.ts` |
| `left` / `right` | as duas metades de um anel dividido (`split: true`), não "restante" | `UsageRing.tsx`, `settings.ts` (`primaryLimitId` / `secondaryLimitId`) |
| limite monetário | **restante**, exibido como valor ("$2.00 remaining") | `usageFormat.ts` linhas 17–26 |
| severidade | ≥ 75% perigo, ≥ 50% atenção, abaixo disso sucesso | `src/shared/provider.ts` (`getUsageSeverity`) |
| reset | data absoluta + tempo relativo ("in 11 days") | `usageFormat.ts` |
| atividade | anel tracejado girando enquanto o provedor trabalha | `UsageRing.tsx` (`ACTIVITY_DASH`) |

Consequência para a copy do filme:

- "QUANTO JÁ FOI." (S05) — correto para percentual de uso.
- "81% JÁ USADO · 405 / 500" — correto.
- "QUANTO RESTA." / "$2.00 · SALDO USD · PLANO HARNESS" — correto, porque é
  saldo monetário, que o app mostra como restante.

Nenhuma peça do filme chama percentual de "restante".

**Tema:** `monokai-black` é o padrão do app (`settings.ts:93`). Os tokens do
filme (`#222`, `#49483e`, `#a6e22e`, `#e6db74`, `#f92672`, `#ae81ff`) são
exatamente as variáveis `--color-overlay-*` desse tema.

---

## 5. Provedores e fixtures

Sete provedores, na ordem real do widget:

`claude · openai · cursor · antigravity · copilot · deepseek · huggingface`

Fixtures usadas no filme (todas de demonstração):

| Provedor | Dado | Observação |
|---|---|---|
| Claude | 64% · semanal · renova em 3 dias | |
| ChatGPT | 22% · 5 horas · 3h32 | |
| Cursor | 81% · 405/500 · renova em 11 dias | split: Cursor Models 81% / Other Models 35% |
| Antigravity | 44% · Gemini · renova em 2 dias | |
| Copilot | 55% · premium · 168/300 | |
| DeepSeek | US$ 2,00 · plano Harness | saldo restante |
| Hugging Face | presente no widget, não usado nos medidores de S02 | |

O rótulo "DADOS DE DEMONSTRAÇÃO" aparece em S02 e S05 (as duas cenas com
números soltos).

---

## 6. Estados reais usados no filme

1. **Repouso vertical** — S03, S07, S09.
2. **Repouso horizontal** — S04.
3. **Hover (hot)** — S05: alças de arrastar e engrenagem aparecem porque o
   ponteiro está sobre o widget. É o estado real; nada foi acrescentado.
4. **Popover de uso** — S05: aberto pelo hover no Cursor, com "Cursor Models
   (LEFT) 81%", "405 / 500 used", "Resets at …", "Other Models (RIGHT) 35%".
5. **Popover de saldo** — S05: "Harness plan / USD balance / $2.00 remaining".
6. **Trabalhando** — S06: `ActivityShot` reproduz os 33 quadros reais do anel
   de atividade, em velocidade real (2,2 s por volta).

---

## 7. O que o filme demonstra

- sete integrações em um único widget;
- leitura de uso por provedor (percentual, janela, reset);
- anéis divididos (duas janelas do mesmo provedor);
- saldo monetário restante;
- popover de detalhe por provedor;
- estado de atividade em tempo real;
- widget sempre visível no desktop, vertical ou horizontal.

## 8. O que o filme deliberadamente omite

- configurações, temas alternativos, atalhos, bandeja, login;
- onboarding e descoberta de provedores;
- notificações, erros, estados vazios e estados "indisponível";
- custo em CNY, limites por modelo individuais, histórico;
- qualquer promessa de preço, plano ou disponibilidade que não esteja no
  repositório.

A omissão é editorial, não uma alegação de que não existam.

---

## 9. Limitações conhecidas

1. **Som do produto** — a sombra do board é real e foi capturada junto. Em
   escala 4× ela fica mais difusa do que num desktop, porque é a mesma sombra
   ampliada. Não foi removida (seria alterar o produto).
2. **Fontes internas do widget** — o popover usa a fonte do sistema no
   Electron. A captura roda no Chromium headless do Playwright; a métrica é
   a mesma, mas não é uma foto de uma janela Electron real.
3. **DPI** — a captura é DPR 6, não 1× nem 2×; o produto é vetorial (SVG +
   CSS), então a geometria é idêntica, mas o raster é mais fino.
4. **Animação de atividade** — 33 quadros amostrados de um período de 2,2 s;
   o playback é fiel ao período, mas não é uma captura contínua.
5. **Dados** — fixtures, não a conta de um usuário real. Rotulados no filme.
