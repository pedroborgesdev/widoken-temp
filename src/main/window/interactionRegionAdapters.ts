import type { Point, Rectangle } from 'electron'

export interface InteractionWindow {
  getContentSize(): number[]
  isDestroyed(): boolean
  setIgnoreMouseEvents(ignore: boolean, options?: { forward: boolean }): void
  setShape(rectangles: Rectangle[]): void
}

export interface InteractionRegionAdapter {
  registerDisplay(window: InteractionWindow, displayBounds: Rectangle): void
  updateWindowBounds(window: InteractionWindow, windowBounds: Rectangle): void
  applyRegions(window: InteractionWindow, regions: Rectangle[], paintOutset?: number): void
  updateCursor(window: InteractionWindow, cursor: Point): void
  makeFullyInteractive(window: InteractionWindow): void
  endFullInteraction(window: InteractionWindow): void
}

interface WindowsInteractionState {
  cursor?: Point
  displayBounds: Rectangle
  forceInteractive: boolean
  ignoringMouse?: boolean
  paintOutset: number
  regions: Rectangle[]
}

class WindowsInteractionRegionAdapter implements InteractionRegionAdapter {
  private readonly states = new WeakMap<InteractionWindow, WindowsInteractionState>()

  registerDisplay(window: InteractionWindow, displayBounds: Rectangle): void {
    const state = this.states.get(window)
    if (!state) {
      this.states.set(window, { displayBounds, forceInteractive: false, paintOutset: 0, regions: [] })
      return
    }
    state.displayBounds = displayBounds
    this.syncMouse(window, state, false)
  }

  updateWindowBounds(window: InteractionWindow, windowBounds: Rectangle): void {
    const state = this.states.get(window)
    if (!state) return
    state.displayBounds = windowBounds
    // A bounds change can drop the window region, so the click-through shape
    // has to be installed again for the new client size.
    this.syncMouse(window, state, true)
  }

  applyRegions(window: InteractionWindow, regions: Rectangle[], paintOutset = 0): void {
    const state = this.ensureState(window)
    state.regions = regions
    state.paintOutset = sanitizePaintOutset(paintOutset)
    this.syncMouse(window, state, true)
  }

  updateCursor(window: InteractionWindow, cursor: Point): void {
    const state = this.ensureState(window)
    state.cursor = cursor
    this.syncMouse(window, state, false)
  }

  makeFullyInteractive(window: InteractionWindow): void {
    const state = this.ensureState(window)
    state.forceInteractive = true
    this.syncMouse(window, state, true)
  }

  endFullInteraction(window: InteractionWindow): void {
    const state = this.states.get(window)
    if (!state) return
    state.forceInteractive = false
  }

  private ensureState(window: InteractionWindow): WindowsInteractionState {
    const existing = this.states.get(window)
    if (existing) return existing
    const [width, height] = window.getContentSize()
    const state = {
      displayBounds: { x: 0, y: 0, width, height },
      forceInteractive: false,
      paintOutset: 0,
      regions: []
    }
    this.states.set(window, state)
    return state
  }

  private syncMouse(window: InteractionWindow, state: WindowsInteractionState, shapeChanged: boolean): void {
    if (window.isDestroyed()) return

    // setShape clips GDI hit-testing, but after a drag expands that region to the
    // whole display Windows keeps delivering the pointer to this layered window.
    // Other Chromium windows, including this app's settings window, then stop
    // receiving hover and clicks. WS_EX_TRANSPARENT is what the OS honors.
    // Forwarding is left off: Electron's mouse hook posts moves for the entire
    // client area and clears hover in sibling Chromium windows.
    const shouldIgnore = !this.pointerIsInside(state)
    const shape = this.interactiveShape(window, state)

    if (shouldIgnore) {
      if (state.ignoringMouse !== true) {
        window.setIgnoreMouseEvents(true)
        state.ignoringMouse = true
      }
      if (shapeChanged) window.setShape(shape)
      return
    }

    if (state.ignoringMouse !== false) {
      // Enabling input rewrites GWL_EXSTYLE and can drop the window region, so
      // the shape has to be installed again afterwards.
      window.setIgnoreMouseEvents(false)
      state.ignoringMouse = false
      window.setShape(shape)
      return
    }

    if (shapeChanged) window.setShape(shape)
  }

  private pointerIsInside(state: WindowsInteractionState): boolean {
    if (state.forceInteractive) return true
    if (!state.cursor || state.regions.length === 0) return false
    return globalPointIsInsideRegions(state.cursor, state.displayBounds, state.regions)
  }

  private interactiveShape(window: InteractionWindow, state: WindowsInteractionState): Rectangle[] {
    const [width, height] = window.getContentSize()
    if (state.forceInteractive) return [{ x: 0, y: 0, width, height }]
    return expandRectanglesForPaint(state.regions, width, height, state.paintOutset)
  }
}

class LinuxX11InteractionRegionAdapter implements InteractionRegionAdapter {
  registerDisplay(): void {}
  updateWindowBounds(): void {}

  applyRegions(window: InteractionWindow, regions: Rectangle[]): void {
    // Keep the proven Linux/X11 behavior unchanged.
    window.setIgnoreMouseEvents(false)
    window.setShape(regions)
  }

  updateCursor(): void {}

  makeFullyInteractive(window: InteractionWindow): void {
    const [width, height] = window.getContentSize()
    this.applyRegions(window, [{ x: 0, y: 0, width, height }])
  }

  endFullInteraction(): void {}
}

interface WaylandInteractionState {
  cursor?: Point
  displayBounds: Rectangle
  ignoringMouse?: boolean
  regions: Rectangle[]
}

class WaylandInteractionRegionAdapter implements InteractionRegionAdapter {
  private readonly states = new WeakMap<InteractionWindow, WaylandInteractionState>()

  registerDisplay(window: InteractionWindow, displayBounds: Rectangle): void {
    this.states.set(window, { displayBounds, regions: [] })
  }

  updateWindowBounds(window: InteractionWindow, windowBounds: Rectangle): void {
    const state = this.states.get(window)
    if (!state) return
    state.displayBounds = windowBounds
    this.updateMousePassthrough(window, state)
  }

  applyRegions(window: InteractionWindow, regions: Rectangle[]): void {
    const state = this.states.get(window)
    if (!state) {
      window.setIgnoreMouseEvents(false)
      return
    }
    state.regions = regions
    this.updateMousePassthrough(window, state)
  }

  updateCursor(window: InteractionWindow, cursor: Point): void {
    const state = this.states.get(window)
    if (!state) return
    state.cursor = cursor
    this.updateMousePassthrough(window, state)
  }

  makeFullyInteractive(window: InteractionWindow): void {
    const state = this.states.get(window)
    if (!state) return
    this.applyRegions(window, [
      { x: 0, y: 0, width: state.displayBounds.width, height: state.displayBounds.height }
    ])
  }

  endFullInteraction(): void {}

  private updateMousePassthrough(window: InteractionWindow, state: WaylandInteractionState): void {
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
}

class DefaultInteractionRegionAdapter implements InteractionRegionAdapter {
  registerDisplay(): void {}
  updateWindowBounds(): void {}

  applyRegions(window: InteractionWindow, regions: Rectangle[]): void {
    window.setIgnoreMouseEvents(regions.length === 0, { forward: true })
  }

  updateCursor(): void {}

  makeFullyInteractive(window: InteractionWindow): void {
    window.setIgnoreMouseEvents(false)
  }

  endFullInteraction(): void {}
}

export function createInteractionRegionAdapter(
  platform: NodeJS.Platform,
  nativeWayland: boolean
): InteractionRegionAdapter {
  if (platform === 'win32') return new WindowsInteractionRegionAdapter()
  if (platform === 'linux' && nativeWayland) return new WaylandInteractionRegionAdapter()
  if (platform === 'linux') return new LinuxX11InteractionRegionAdapter()
  return new DefaultInteractionRegionAdapter()
}

export function sanitizePaintOutset(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(240, Math.round(value))
}

export function expandRectanglesForPaint(
  regions: Rectangle[],
  contentWidth: number,
  contentHeight: number,
  outset: number
): Rectangle[] {
  if (outset <= 0 || regions.length === 0) return regions
  return regions.map((region) => {
    const x = Math.max(0, region.x - outset)
    const y = Math.max(0, region.y - outset)
    const right = Math.min(contentWidth, region.x + region.width + outset)
    const bottom = Math.min(contentHeight, region.y + region.height + outset)
    const width = right - x
    const height = bottom - y
    if (width <= 0 || height <= 0) return region
    return { x, y, width, height }
  })
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
