import type { BrowserWindow, Point, Rectangle } from 'electron'
import { isNativeWayland } from './platform'

interface WaylandInteractionState {
  cursor?: Point
  displayBounds: Rectangle
  ignoringMouse?: boolean
  regions: Rectangle[]
}

const waylandStates = new WeakMap<BrowserWindow, WaylandInteractionState>()

export function sanitizeRegions(regions: unknown, bounds: Rectangle): Rectangle[] {
  if (!Array.isArray(regions) || regions.length > 12) return []

  return regions.flatMap((region) => {
    if (!region || typeof region !== 'object') return []
    const candidate = region as Partial<Rectangle>
    const values = [candidate.x, candidate.y, candidate.width, candidate.height]
    if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) return []

    const x = Math.max(0, Math.round(candidate.x!))
    const y = Math.max(0, Math.round(candidate.y!))
    const width = Math.min(bounds.width - x, Math.max(1, Math.round(candidate.width!)))
    const height = Math.min(bounds.height - y, Math.max(1, Math.round(candidate.height!)))
    if (width <= 0 || height <= 0) return []
    return [{ x, y, width, height }]
  })
}

export function registerInteractionDisplay(window: BrowserWindow, displayBounds: Rectangle): void {
  waylandStates.set(window, { displayBounds, regions: [] })
}

export function updateInteractionWindowBounds(window: BrowserWindow, windowBounds: Rectangle): void {
  const state = waylandStates.get(window)
  if (!state) return
  state.displayBounds = windowBounds
  updateWaylandMousePassthrough(window, state)
}

export function applyInteractionRegions(window: BrowserWindow, regions: Rectangle[]): void {
  if (isNativeWayland()) {
    const state = waylandStates.get(window)
    if (!state) {
      window.setIgnoreMouseEvents(false)
      return
    }
    state.regions = regions
    updateWaylandMousePassthrough(window, state)
    return
  }

  if (process.platform === 'win32' || process.platform === 'linux') {
    window.setIgnoreMouseEvents(false)
    window.setShape(regions)
    return
  }

  // macOS support remains a post-MVP target.
  window.setIgnoreMouseEvents(regions.length === 0, { forward: true })
}

export function updateWaylandCursor(window: BrowserWindow, cursor: Point): void {
  const state = waylandStates.get(window)
  if (!state) return
  state.cursor = cursor
  updateWaylandMousePassthrough(window, state)
}

function updateWaylandMousePassthrough(window: BrowserWindow, state: WaylandInteractionState): void {
  if (window.isDestroyed()) return
  if (!state.cursor) {
    window.setIgnoreMouseEvents(false)
    state.ignoringMouse = false
    return
  }

  const shouldIgnoreMouse = !globalPointIsInsideRegions(state.cursor, state.displayBounds, state.regions)
  if (state.ignoringMouse === shouldIgnoreMouse) return
  state.ignoringMouse = shouldIgnoreMouse
  window.setIgnoreMouseEvents(shouldIgnoreMouse)
  if (process.env.WIDOKEN_DEBUG_CURSOR === '1') {
    console.log(`Wayland mouse passthrough: ${shouldIgnoreMouse ? 'on' : 'off'}`)
  }
}

export function makeWindowFullyInteractive(window: BrowserWindow): void {
  if (isNativeWayland()) {
    const state = waylandStates.get(window)
    if (state) {
      applyInteractionRegions(window, [
        { x: 0, y: 0, width: state.displayBounds.width, height: state.displayBounds.height }
      ])
      return
    }
  }

  const [width, height] = window.getContentSize()
  applyInteractionRegions(window, [{ x: 0, y: 0, width, height }])
}

export function pointIsInsideRegions(point: Point, regions: Rectangle[]): boolean {
  return regions.some(
    (region) =>
      point.x >= region.x &&
      point.x < region.x + region.width &&
      point.y >= region.y &&
      point.y < region.y + region.height
  )
}

export function globalPointIsInsideRegions(
  point: Point,
  displayBounds: Rectangle,
  regions: Rectangle[]
): boolean {
  return pointIsInsideRegions(
    { x: point.x - displayBounds.x, y: point.y - displayBounds.y },
    regions
  )
}
