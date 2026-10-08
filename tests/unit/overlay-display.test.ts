import { describe, expect, it } from 'vitest'
import {
  displayForPoint,
  displayIdFromOverlayTitle,
  overlayWindowTitle,
  parseDisplayRects,
  serializeDisplayRects,
  serializeOverlayLayouts,
  unionBounds,
  widgetLivesOnDisplay
} from '../../src/shared/overlayDisplay'

describe('overlay displays', () => {
  const left = { id: 1, x: 0, y: 0, width: 1920, height: 1080 }
  const right = { id: 2, x: 1920, y: 0, width: 1920, height: 1080 }

  it('keeps a point on the shared edge with the display that starts there', () => {
    expect(displayForPoint([left, right], 1919, 10)?.id).toBe(1)
    expect(displayForPoint([left, right], 1920, 10)?.id).toBe(2)
  })

  it('uses the nearest display when the pointer is outside every screen', () => {
    expect(displayForPoint([left, right], 5000, 100)?.id).toBe(2)
    expect(displayForPoint([], 0, 0)).toBeUndefined()
  })

  it('shows the widget on the saved display, or the home display before one is saved', () => {
    expect(widgetLivesOnDisplay({ display: { id: 2 } }, { displayId: 2, home: false })).toBe(true)
    expect(widgetLivesOnDisplay({ display: { id: 2 } }, { displayId: 1, home: true })).toBe(false)
    expect(widgetLivesOnDisplay({}, { displayId: 1, home: true })).toBe(true)
    expect(widgetLivesOnDisplay({}, { displayId: 1, home: false })).toBe(false)
    expect(widgetLivesOnDisplay({}, { home: false })).toBe(true)
  })

  it('covers every display with one window, including a monitor above the primary', () => {
    expect(unionBounds([
      { x: 10, y: -1080, width: 1920, height: 1080 },
      { x: 0, y: 0, width: 1920, height: 1080 }
    ])).toEqual({ x: 0, y: -1080, width: 1930, height: 2160 })
    expect(unionBounds([])).toBeUndefined()
  })

  it('round-trips display rectangles for the overlay window', () => {
    const displays = [
      { id: 1, x: 10, y: 0, width: 1920, height: 1080 },
      { id: 2, x: 0, y: 1080, width: 1920, height: 1080 }
    ]
    expect(parseDisplayRects(serializeDisplayRects(displays))).toEqual(displays)
    expect(parseDisplayRects(null)).toEqual([])
    expect(parseDisplayRects('nope')).toEqual([])
  })

  it('round-trips a per-display overlay title and layout list', () => {
    expect(displayIdFromOverlayTitle(overlayWindowTitle(7))).toBe(7)
    expect(displayIdFromOverlayTitle('widoken overlay')).toBeUndefined()
    expect(serializeOverlayLayouts([
      { caption: overlayWindowTitle(1), x: 0, y: 0, width: 1920, height: 1080 },
      { caption: overlayWindowTitle(2), x: 1920, y: 0, width: 1280, height: 720 }
    ])).toBe('widoken overlay 1|0|0|1920|1080;widoken overlay 2|1920|0|1280|720')
  })
})
