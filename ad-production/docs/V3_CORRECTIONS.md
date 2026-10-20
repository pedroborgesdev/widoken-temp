# Widoken Comercial V3 — relatório de correções

## Entrega

- Composição: 1920×1080, 30 fps, 1401 frames, 46,7 s.
- Intro nova: 00:00,0–00:02,7.
- Conteúdo V2 preservado como referência; toda a V3 vive em `src/v3`.

## Comparativo por timestamp

| V2 | V3 | Correção |
|---:|---:|---|
| 00:00,0 | 00:02,7 | Tanque reconstruído em SVG único, esteiras contínuas e rodas integradas; formiga redesenhada e trajetória contínua. |
| 00:10,0 | 00:12,7 | Reveal circular gigante substituído por abertura lateral controlada; lockup agrupado. |
| 00:15,0–00:21,0 | 00:17,7–00:23,7 | Câmera horizontal termina com o widget inteiro visível, sem zoom destrutivo no corte. |
| 00:18,2–00:20,8 | 00:20,9–00:23,5 | Nova subseção animada apresenta os 11 temas oficiais em capturas reais, com nomes, entrada escalonada e saída coordenada de volta ao widget horizontal. |
| 00:27,0–00:31,0 | 00:29,7–00:33,7 | Tipografia reduzida e câmera reposicionada; saída coordenada em fundo branco. |
| 00:31,0–00:35,0 | 00:33,7–00:37,7 | Transição quase preta removida; tanque cruza em fundo branco; copy e widget ocupam áreas separadas. |
| 00:35,0–00:39,0 | 00:37,7–00:41,7 | Saída da frase feita como bloco, sem letras cortadas. |
| 00:39,0–00:44,0 | 00:41,7–00:46,7 | Logo entra como lockup único; assinatura, URL oficial e widget estabilizam antes do hold. |

## Auditoria

`npm run audit:v3` gera:

- `output/v3-audit/overview-*.jpg`: um frame rotulado a cada 0,5 s;
- `output/v3-audit/transitions-*.jpg`: ±0,2 s, ±0,1 s e frames imediatamente antes/depois de cada corte.

O URL exibido continua apontando para `github.com/pedroborgesdev/widoken/releases/latest`, coerente com o repositório do projeto.

## Validação final

- `tsc --noEmit`: aprovado.
- Render Remotion: aprovado, 1401/1401 frames.
- Vídeo: H.264, 1920×1080, 30 fps, `yuv420p`, BT.709.
- Áudio: AAC, -18,6 LUFS integrado, true peak -1,3 dBFS.
- Inspeção visual: folhas de contato de 0,5 s e de todos os cortes revisadas após o render final.
- A entrada, o hold e a saída internos da galeria de temas também foram incluídos na auditoria de transições.
- V2 preservada em `output/widoken-comercial-v2-1920x1080.mp4`.

## Pendências conhecidas

Nenhuma pendência crítica identificada. A V3 mantém deliberadamente as sombras já presentes nas capturas reais do widget; elas pertencem ao produto capturado e não foram redesenhadas ou alteradas.
