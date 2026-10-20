# WIDOKEN · ROTEIRO DE LOCUÇÃO (PT-BR)

**A versão entregue NÃO tem locução.** O filme foi montado para lettering,
música e SFX. Este documento existe por dois motivos:

1. registrar o roteiro que foi escrito e sintetizado (Piper, voz `pt_BR-faber-medium`);
2. permitir que uma pessoa grave a versão com voz sem refazer a edição.

Os 7 stems sintetizados estão em `public/audio/vo/vo-01.wav … vo-07.wav`
(48 kHz, mono). Eles **não** entram no render: a qualidade da voz neural não
sustentou o tom do filme, e uma locução robótica seria pior que nenhuma.

---

## 1. Direção

- Tom: confiante, seco, de conversa — não locutor de rádio, não "publicitário".
- Velocidade: ~150 palavras/min. Deixar o silêncio trabalhar; não preencher
  todas as cenas.
- Ênfase: "tanque de guerra" e "formiga" com um leve sorriso; "Widoken" sempre
  claro e neutro; "à vista" sem drama.
- Sem grito, sem sussurro, sem riso. A piada é visual.

## 2. Linhas e timecodes (V2, 44 s)

| # | Entra | Sai | Texto | Cena | Nota |
|---|---|---|---|---|---|
| 01 | 00:00,4 | 00:04,4 | "Você não quer um tanque de guerra pra matar uma formiga." | S01 | sobre o tanque parado; "formiga" cai junto com o tipo |
| 02 | 00:05,6 | 00:09,4 | "Isso tudo… só pra ver o seu uso?" | S02 | pausa real nas reticências; "uso" no corte da faixa preta |
| 03 | 00:10,4 | 00:13,2 | "Conheça o Widoken." | S03 | entra quando o ícone ocupa o centro; nome sem ênfase extra |
| 04 | 00:15,4 | 00:19,2 | "Suas ferramentas de IA, reunidas num widget compacto." | S04 | "compacto" com a câmera recuando |
| 05 | 00:21,4 | 00:26,4 | "Quanto você usou, quanto resta e quando renova. Tudo à vista." | S05 | três tempos: usado / resta / renova; "à vista" no popover de saldo |
| 06 | 00:27,4 | 00:30,6 | "E quando a sua IA está trabalhando, você sabe." | S06 | "trabalhando" junto com o estado WORKING |
| 07 | 00:39,4 | 00:42,6 | "Widoken. Simples, direto, no controle." | S09 | "Widoken" com o lockup; "no controle" no último acento |

Silêncio intencional: **S07 (00:31–00:35) e S08 (00:35–00:39)**. Nesses dois
atos a imagem argumenta sozinha; a voz só voltaria na assinatura.

## 3. Como gravar

```bash
# opção A: regravar com voz humana
#   grave 7 takes, 48 kHz mono, -3 dB de pico, sem compressão
#   nomeie vo-01.wav … vo-07.wav e substitua em public/audio/vo/

# opção B: re-sintetizar (Piper)
npm run voiceover
```

Para ativar a locução no filme, descomente o bloco `<VoLayer />` em
`src/v2/WidokenAdV2.tsx` (ou adicione `<Audio src={staticFile('audio/vo/vo-0N.wav')} />`
nos frames da tabela acima). A mixagem esperada é voz a −18 LUFS com o bed
musical a −22 LUFS; o master atual deixa 6 dB de headroom para isso.

## 4. Pronúncia

| Grafia | Fala |
|---|---|
| Widoken | "ui-DÓ-ken" (uai-dó-ken), sem pausa |
| Antigravity | "anti-gráviti" |
| DeepSeek | "dip-síik" |
| Copilot | "có-pailot" |
| Hugging Face | "râguin feis" |
| GitHub | "guit-râb" |
