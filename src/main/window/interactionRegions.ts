import type { BrowserWindow, Point, Rectangle } from 'electron'
import { isNativeWayland } from './platform'
import {
  createInteractionRegionAdapter,
  globalPointIsInsideRegions,
  pointIsInsideRegions
} from './interactionRegionAdapters'

const adapter = createInteractionRegionAdapter(process.platform, isNativeWayland())

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
  adapter.registerDisplay(window, displayBounds)
}

export function updateInteractionWindowBounds(window: BrowserWindow, windowBounds: Rectangle): void {
  adapter.updateWindowBounds(window, windowBounds)
}

export function applyInteractionRegions(window: BrowserWindow, regions: Rectangle[], paintOutset = 0): void {
  adapter.applyRegions(window, regions, paintOutset)
}

export function updateInteractionCursor(window: BrowserWindow, cursor: Point): void {
  adapter.updateCursor(window, cursor)
}

export function makeWindowFullyInteractive(window: BrowserWindow): void {
  adapter.makeFullyInteractive(window)
}

export function endFullInteraction(window: BrowserWindow): void {
  adapter.endFullInteraction(window)
}

export { globalPointIsInsideRegions, pointIsInsideRegions }
