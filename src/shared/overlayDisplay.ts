export interface OverlayPlacement {
  displayId?: number
  home: boolean
}

export interface DisplayRect {
  id: number
  x: number
  y: number
  width: number
  height: number
}

export interface OverlayLayout {
  caption: string
  x: number
  y: number
  width: number
  height: number
}

const OVERLAY_TITLE_PREFIX = 'Widoken Widget'

export const WIDGET_OVERLAY_TITLE = OVERLAY_TITLE_PREFIX

export function overlayWindowTitle(displayId: number): string {
  return `${OVERLAY_TITLE_PREFIX} ${displayId}`
}

export function displayIdFromOverlayTitle(title: string): number | undefined {
  if (title.startsWith(`${OVERLAY_TITLE_PREFIX} `)) {
    const id = Number(title.slice(OVERLAY_TITLE_PREFIX.length + 1))
    return Number.isInteger(id) && id >= 0 ? id : undefined
  }
  if (title.startsWith('widoken overlay ')) {
    const id = Number(title.slice('widoken overlay '.length))
    return Number.isInteger(id) && id >= 0 ? id : undefined
  }
  return undefined
}

export function widgetLivesOnDisplay(
  settings: { display?: { id: number } },
  placement: OverlayPlacement
): boolean {
  if (placement.displayId == null) return true
  if (settings.display?.id != null) return settings.display.id === placement.displayId
  return placement.home
}

export function displayForPoint(displays: DisplayRect[], x: number, y: number): DisplayRect | undefined {
  if (displays.length === 0 || !Number.isFinite(x) || !Number.isFinite(y)) return undefined

  const inside = displays.find((display) =>
    x >= display.x &&
    y >= display.y &&
    x < display.x + display.width &&
    y < display.y + display.height
  )
  if (inside) return inside

  let nearest: DisplayRect | undefined
  let nearestDistance = Infinity
  for (const display of displays) {
    const nearestX = Math.min(Math.max(x, display.x), display.x + display.width)
    const nearestY = Math.min(Math.max(y, display.y), display.y + display.height)
    const distance = (x - nearestX) ** 2 + (y - nearestY) ** 2
    if (distance < nearestDistance) {
      nearest = display
      nearestDistance = distance
    }
  }
  return nearest
}

export function serializeOverlayLayouts(layouts: OverlayLayout[]): string {
  return layouts
    .map((layout) => [layout.caption, layout.x, layout.y, layout.width, layout.height].join('|'))
    .join(';')
}

export function unionBounds(rects: Array<{ x: number, y: number, width: number, height: number }>): { x: number, y: number, width: number, height: number } | undefined {
  if (rects.length === 0) return undefined
  const x = Math.min(...rects.map((rect) => rect.x))
  const y = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  return { x, y, width: right - x, height: bottom - y }
}

export function serializeDisplayRects(displays: DisplayRect[]): string {
  return displays.map((display) => [display.id, display.x, display.y, display.width, display.height].join(',')).join(';')
}

export function parseDisplayRects(value: string | null | undefined): DisplayRect[] {
  if (!value) return []
  return value.split(';').flatMap((part) => {
    const [id, x, y, width, height] = part.split(',').map(Number)
    if (![id, x, y, width, height].every((item) => Number.isFinite(item))) return []
    if (width <= 0 || height <= 0) return []
    return [{ id, x, y, width, height }]
  })
}
