import { describe, expect, it } from 'vitest'
import type { Rectangle } from 'electron'
import {
  createInteractionRegionAdapter,
  type InteractionWindow
} from '../../src/main/window/interactionRegionAdapters'

interface WindowCall {
  name: 'ignore' | 'shape'
  value: boolean | Rectangle[]
  forward?: boolean
}

function createWindow(): { calls: WindowCall[]; window: InteractionWindow } {
  const calls: WindowCall[] = []
  return {
    calls,
    window: {
      getContentSize: () => [1920, 1080],
      isDestroyed: () => false,
      setIgnoreMouseEvents: (ignore, options) => {
        calls.push({ name: 'ignore', value: ignore, forward: options?.forward })
      },
      setShape: (rectangles) => {
        calls.push({ name: 'shape', value: rectangles })
      }
    }
  }
}

describe('interaction region adapters', () => {
  const display = { x: 0, y: 0, width: 1920, height: 1080 }
  const widget = [{ x: 10, y: 20, width: 54, height: 234 }]

  it('keeps Windows click-through until the pointer is inside a region', () => {
    const adapter = createInteractionRegionAdapter('win32', false)
    const { calls, window } = createWindow()

    adapter.registerDisplay(window, display)
    adapter.applyRegions(window, widget)

    expect(calls).toEqual([
      { name: 'ignore', value: true, forward: undefined },
      { name: 'shape', value: widget }
    ])
  })

  it('accepts Windows input only after the pointer enters, then reinstalls the shape', () => {
    const adapter = createInteractionRegionAdapter('win32', false)
    const { calls, window } = createWindow()

    adapter.registerDisplay(window, display)
    adapter.applyRegions(window, widget)
    calls.length = 0
    adapter.updateCursor(window, { x: 30, y: 40 })

    expect(calls).toEqual([
      { name: 'ignore', value: false, forward: undefined },
      { name: 'shape', value: widget }
    ])
  })

  it('makes an empty Windows region click-through before resetting its shape', () => {
    const adapter = createInteractionRegionAdapter('win32', false)
    const { calls, window } = createWindow()

    adapter.applyRegions(window, [])

    expect(calls).toEqual([
      { name: 'ignore', value: true, forward: undefined },
      { name: 'shape', value: [] }
    ])
  })

  it('restores Windows click-through for a window below after a drag', () => {
    const adapter = createInteractionRegionAdapter('win32', false)
    const { calls, window } = createWindow()
    const fullWindow = [{ x: 0, y: 0, width: 1920, height: 1080 }]

    adapter.registerDisplay(window, display)
    adapter.updateCursor(window, { x: 30, y: 40 })
    adapter.applyRegions(window, widget)
    calls.length = 0

    adapter.makeFullyInteractive(window)
    adapter.updateCursor(window, { x: 960, y: 540 })

    expect(calls).toEqual([{ name: 'shape', value: fullWindow }])

    adapter.endFullInteraction(window)
    adapter.applyRegions(window, widget)

    expect(calls).toEqual([
      { name: 'shape', value: fullWindow },
      { name: 'ignore', value: true, forward: undefined },
      { name: 'shape', value: widget }
    ])
  })

  it('paints the Windows shadow outside the widget without capturing that margin', () => {
    const adapter = createInteractionRegionAdapter('win32', false)
    const { calls, window } = createWindow()

    adapter.registerDisplay(window, display)
    adapter.applyRegions(window, widget, 48)

    expect(calls).toEqual([
      { name: 'ignore', value: true, forward: undefined },
      { name: 'shape', value: [{ x: 0, y: 0, width: 112, height: 302 }] }
    ])

    calls.length = 0
    adapter.updateCursor(window, { x: 4, y: 4 })
    expect(calls).toEqual([])

    adapter.updateCursor(window, { x: 30, y: 40 })
    expect(calls).toEqual([
      { name: 'ignore', value: false, forward: undefined },
      { name: 'shape', value: [{ x: 0, y: 0, width: 112, height: 302 }] }
    ])
  })

  it('does not forward Windows mouse moves while click-through is on', () => {
    const adapter = createInteractionRegionAdapter('win32', false)
    const { calls, window } = createWindow()

    adapter.registerDisplay(window, display)
    adapter.updateCursor(window, { x: 30, y: 40 })
    adapter.applyRegions(window, widget)
    calls.length = 0
    adapter.updateCursor(window, { x: 960, y: 540 })
    adapter.updateCursor(window, { x: 961, y: 540 })

    expect(calls).toEqual([{ name: 'ignore', value: true, forward: undefined }])
  })

  it('keeps the existing Linux X11 shape behavior', () => {
    const adapter = createInteractionRegionAdapter('linux', false)
    const { calls, window } = createWindow()
    const regions = [{ x: 10, y: 20, width: 54, height: 234 }]

    adapter.applyRegions(window, regions)

    expect(calls).toEqual([
      { name: 'ignore', value: false, forward: undefined },
      { name: 'shape', value: regions }
    ])
  })
})
