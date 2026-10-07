# SPEC.md — Desktop AI Usage Overlay

## 1. Visão do produto

O aplicativo será um **overlay desktop permanente e extremamente discreto** para acompanhar o consumo/limites de diferentes ferramentas e provedores de IA.

A proposta principal não é ser uma janela tradicional. O widget pode ficar livre sobre a tela ou se integrar visualmente a uma das bordas por encaixe magnético.

O aplicativo:

- fica sobre outras aplicações;
- tem fundo completamente transparente;
- não deve bloquear cliques no restante da tela;
- exibe um pequeno widget vertical livre ou encaixado à borda esquerda/direita;
- mostra os provedores configurados;
- representa visualmente o consumo de cada provedor;
- mostra detalhes do rate limit ao passar o mouse;
- permite mover o widget livremente nos dois eixos;
- permite encaixar o widget magneticamente em qualquer lateral;
- salva posição e configurações;
- possui estados para uso disponível, carregando, desconectado e indisponível.

A primeira versão deve focar em **monitoramento de usage + experiência do overlay**. Não adicionar chat, terminal, prompt box ou outras funcionalidades que não estejam no escopo.

---

# 2. Stack

Minha escolha seria:

```text
Electron
TypeScript

Renderer
├── React
├── Vite
└── TailwindCSS

Persistência
└── electron-store ou JSON tipado em userData

Testes
├── Vitest
└── Playwright + Electron

Build
├── electron-vite
└── electron-builder
```

Não usaria Next.js, backend web, banco de dados ou framework de estado grande.

A aplicação é local e pequena.

Para estado React, `useReducer` + Context já é suficiente. Se o projeto crescer bastante, pode migrar para Zustand.

---

# 3. Princípio arquitetural mais importante

## DUAS SUPERFÍCIES INDEPENDENTES

A aplicação possui uma `BrowserWindow` transparente para o widget e uma `BrowserWindow` normal para o dashboard. Elas compartilham apenas os serviços do processo principal e contratos IPC tipados.

Não criar janelas separadas para elementos internos do widget:

```text
LeftWindow
RightWindow
PopoverWindow
DragWindow
```

Popovers e drag targets continuam dentro da árvore React do widget. Dashboard e widget têm entrypoints, estado e preloads independentes.

```text
Electron Main
│
├── WidgetWindow
├── DashboardWindow
│
├── IPC
├── DisplayManager
├── InteractionRegionManager
├── Storage
└── ProviderManager
       │
       ▼
├── WidgetPreload ──► WidgetRenderer
│                    ├── OverlayRoot
│                    ├── Widget
│                    ├── UsagePopover
│                    └── SelectionGrid
│
└── DashboardPreload ──► DashboardRenderer
                         └── SettingsPanel
```

---

# 4. BrowserWindow

Não usar `fullscreen: true`.

A janela deve simplesmente ter o tamanho do monitor alvo.

Exemplo conceitual:

```ts
const display = screen.getPrimaryDisplay()

const overlay = new BrowserWindow({
  x: display.bounds.x,
  y: display.bounds.y,
  width: display.bounds.width,
  height: display.bounds.height,

  frame: false,
  transparent: true,
  resizable: false,
  movable: false,

  alwaysOnTop: true,
  skipTaskbar: true,
  fullscreenable: false,
  hasShadow: false,

  backgroundColor: '#00000000',

  show: false,

  webPreferences: {
    preload,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
})
```

Depois do renderer estar pronto:

```ts
overlay.showInactive()
```

para evitar roubar foco sem necessidade.

O Electron trabalha com coordenadas de display em DIP, inclusive fornecendo `bounds`, `workArea`, `scaleFactor` e eventos quando monitores ou suas métricas mudam. [Electron](https://www.electronjs.org/docs/latest/api/screen/?utm_source=chatgpt.com)

---

# 5. Click-through — solução recomendada

Aqui eu mudaria uma coisa importante em relação ao que discutimos inicialmente.

Para **Windows e Linux**, eu tentaria usar `BrowserWindow.setShape()` como arquitetura principal.

O Electron permite definir quais regiões retangulares da BrowserWindow realmente existem para desenho/interação. Fora dessas regiões, o mouse cai diretamente na aplicação que estiver embaixo. [Electron](https://www.electronjs.org/docs/latest/api/browser-window?utm_source=chatgpt.com)

Isso encaixa perfeitamente no seu projeto.

## Estado normal

A BrowserWindow continua sendo 1920×1080, 2560×1440 etc., mas a região interativa seria apenas:

```text
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                                      ┌────┐ │
│                                      │    │ │
│                                      │ UI │ │
│                                      │    │ │
│                                      └────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

O shape seria aproximadamente:

```ts
overlay.setShape([
  {
    x: widgetX,
    y: widgetY,
    width: widgetWidth,
    height: widgetHeight,
  }
])
```

Portanto:

```text
Widget → Electron recebe mouse

Restante da tela → clique passa para Chrome,
VS Code, jogo, desktop etc.
```

Isso é melhor do que deixar uma BrowserWindow fullscreen bloqueando tudo.

### Quando o popover abrir

Atualizar shape:

```text
[widget] [popover]
```

```ts
overlay.setShape([
  widgetBounds,
  popoverBounds,
])
```

### Quando configurações abrirem

```ts
overlay.setShape([
  widgetBounds,
  settingsBounds,
])
```

---

# 6. Durante drag

Aqui mudamos temporariamente o comportamento.

Quando o usuário segura o `grab`:

```text
NORMAL
  ↓
pointerDown
  ↓
DRAGGING
  ↓
BrowserWindow inteira fica interativa
  ↓
zonas azuis aparecem
```

Pode usar:

```ts
overlay.setShape([
  {
    x: 0,
    y: 0,
    width: windowWidth,
    height: windowHeight,
  }
])
```

Durante os poucos segundos de movimentação, bloquear o desktop é aceitável.

Ao soltar:

```text
pointerUp
   ↓
resolve docking
   ↓
salva posição
   ↓
esconde SelectionGrid
   ↓
restaura shape do widget
```

Isso elimina grande parte das complicações de mouse global.

---

# 7. Fallback para macOS

`setShape()` atualmente é exposto pelo Electron para Windows/Linux.

No macOS, o fallback pode usar:

```ts
win.setIgnoreMouseEvents()
```

O Electron suporta click-through com essa API, e o parâmetro `forward` permite receber movimento do mouse enquanto a janela está ignorando eventos em Windows/macOS. [Electron](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions?utm_source=chatgpt.com)

Eu faria suporte macOS **depois do MVP**.

---

# 8. Atenção especial ao Linux/Wayland

Isso precisa estar explicitamente documentado para a IA.

Wayland limita bastante justamente as operações que esse app precisa: posicionamento programático, `alwaysOnTop`, leitura global da posição do cursor e outras ações sobre janelas têm restrições. A própria documentação do Electron sugere Xwayland com `--ozone-platform=x11` quando o app precisa dessas capacidades. [Electron](https://www.electronjs.org/docs/latest/api/browser-window?utm_source=chatgpt.com)

Portanto, eu definiria oficialmente:

```text
V1
✅ Windows
✅ Linux X11
✅ Linux XWayland

Posteriormente
⚠️ macOS

Não garantido inicialmente
❌ Wayland nativo
```

Isso evita a IA passar três dias tentando fazer algo que o compositor simplesmente não permite de forma confiável.

---

# 9. Monitor

Mesmo usando uma BrowserWindow, não tente resolver multi-monitor na primeira implementação.

## V1

```text
1 BrowserWindow
1 monitor alvo
```

Inicialmente:

```ts
screen.getPrimaryDisplay()
```

Posteriormente pode existir:

```text
Settings
└── Display
    ├── Monitor 1
    └── Monitor 2
```

Salve:

```ts
displayId
```

e escute:

```text
display-added
display-removed
display-metrics-changed
```

que o Electron já fornece. [Electron](https://www.electronjs.org/docs/latest/api/screen/?utm_source=chatgpt.com)

---

# 10. Estado principal do overlay

Eu modelaria explicitamente:

```ts
type OverlayMode =
  | 'passive'
  | 'provider-hover'
  | 'dragging'
  | 'settings'
```

Não espalhar dezenas de `boolean`.

Evitar:

```ts
isDragging
isHovering
isSettings
isPopover
isMoving
```

porque eventualmente estados incompatíveis aparecem simultaneamente.

Ter:

```ts
overlayMode: OverlayMode
```

deixa a aplicação previsível.

---

# 11. Estrutura do Figma

A IA deve receber o link do Figma que você enviou e ser instruída a consultar principalmente estes nodes:

```text
9:266
widgets variants

9:7
widget (4 items)

9:142
widget (3 items)

9:192
widget (2 items)

9:232
widget (1 item)

9:269
opened usage (provider hover)

9:371
successful provider usage hover

9:375
unavailable provider hover

10:6
selection grids

10:116
left selection grid

10:7
right selection grid
```

Isso é muito importante porque evita que o agente fique navegando aleatoriamente pelo canvas.

---

# 12. Widget

O design não deve ser implementado como quatro componentes diferentes.

O Figma mostra as variantes para demonstrar o comportamento.

Implementação:

```tsx
<Widget providers={providers} />
```

e a altura é dinâmica.

Do Figma:

```text
1 provider → 36 × 60
2 providers → 36 × 92
3 providers → 36 × 124
4 providers → 36 × 156
```

Portanto:

```ts
widgetHeight = 28 + providers.length * 32
```

A área principal interna segue:

```ts
boardHeight = 4 + providers.length * 32
```

---

# 13. Estrutura visual do widget

Node principal de referência:

```text
9:7
```

Estrutura:

```text
Widget
│
├── Body
│   ├── thumbs
│   └── board
│
└── Items
    ├── Providers
    │   ├── ProviderItem
    │   ├── ProviderItem
    │   ├── ProviderItem
    │   └── ProviderItem
    │
    └── Controls
        ├── Gear
        └── Grab
```

Dimensões principais:

```text
Widget width
36px

Provider slot
28 × 28px

Provider vertical pitch
32px

Provider icon container
24 × 24px

Provider logos
≈ 20 × 20px

Antigravity
≈ 22 × 22px

Gear
10 × 10px

Grab
14 × 6px
```

---

# 14. Cores do Figma

Foram encontradas diretamente no arquivo:

```css
--widget-thumb: #101010;
--widget-surface: #171717;

--usage-track: #4B4B4B;

--usage-green: #82AD61;
--usage-orange: #F39038;
--usage-red: #EB4949;

--muted-text: #6A6A6A;
```

Transformar isso em design tokens.

Tailwind:

```ts
colors: {
  overlay: {
    thumb: '#101010',
    surface: '#171717',
    track: '#4B4B4B',
    success: '#82AD61',
    warning: '#F39038',
    danger: '#EB4949',
    muted: '#6A6A6A',
  },
}
```

Não deixar hex espalhado por componentes.

---

# 15. Fonte

O Figma usa:

```text
Iosevka Charon Regular
```

Se ela for usada no produto final, verificar licença/distribuição e incluí-la corretamente no aplicativo.

Durante desenvolvimento pode haver fallback:

```css
font-family:
  "Iosevka Charon",
  "Iosevka",
  monospace;
```

A IA não deve substituir silenciosamente a tipografia por Inter/Roboto.

---

# 16. ProviderItem

Cada item será:

```tsx
<ProviderItem
  provider={provider}
  usage={usage}
/>
```

Estrutura:

```text
28 × 28
│
├── background/ring
├── usage progress ring
└── icon
```

O anel externo **não é decorativo**.

Ele representa usage.

Portanto não implementar isso como:

```css
border: 2px solid orange;
```

Deve ser um progresso real.

Eu usaria SVG:

```tsx
<svg>
  <circle className="track" />
  <circle
    className="usage"
    strokeDasharray={...}
    strokeDashoffset={...}
  />
</svg>
```

---

# 17. Regra de cores

O próprio Figma já especifica:

```text
usage < 50%
→ #82AD61

usage >= 50% && < 75%
→ #F39038

usage >= 75%
→ #EB4949
```

Centralizar isso:

```ts
function getUsageSeverity(percent: number) {
  if (percent >= 75) return 'danger'
  if (percent >= 50) return 'warning'
  return 'success'
}
```

---

# 18. Provider model

Não acoplar React diretamente a Claude/OpenAI/Cursor.

Criar interface:

```ts
interface ProviderAdapter {
  id: string

  connect(): Promise<void>
  disconnect(): Promise<void>

  getUsage(): Promise<ProviderSnapshot>

  isConnected(): Promise<boolean>
}
```

Modelo:

```ts
type ProviderStatus =
  | 'loading'
  | 'connected'
  | 'disconnected'
  | 'unavailable'
  | 'error'

interface UsageLimit {
  id: string
  label: string
  percent: number
  resetsAt?: string
}

interface ProviderSnapshot {
  providerId: string

  status: ProviderStatus

  limits: UsageLimit[]

  lastUpdatedAt: string

  error?: string
}
```

---

# 19. Summary usage

Como um provider pode possuir:

```text
5-hour limit → 72%
weekly → 34%
```

o widget precisa de **um número resumido** para o ring.

Minha regra para V1 seria:

```ts
summaryUsage = Math.max(
  ...limits.map(limit => limit.percent)
)
```

Assim, o ring mostra o limite mais próximo de acabar.

Popover continua mostrando todos.

---

# 20. Provider integrations

Criar:

```text
providers/
├── types.ts
├── registry.ts
│
├── claude/
│   └── adapter.ts
│
├── openai/
│   └── adapter.ts
│
├── cursor/
│   └── adapter.ts
│
└── antigravity/
    └── adapter.ts
```

A UI não deve saber de onde a informação veio.

Ela simplesmente recebe:

```json
{
  "providerId": "claude",
  "status": "connected",
  "limits": [
    {
      "label": "5 hours rate limit",
      "percent": 68,
      "resetsAt": "..."
    },
    {
      "label": "Week rate limit",
      "percent": 31,
      "resetsAt": "..."
    }
  ]
}
```

Isso é crucial porque a forma de obter usage de cada serviço provavelmente será diferente e pode mudar.

---

# 21. Autenticação

Não misturar credenciais com UI.

Fluxo:

```text
ProviderAdapter
      ↓
CredentialStore
      ↓
Electron Main
```

Nunca:

```text
React → lê token do disco
```

O renderer não deve receber segredos se não precisar.

Se houver credenciais persistidas, usar armazenamento protegido pelo sistema operacional quando possível.

Também não fazer captura automática de senha/cookies de navegador sem consentimento explícito.

---

# 22. Polling

Criar um `ProviderManager`.

Exemplo:

```text
startup
  ↓
load enabled providers
  ↓
fetch immediately
  ↓
wait
  ↓
fetch periodically
```

Algo como:

```text
normal
30–60 segundos

erro
backoff progressivo

offline
backoff maior
```

Não fazer request a cada hover.

Hover só mostra o snapshot atual.

Pode solicitar refresh se o snapshot estiver velho.

---

# 23. Hover — estado normal

Figma:

```text
node 9:371
```

Dimensão:

```text
160 × 58px
```

background:

```text
#171717
```

radius:

```text
4px
```

Padding aproximadamente:

```text
horizontal: 8px
vertical: 6px
```

Cada limite:

```text
label
usage bar
reset information
```

Exatamente como:

```text
5 hours rate limit
████████████░░░░░░
Resets in: ...

Week rate limit
██████░░░░░░░░░░░
Resets in: ...
```

---

# 24. Barra do popover

Figma:

```text
width: 144px
height: 4px

border-radius: 999px

track:
#4B4B4B
```

O preenchimento:

```ts
width = percent / 100 * 144
```

com as cores descritas anteriormente.

---

# 25. Posição do popover

Se o widget estiver na esquerda:

```text
[Widget] 4px [Popover]
```

Se estiver na direita:

```text
[Popover] 4px [Widget]
```

Portanto:

```ts
side === 'left'
  ? openRight
  : openLeft
```

Ele deve ficar verticalmente associado ao provider em hover.

---

# 26. Unavailable state

Node:

```text
9:375
```

Dimensão:

```text
160 × 33px
```

Conteúdo:

```text
Unavailable status

Failed to get token usage.
Connect at the provider and try again.
```

Esse estado é diferente de simplesmente:

```text
0%
```

Nunca transformar falha em usage zero.

---

# 27. Estados adicionais necessários

Mesmo que ainda não estejam todos desenhados, a lógica deve suportar:

```ts
'loading'
'connected'
'disconnected'
'unavailable'
'error'
```

Sugestão:

```text
loading
→ ring neutro

disconnected
→ ring neutro + connect message

unavailable/error
→ error popover

connected
→ usage normal
```

A IA não deve inventar visuais elaborados para estados que ainda não estão no Figma.

Pode usar comportamento mínimo até você desenhá-los.

---

# 28. Drag

**Somente o grab inicia movimentação.**

Não permitir arrastar o widget segurando um provider, porque isso conflitaria com hover/click.

Fluxo:

```text
pointerdown grab
        ↓
setPointerCapture
        ↓
overlayMode = dragging
        ↓
expand interaction region
        ↓
show SelectionGrid
        ↓
pointermove
        ↓
widget preview acompanha X e Y
        ↓
aplica margem mínima de 8px
        ↓
encaixa magneticamente se entrar em uma lateral
        ↓
pointerup
        ↓
resolve target
        ↓
persist position
        ↓
overlayMode = passive
```

---

# 29. Selection Grid

Node:

```text
10:6
```

Existem dois grupos:

```text
Left
Right
```

Cada grupo é simplificado para uma única coluna:

```text
54px de largura
```

Cada coluna representa a região vertical de docking do widget. Ela ocupa a altura disponível com margem de 8px no topo, na base e na lateral.

Manter conforme o Figma:

- estilo;
- transparência;
- dashed border;
- radius;

Remover a segunda faixa e a seta. A altura útil é `calc(100vh - 16px)`.

Não redesenhar baseado apenas nesta documentação.

---

# 30. Comportamento das zonas

Eu documentaria assim para não deixar ambíguo para a IA:

Cada lado possui uma única zona magnética de 54px.

Ao entrar nessa zona durante o drag:

```text
left group  → preview encaixa à esquerda com margem de 8px
right group → preview encaixa à direita com margem de 8px
```

Soltar dentro da zona persiste `docked = true` e o respectivo `side`. Soltar fora dela mantém a posição livre nos dois eixos e persiste `docked = false`.

---

# 31. Posição livre

Não salvar coordenadas absolutas:

```json
{
  "x": 920,
  "y": 428
}
```

Salvar as duas coordenadas normalizadas:

```json
{
  "horizontalPosition": 0.48,
  "verticalPosition": 0.41
}
```

Onde:

```ts
0 = topo
1 = base
```

Cálculo:

```ts
horizontalRatio =
  (widgetX - margin) /
  (workAreaWidth - widgetWidth - 2 * margin)

verticalRatio =
  (widgetY - margin) /
  (workAreaHeight - widgetHeight - 2 * margin)
```

Assim, se:

```text
1080p → 1440p
```

o widget continua aproximadamente no mesmo lugar, sempre a pelo menos 8px dos cantos.

---

# 32. Persistência

Configuração:

```ts
interface AppSettings {
  widget: {
    docked: boolean
    horizontalPosition: number
    side: 'left' | 'right'
    verticalPosition: number
  }

  display?: {
    id: number
  }

  providers: {
    id: string
    enabled: boolean
    order: number
  }[]

  refreshIntervalSeconds: number

  launchAtStartup: boolean
}
```

Salvar após mudanças relevantes.

---

# 33. Settings

O gear já existe no Figma.

Mas a tela de configuração **ainda não está definida no design**.

Portanto instruir a IA:

> Não inventar uma interface final de configurações.

V1 pode ter painel funcional simples com:

```text
Providers
├── Claude
├── ChatGPT
├── Cursor
└── Antigravity

Refresh interval

Launch at startup

Display

About

Quit
```

Depois você desenha o painel no Figma e troca.

---

# 34. Reordenação dos providers

Eu deixaria preparada a estrutura, mas **não implementaria drag de provider individual no primeiro MVP**, porque conflita visualmente com o drag do widget.

A ordem pode inicialmente ser alterada nas configurações.

---

# 35. IPC

Preload deve expor uma API mínima.

Por exemplo:

```ts
window.widgetDesktop = {
  overlay: {
    startDragging(),
    endDragging(),
    setInteractionRegions(regions),
  },

  providers: {
    list(),
    refresh(id),
    connect(id),
    disconnect(id),
  },

  settings: {
    get(),
    update(),
  },

  dashboard: {
    open(),
  },
}

window.dashboardDesktop = {
  providers: { list(), refresh(id) },
  settings: { get(), update() },
  dashboard: { close(), minimize() },
  themes: { syncVsCode() },
  app: { quit() },
}
```

Renderer nunca deve ter:

```ts
ipcRenderer
fs
child_process
process
```

expostos diretamente.

---

# 36. Segurança Electron

Manter:

```ts
contextIsolation: true
nodeIntegration: false
sandbox: true
```

e usar:

```ts
contextBridge.exposeInMainWorld(...)
```

Todos os IPCs devem validar payload.

Não usar:

```ts
ipcRenderer.send(channelFromUser)
```

genérico.

Criar channels específicos.

---

# 37. Estrutura de projeto

Eu entregaria para a IA exatamente esta sugestão:

```text
src/
├── main/
│   ├── index.ts
│   ├── application/AppController.ts
│   ├── windows/
│   │   ├── WidgetWindowManager.ts
│   │   └── DashboardWindowManager.ts
│   │
│   ├── window/
│   │   ├── createOverlayWindow.ts
│   │   ├── interactionRegions.ts
│   │   └── displays.ts
│   │
│   ├── providers/
│   │   ├── ProviderAdapter.ts
│   │   ├── ProviderManager.ts
│   │   ├── registry.ts
│   │   │
│   │   ├── claude/
│   │   ├── openai/
│   │   ├── cursor/
│   │   └── antigravity/
│   │
│   ├── settings/
│   │   └── SettingsRepository.ts
│   │
│   └── ipc/
│       ├── overlay.ipc.ts
│       ├── providers.ipc.ts
│       └── settings.ipc.ts
│
├── preload/
│   ├── widget.ts
│   └── dashboard.ts
│
├── renderer/
│   ├── widget/
│   │   ├── main.tsx
│   │   ├── WidgetApp.tsx
│   │   └── state/
│   ├── dashboard/
│   │   ├── main.tsx
│   │   ├── DashboardApp.tsx
│   │   └── state/
│   ├── App.tsx
│   │
│   ├── components/
│   │   ├── Widget/
│   │   │   ├── Widget.tsx
│   │   │   ├── ProviderItem.tsx
│   │   │   ├── UsageRing.tsx
│   │   │   ├── GearButton.tsx
│   │   │   └── GrabHandle.tsx
│   │   │
│   │   ├── UsagePopover/
│   │   │   ├── UsagePopover.tsx
│   │   │   ├── UsageBar.tsx
│   │   │   └── UnavailablePopover.tsx
│   │   │
│   │   ├── SelectionGrid/
│   │   │   ├── SelectionGrid.tsx
│   │   │   └── DropZone.tsx
│   │   │
│   │   └── Settings/
│   │
│   ├── hooks/
│   │   ├── useProviders.ts
│   │   └── useWidgetPosition.ts
│   │
│   ├── assets/
│   │   └── providers/
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   └── types/
│
└── shared/
    ├── ipc.ts
    ├── provider.ts
    └── settings.ts
```

---

# 38. Assets do Figma

A IA deverá obter os assets originais através do Figma.

Não:

```text
screenshot.png
↓
recortar logos
```

E não deixar no projeto URLs temporárias dos assets do MCP do Figma, porque esses links expiram.

Copiar para:

```text
src/renderer/assets/
```

Os logos e elementos estáticos devem ser locais.

Já os elementos que representam dados — ring e barras de usage — devem ser **dinâmicos**, embora visualmente idênticos ao Figma.

---

# 39. Não transformar o Figma inteiro em absolute positioning

O Figma MCP tende a devolver coisas como:

```tsx
absolute left-[...] top-[...]
```

Isso é referência visual, não arquitetura final.

Permitido:

```text
position: fixed
```

para posicionar o widget em relação à tela.

Mas internamente:

```text
Widget
ProviderList
Popover
```

devem usar layout normal, flex/grid quando possível.

Não copiar coordenadas absolutas do canvas inteiro.

---

# 40. Ordem de implementação

Eu faria exatamente nesta sequência:

### Fase 1 — Bootstrap

Criar:

```text
Electron
React
TypeScript
Vite
Tailwind
```

Abrir uma BrowserWindow normal primeiro.

Nada de providers ainda.

### Fase 2 — Overlay

Implementar:

```text
transparent
frameless
alwaysOnTop
monitor bounds
showInactive
```

Testar:

```text
desktop visível por baixo
```

### Fase 3 — Interaction regions

Implementar:

```text
setShape()
```

Validar que:

```text
widget recebe clique
desktop ao redor recebe clique
```

**Não avançar antes disso funcionar.**

### Fase 4 — Widget Figma

Implementar com dados fake:

```text
Claude 23%
ChatGPT 55%
Cursor 80%
Antigravity unavailable
```

Visual precisa bater com Figma.

### Fase 5 — Hover

Implementar:

```text
success popover
error popover
position by side
interaction shape extension
```

### Fase 6 — Drag

Implementar:

```text
grab
pointer capture
SelectionGrid
free X/Y movement
full-height left/right zones
magnetic snap
8px boundary margin
```

### Fase 7 — Persistência

Salvar:

```text
docked
side
horizontalPosition
verticalPosition
provider order
```

Reiniciar app e verificar restauração.

### Fase 8 — Provider abstraction

Implementar:

```text
ProviderAdapter
ProviderManager
MockProviderAdapter
```

Ainda usar fake data.

### Fase 9 — Integração real

Só agora:

```text
Claude
OpenAI
Cursor
Antigravity
```

um por vez.

### Fase 10 — Settings

Conexões, providers habilitados, refresh etc.

### Fase 11 — Tray

Opcionalmente:

```text
Show/Hide
Settings
Refresh
Quit
```

Tray não cria outra BrowserWindow.

### Fase 12 — Packaging

Gerar:

```text
Windows installer
Linux AppImage/deb
```

---

# 41. Por que provider real vem tão tarde?

Porque os dois problemas difíceis são independentes:

```text
problema A
overlay desktop

problema B
coletar usage dos providers
```

Se tentar resolver os dois simultaneamente, quando alguma coisa quebrar você não saberá se o problema está:

```text
Electron
React
mouse
window shape
auth
API
provider
polling
```

Primeiro deixe o produto funcionando perfeitamente com mock.

Depois substitua:

```ts
MockProvider
```

por:

```ts
ClaudeProvider
```

---

# 42. Testes unitários

Testar pelo menos:

```text
usage color

42 → green
50 → orange
74 → orange
75 → red
100 → red

summaryUsage

[20, 30] → 30
[10, 88] → 88

widget height

1 → 60
2 → 92
3 → 124
4 → 156

horizontal and vertical position normalization

side switching

magnetic docking

provider errors
```

---

# 43. Testes Electron

Usaria Playwright Electron para testar fluxos.

Exemplo:

```text
open app

widget visible
→ yes

click widget
→ works

click area outside
→ reaches underlying OS manually tested

hover Claude
→ popover

hover unavailable provider
→ unavailable popover

drag
→ blue zones

drop left
→ widget left

restart
→ widget still left
```

Parte de click-through precisará de testes manuais porque envolve outra aplicação do SO.

---

# 44. Matriz manual

Antes de release:

```text
1920×1080 100%
2560×1440 100%
1920×1080 125%
2560×1440 150%

widget left
widget right

widget near top
widget center
widget near bottom

1 provider
2 providers
3 providers
4 providers

provider healthy
provider high usage
provider unavailable

app startup
monitor resolution change
sleep/wake
provider network failure
```

---

# 45. Performance

O renderer praticamente não faz nada.

Não deve existir:

```text
requestAnimationFrame permanente
mouse polling permanente
render loop
canvas loop
```

Normalmente:

```text
React parado
+
timer de providers
```

Durante drag:

```text
pointermove
```

E acabou.

Isso deve manter CPU quase zerada quando o usuário não interage.

---

# 46. Regras de animação

O Figma atual não define motion detalhado.

Então evitar animações exageradas.

Sugestão:

```text
Popover enter
opacity + translate
120–160ms

Drop zones
opacity
120ms

Widget snap
transform
150–200ms

Dragging
sem transition
```

Nunca aplicar transition na posição enquanto o usuário está arrastando.

---

# 47. Definition of Done do MVP

Eu consideraria a primeira versão realmente pronta quando isto estiver funcionando:

```text
[✓] uma BrowserWindow
[✓] transparente
[✓] frameless
[✓] always-on-top
[✓] desktop clicável ao redor
[✓] widget baseado exatamente no Figma
[✓] 1–4 providers dinâmicos
[✓] usage rings dinâmicos
[✓] hover usage
[✓] unavailable state
[✓] drag pelo grab
[✓] selection grids
[✓] dock left/right
[✓] posição livre X/Y
[✓] margem de 8px nas bordas
[✓] persistência
[✓] adapters desacoplados
[✓] pelo menos um provider real
[✓] tratamento de falha
[✓] build instalável
```

Só depois eu adicionaria funcionalidades extras.

---

# 48. Documentos que devem existir no repositório

Eu mandaria a IA criar:

```text
README.md

docs/
├── ARCHITECTURE.md
├── FIGMA_MAPPING.md
├── OVERLAY_BEHAVIOR.md
├── PROVIDER_ADAPTERS.md
├── PLATFORM_SUPPORT.md
├── SECURITY.md
└── TESTING.md
```

O `FIGMA_MAPPING.md` particularmente deve mapear:

```text
React component
↕
Figma node
```

por exemplo:

```text
Widget
→ 9:7

UsagePopover
→ 9:371

UnavailablePopover
→ 9:375

SelectionGrid
→ 10:6
```

Isso vai ser muito útil meses depois.

---

# 49. Prompt que eu entregaria para a IA desenvolvedora

Junto com o Figma e esta documentação, eu começaria o agente com algo nessa linha:

> Desenvolva este projeto como um aplicativo desktop Electron usando TypeScript, React, Vite e TailwindCSS.
>
> Leia integralmente o `SPEC.md` antes de modificar qualquer arquivo.
>
> O Figma fornecido é a fonte de verdade visual. Inspecione diretamente os nodes indicados no `FIGMA_MAPPING.md`. Não tente reproduzir o design apenas pela screenshot ou pelo texto da especificação.
>
> O aplicativo deve possuir somente uma BrowserWindow. Ela ocupa o monitor inteiro, é frameless, transparente e always-on-top, mas o restante da tela deve continuar interativo com os aplicativos abaixo dela.
>
> Para Windows/Linux, utilize regiões de interação da BrowserWindow conforme descrito na arquitetura. Durante dragging, a janela inteira pode temporariamente tornar-se interativa.
>
> Implemente inicialmente tudo com providers mockados. Não implemente integrações reais com Claude, OpenAI, Cursor ou Antigravity até que o overlay, click-through, widget, hover, drag, docking e persistência estejam completos e funcionando.
>
> Não crie uma versão React separada para cada quantidade de providers. O Widget deve ser dinâmico.
>
> Não use screenshots do Figma como UI. Utilize os assets originais e implemente os elementos dinâmicos, como usage rings e progress bars, programaticamente.
>
> Não deixe URLs temporárias de assets do Figma no código final.
>
> Não invente novas interfaces, funcionalidades ou estilos que não estejam documentados. Quando algo não possuir design definido, implemente apenas o mínimo funcional e registre o ponto como pendente.
>
> Faça a implementação por etapas e valide cada fase antes de seguir para a próxima.

## O ponto técnico que eu considero decisivo

Depois de olhar o Figma com mais detalhe e conferir o comportamento atual do Electron, eu faria **uma BrowserWindow fullscreen transparente + `setShape()` para limitar as regiões interativas no Windows/Linux**.

Isso resolve elegantemente justamente a preocupação que você teve:

```text
"se a janela cobre tudo,
como eu deixo o resto invisível/clicável?"
```

Normalmente ela é:

```text
BrowserWindow gigante
+
shape minúsculo no widget
```

e no instante em que você segura o grab:

```text
shape minúsculo
      ↓
shape fullscreen
      ↓
aparecem suas duas colunas azuis
      ↓
drag
      ↓
drop
      ↓
shape volta para o widget
```

É praticamente a arquitetura que o seu design está pedindo. E separar **overlay → UI → provider adapters** desde o começo vai impedir que a parte complicada de coletar usage transforme o projeto inteiro numa bagunça.
