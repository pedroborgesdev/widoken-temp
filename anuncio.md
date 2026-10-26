# WIDOKEN — Comercial de lançamento V10

## Conceito

**Suas IAs, à vista.**

Um comercial de produto de 37 segundos, minimalista e preciso, com linguagem de lançamento premium: fundo branco, tipografia monumental, cores da marca e o widget real como protagonista. A V10 trata o produto como um único objeto persistente. Ele não desaparece entre estados ou cenas; muda de posição, orientação, tema e contexto diante do espectador.

## Roteiro e cenas

| Tempo | Cena | Imagem e movimento | Texto na tela |
| --- | --- | --- | --- |
| 0:00–0:03.5 | O problema | Marca discreta no alto. A pergunta entra pela esquerda; três indicadores aparecem em sequência e contam até os percentuais utilizados. No final, ficam apenas três anéis coloridos, já prontos para formar o produto. | `VOCÊ SABE QUANTO JÁ USOU?` |
| 0:03.5–0:07 | A revelação | Os três anéis viajam diretamente até suas posições dentro do widget horizontal. A cápsula é revelada sem fade e o conjunto permanece sólido. Em seguida, o mesmo widget muda de eixo: a cápsula se alonga e cada ícone ocupa sua posição vertical sem girar. | `SUAS IAS. UM ÚNICO WIDGET.` / `SUAS IAS. UMA SÓ VISÃO.` |
| 0:07–0:14.5 | Uso em percentual | O widget vertical recebido da cena anterior faz um único ajuste suave até o enquadramento definitivo e permanece estável. Só então o popover real do Cursor se abre lateralmente, conectado ao produto; as barras avançam até 81% e 35%, seguidas pela informação de renovação. O painel recolhe e o widget se desloca suavemente para a posição da próxima cena. | `ACOMPANHE SEU USO.` |
| 0:14.5–0:22 | Working — hero moment | O mesmo widget sobe e ganha presença. Somente o anel do Cursor muda para o estado Working; cápsula e demais ícones permanecem totalmente opacos. A câmera executa um push-in dramático de 833 ms, mantendo o conjunto reconhecível. O enquadramento relaxa, o anel retorna a Idle e surge a resposta. Ao final, o próprio widget muda de vertical para horizontal e ocupa a primeira posição da galeria. | `SUA IA ESTÁ TRABALHANDO?` / `EM ATIVIDADE` / `VOCÊ SABE.` |
| 0:22–0:28 | Quatro temas | O primeiro widget já está presente desde a transformação anterior. Os outros três entram em sequência, todos com a mesma dimensão e ordem de ícones. Cada nome anima pelo mesmo princípio. Uma única linha roxa desliza de Monokai Black até Nord; não há troca ou duplicação do sublinhado. Ao final, os temas secundários saem e o primeiro widget cresce até o enquadramento da próxima cena. | `DO SEU JEITO.` / `MONOKAI BLACK` / `DARK` / `NORD` / `CATPPUCCIN MOCHA` |
| 0:28–0:31.5 | Benefício | O widget chega já em posição, sem reaparecer. A conclusão entra em duas batidas e a linha verde fecha a composição. Depois, o próprio produto viaja para o canto superior direito, preparando o encerramento. | `MENOS ABAS. MAIS FOCO.` |
| 0:31.5–0:37 | Encerramento | O widget atravessa o corte no mesmo tamanho e posição. Marca e promessa entram à esquerda. O popover real se abre horizontalmente a partir do produto; percentuais e barras se preenchem. O CTA entra por último e a composição permanece estável para leitura. | `SUAS IAS, À VISTA.` / `CONHEÇA O WIDOKEN →` |

## Direção de movimento

- O widget é persistente: não recebe fade completo para trocar estado, orientação ou cena.
- Somente elementos variáveis animam — anéis, barras, textos, painéis e tema. Cápsula e ícones permanecem opacos.
- Entradas usam 350–550 ms; saídas, 250–450 ms; mudanças de posição, 450–700 ms.
- As transformações horizontal ↔ vertical usam aceleração e desaceleração suaves; os ícones se reposicionam individualmente e nunca giram.
- Cursor, Claude e ChatGPT mantêm a mesma ordem; o botão Widoken permanece no final do conjunto.
- O popover nasce do lado do widget por máscara horizontal e recolhe pelo mesmo caminho.
- Working usa 33 capturas do anel real e um push-in de 833 ms. A mudança Idle → Working → Idle fica restrita ao anel do Cursor.
- Na galeria, os quatro temas reais aparecem na mesma linha. Todos os nomes usam a mesma animação e existe apenas um sublinhado, que desliza entre os destaques.
- Não há sombras, glow, elevação artificial, flashes, overshoot, movimentos elásticos ou saltos de escala.

## Continuidade obrigatória

Os seguintes cortes devem preservar exatamente a posição e a escala do widget no último e no primeiro quadro:

1. apresentação → uso;
2. uso → Working;
3. Working → temas;
4. temas → benefício;
5. benefício → CTA.

A auditoria final inclui cinco quadros ao redor de cada corte (`−2`, `−1`, `0`, `+1`, `+2`) para detectar piscadas, reaparecimentos, trocas de escala ou qualquer quadro vazio.

## Fidelidade de produto

Widgets, popovers, percentuais, ícones, temas e estados Working vêm de capturas do widget React real com dados demonstrativos coerentes. Nenhum provedor é redesenhado. Os quatro temas apresentados existem no seletor do Widoken: Monokai Black, Dark, Nord e Catppuccin Mocha.

Como ainda não há um endereço público definitivo confirmado no projeto, o CTA não exibe uma URL temporária. O link só deve ser incluído quando existir um destino oficial válido.

## Entrega

- Duração: **37 segundos**
- Formato: **1920 × 1080, 30 fps**
- Codec: **H.264 + AAC**
- Versão: **V10**
- Master: `ad-production/output/widoken-comercial-v10.mp4`
- Auditoria visual: `ad-production/output/v10-scenes` e `ad-production/output/v10-audit`

