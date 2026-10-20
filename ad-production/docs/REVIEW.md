# WIDOKEN · REVISÃO VISUAL E TÉCNICA

Revisão do arquivo entregue, feita sobre o MP4 (não sobre stills): o vídeo foi
decodificado inteiro, o áudio foi medido e os 11 quadros de comparação foram
extraídos do próprio arquivo.

---

## 1. Verificação técnica

| Item | Resultado |
|---|---|
| Arquivo | `output/widoken-comercial-1920x1080.mp4` |
| Duração | 44,011 s |
| Quadros de vídeo | **1320** (30 fps, contados com `-count_frames`) |
| Resolução | 1920 × 1080, SAR 1:1, H.264 High, yuv420p, bt709 |
| Bitrate de vídeo | ~779 kb/s (CRF 17) |
| Áudio | AAC-LC 48 kHz estéreo, ~317 kb/s |
| Decodificação completa | sem erro (`ffmpeg -v error … -f null -`) |
| Loudness integrada | −16,8 LUFS |
| LRA | 7,2 LU |
| Pico de amostra | 0,938 (−0,56 dBFS) |
| Pico verdadeiro (AAC decodificado) | +0,2 dBFS — sobressinal do codec |
| Silêncios > 0,4 s abaixo de −45 dB | um, na cauda: 43,24–44,01 s (−51,6 dB RMS, pico −34 dBFS) — decaimento do último acorde, não corte abrupto |
| Cortes | 0 · 150 · 300 · 450 · 630 · 810 · 930 · 1050 · 1170 · 1320 (todos em beat) |
| Estabilidade final | assinatura imóvel de 40,17 s a 44,00 s = **3,83 s** |

Comparação de referência: V1 tem 1200 quadros / 40,021 s e está em
`output/widoken-comercial-v1-1920x1080.mp4`.

### Costuras medidas no arquivo final

Diferença média por pixel (MAD, escala 0–255) entre o último quadro de uma
sequência e o primeiro da seguinte, extraídos do próprio MP4:

| Corte | MAD | Leitura |
|---|---|---|
| 149→150 (S01→S02) | **0,05** | match cut: a roda pousa exatamente sobre o marcador |
| 299→300 (S02→S03) | 6,69 | faixa preta → preto (a faixa vira o campo) |
| 449→450 (S03→S04) | 51,74 | push cut: a câmera entra no anel do widget |
| 629→630 (S04→S05) | 50,79 | corte em movimento: mesmo crop do anel do Cursor |
| 809→810 (S05→S06) | 10,82 | painel preto limpa o quadro |
| 929→930 (S06→S07) | **0,00** | preto sobre preto |
| 1049→1050 (S07→S08) | 45,76 | troca de palavra (word swap) |
| 1169→1170 (S08→S09) | **0,00** (máx. 13) | match cut: o ícone é o mesmo objeto |

Os dois cortes com MAD ~50 são cortes em movimento deliberados (a câmera já
está se movendo no quadro anterior); não são falhas de continuidade.

Energia sonora no quadro de corte (RMS do quadro ÷ média dos 20 quadros
vizinhos, medido no áudio decodificado): 1,59× em 150 · 1,65× em 300 · 2,11×
em 450 · 1,97× em 630 · 1,84× em 810 · 1,99× em 930 · 2,20× em 1050 · 1,67×
em 1170. Todo corte tem acento — nenhum cai em vale.

## 2. Leitura sequência por sequência

| # | O que funciona | O que é frágil |
|---|---|---|
| S01 | a parada do tanque (recuo + tremor de 2 frames) dá peso físico; o tipo entra **sobre** a massa, não acima; as rodas desatando preparam o corte | a formiga leva 4,8 s para atravessar — bem mais lenta que o briefing sugeria (1,5 s), o que a torna um personagem, mas exige paciência |
| S02 | o argumento (excesso) é feito com **dados reais**: 6 medidores, percentual = usado, reset, severidade por cor; "TUDO ISSO…" empurra o campo para 10% e a faixa preta fecha | é a cena mais “informativa” do filme; quem pausar no quadro vê muita coisa ao mesmo tempo (intencional, mas é densa) |
| S03 | o disco branco sobre preto com o ícone é o quadro mais forte do filme; o disco inunda e o widget entra pela borda real | a janela de 11,4–11,8 s é esparsa (ícone + nome em construção, widget entrando) — respiro de revelação, mas é o ponto mais vazio do corte |
| S04 | o widget horizontal é a própria moldura; a câmera empurra, dá punch no beat e mergulha no anel do Cursor | a cena é a mais “câmera” e a menos “ideia”: ela mostra, não argumenta |
| S05 | os dois popovers reais provam a semântica (81% = usado; saldo = restante); o cursor e o estado hover são reais; a cortina preta separa os dois sem fade | muita informação textual; a leitura depende de o espectador pausar |
| S06 | o estado WORKING é a animação real, quadro a quadro; o macro no anel é o melhor uso da captura DPR 6 | a volta ao estado NORMAL é rápida; quem piscar perde a prova |
| S07 | o tanque branco atravessa o preto e **sai para sempre**; o preto encolhe até virar a pílula — a melhor transição do filme | "MENOS/MAIS" em 4 s é apertado; a frase mal assenta antes da troca |
| S08 | a frase negativa ocupa o quadro inteiro com "GUERRA" em vermelho; o anel verde apaga; a positiva entra com o ponto verde | duas frases em 4 s é o maior risco de leitura do filme (a negativa fica 0,5 s completa) |
| S09 | a assinatura se constrói e **segura 3,8 s**; o widget real ancora o CTA; a URL é a oficial, em duas linhas, 34 px | o terço inferior do quadro fica vazio por desenho (margem de pôster) |

## 3. Critérios de rejeição do briefing

| Critério | Situação |
|---|---|
| Cara de PowerPoint/Canva | não: nenhuma cena usa o esquema título+arte; tipografia sobre dados, produto como moldura, câmera dentro do produto |
| Widget minúsculo | não: 810 px de altura (S03/S09), pílula de 1365 × 185 px em S04, macro de 10,5× no anel do Cursor (S05) |
| Cenas idênticas | não: 9 construções distintas |
| Animação só de fade | não: 9 transições por elemento (roda→marcador, disco→ícone, mergulho de câmera, cortina, encolhimento, split) |
| Ícone só no começo e no fim | não: ícone em S03 (centro), S08 (revelado pelo split) e S09 (lockup) |
| Listras decorativas | não existem |
| Títulos de slide | não existem |
| Vazios não intencionais | medido nos 1320 quadros: quatro janelas curtas abaixo de 2,5% de tinta — abertura 0–1,1 s (só a formiga: o vazio é o argumento), handoff 4,9–5,3 s (as rodas viram marcadores), 2 quadros brancos em 36,10 s (piscar entre as duas frases) e o ícone sozinho em 38,9–39,2 s (match cut). Nenhuma é vazio acidental de composição, mas as duas primeiras são os pontos mais frágeis do corte |
| Alteração de UI | não: captura do app real, sem retoque de interface |
| Feature inventada | não: cada estado mostrado existe em `src/renderer` |
| Metáfora sem propósito | não: tanque = custo desproporcional; formiga = tarefa pequena |
| CTA sem clareza | não: "BAIXE O WIDOKEN." + `github.com/pedroborgesdev/widoken` / `releases/latest` |
| Sem continuidade audiovisual | não: 59 cues ancorados nos quadros de corte; acentos em todos os cortes |
| Produto secundário | não: o widget é o maior objeto em S03, S04, S05, S06, S07, S09 |
| Gradiente/glow/bloom/3D/partículas | não existem; a única sombra é a real do produto |
| Tipografia genérica | não: Archivo variável 700–900 + Space Mono, com hierarquia |
| Resultado genérico | julgamento do usuário — mas nenhuma cena poderia ser reaproveitada por outro produto sem trocar o widget |
| Vídeo não renderizado | não: 1320 quadros, decodificação limpa |

## 4. O que eu mudaria com mais tempo

1. **Dar 1 s a mais para S08.** As duas frases em 4 s é o maior compromisso do
   corte. Um S08 de 5 s (S07 caindo para 3 s) deixaria a negativa respirar.
2. **Locução.** O filme funciona sem voz, mas o ato S07–S08 é longo para ficar
   só com lettering; uma voz seca em S07 ajudaria a ligar "menos" a "controle".
3. **Uma tomada real de tela (não só o widget).** O produto é o widget, mas
   mostrar 0,6 s do desktop com ele flutuando daria escala.
4. **S04 com uma ideia, não só câmera.** Hoje ela é a cena mais bonita e a menos
   argumentativa.

## 5. Veredito

O V2 corrige as falhas estruturais do V1: não é mais um slide deck, o widget
protagoniza, cada corte é motivado, o áudio está no beat e o CTA é legível e
estável por 3,8 s. As fragilidades que restam são de **densidade e duração**
(S05 e S08 são densas; S04 é mais forma que argumento), não de execução.
