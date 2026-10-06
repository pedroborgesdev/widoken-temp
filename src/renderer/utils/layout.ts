import type { DockSide, WidgetOrientation } from '@shared/settings'

export const WIDGET_WIDTH = 54
export const WIDGET_MARGIN = 8
export const SNAP_ZONE_WIDTH = 54
export const PROVIDER_PITCH = 48
export const PROVIDER_SIZE = 42
export const APP_BOARD_SLOTS = 1

export function boardItemCount(providerCount: number): number {
  return Math.max(0, providerCount) + APP_BOARD_SLOTS
}

export const DEFAULT_PROVIDER_GAP = PROVIDER_PITCH - PROVIDER_SIZE
export const WIDGET_CONTROLS_HEIGHT = 42

export function boardSpan(providerCount: number, itemGap = DEFAULT_PROVIDER_GAP): number {
  const count = boardItemCount(providerCount)
  return count * PROVIDER_SIZE + Math.max(0, count - 1) * itemGap
}

export function boardLongAxis(providerCount: number, itemGap = DEFAULT_PROVIDER_GAP): number {
  return WIDGET_CONTROLS_HEIGHT + boardSpan(providerCount, itemGap) + DEFAULT_PROVIDER_GAP
}
export const POPOVER_WIDTH = 306
export const POPOVER_PANEL_WIDTH = 300
export const POPOVER_GAP = 6
export const POPOVER_HEIGHT_CONNECTED = 140
export const POPOVER_HEIGHT_SINGLE = 92
export const POPOVER_HEIGHT_UNAVAILABLE = 74
export const SETTINGS_WIDTH = 292
export const SETTINGS_INSET = 40
export const SETTINGS_HEIGHT = 420
export const WIDGET_CONTROL_INSET = 18
export const WIDGET_PEEK = 14
export const APP_ICON_TURN_DEGREES = 16
export const WIDGET_COLLAPSE_MS = 480

export type EdgeCollapse = 'left' | 'right' | 'top' | 'bottom'

export function resolveEdgeCollapse(
  orientation: WidgetOrientation,
  widgetLeft: number,
  widgetTop: number,
  widgetWidth: number,
  widgetHeight: number,
  viewportWidth: number,
  viewportHeight: number
): EdgeCollapse | undefined {
  const tolerance = 1
  const atLeft = widgetLeft <= WIDGET_MARGIN + tolerance
  const atRight = widgetLeft + widgetWidth >= viewportWidth - WIDGET_MARGIN - tolerance
  const atTop = widgetTop <= WIDGET_MARGIN + tolerance
  const atBottom = widgetTop + widgetHeight >= viewportHeight - WIDGET_MARGIN - tolerance

  if (orientation === 'vertical') {
    if (atLeft && atRight) return widgetLeft + widgetWidth / 2 <= viewportWidth / 2 ? 'left' : 'right'
    if (atLeft) return 'left'
    if (atRight) return 'right'
    return undefined
  }

  if (atTop && atBottom) return widgetTop + widgetHeight / 2 <= viewportHeight / 2 ? 'top' : 'bottom'
  if (atTop) return 'top'
  if (atBottom) return 'bottom'
  return undefined
}

export function edgeCollapseOffset(
  edge: EdgeCollapse,
  widgetLeft: number,
  widgetTop: number,
  widgetWidth: number,
  widgetHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  scale = 1
): { x: number, y: number } {
  const peek = WIDGET_PEEK * scale
  switch (edge) {
    case 'left':
      return { x: peek - widgetLeft - widgetWidth, y: 0 }
    case 'right':
      return { x: viewportWidth - peek - widgetLeft, y: 0 }
    case 'top':
      return { x: 0, y: peek - widgetTop - widgetHeight }
    case 'bottom':
      return { x: 0, y: viewportHeight - peek - widgetTop }
  }
}

export function extendRectangleToScreenEdge(
  rectangle: { x: number, y: number, width: number, height: number },
  edge: EdgeCollapse | undefined,
  viewportWidth: number,
  viewportHeight: number
): { x: number, y: number, width: number, height: number } {
  if (!edge) return rectangle
  switch (edge) {
    case 'left': {
      const right = rectangle.x + rectangle.width
      const x = Math.min(rectangle.x, 0)
      return { ...rectangle, x, width: right - x }
    }
    case 'right':
      return { ...rectangle, width: Math.max(rectangle.x + rectangle.width, viewportWidth) - rectangle.x }
    case 'top': {
      const bottom = rectangle.y + rectangle.height
      const y = Math.min(rectangle.y, 0)
      return { ...rectangle, y, height: bottom - y }
    }
    case 'bottom':
      return { ...rectangle, height: Math.max(rectangle.y + rectangle.height, viewportHeight) - rectangle.y }
  }
}

export function collapsedWidgetRectangle(
  edge: EdgeCollapse,
  widgetLeft: number,
  widgetTop: number,
  widgetWidth: number,
  widgetHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  scale = 1
): { x: number, y: number, width: number, height: number } {
  const peek = Math.max(1, WIDGET_PEEK * scale)
  switch (edge) {
    case 'left':
      return { x: 0, y: widgetTop, width: peek, height: widgetHeight }
    case 'right':
      return { x: viewportWidth - peek, y: widgetTop, width: peek, height: widgetHeight }
    case 'top':
      return { x: widgetLeft, y: 0, width: widgetWidth, height: peek }
    case 'bottom':
      return { x: widgetLeft, y: viewportHeight - peek, width: widgetWidth, height: peek }
  }
}

export function tuckInteractionRectangle(
  resting: { x: number, y: number, width: number, height: number },
  edge: EdgeCollapse | undefined,
  settled: boolean,
  widgetLeft: number,
  widgetTop: number,
  widgetWidth: number,
  widgetHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  scale = 1
): { x: number, y: number, width: number, height: number } {
  if (settled && edge) {
    return collapsedWidgetRectangle(
      edge,
      widgetLeft,
      widgetTop,
      widgetWidth,
      widgetHeight,
      viewportWidth,
      viewportHeight,
      scale
    )
  }
  return extendRectangleToScreenEdge(resting, edge, viewportWidth, viewportHeight)
}

export type ControlTurnDirection = 'left' | 'right' | 'top' | 'bottom'

export interface CornerControlLayout {
  coreShiftX: number
  coreShiftY: number
  gearTurn?: ControlTurnDirection
  grabTurn?: ControlTurnDirection
}

function providerSpan(providerCount: number, itemGap: number): number {
  const count = Math.max(0, providerCount)
  return count * PROVIDER_SIZE + Math.max(0, count - 1) * itemGap
}

function widgetLongAxis(providerCount: number, itemGap: number): number {
  const count = Math.max(0, providerCount)
  return WIDGET_CONTROLS_HEIGHT + providerSpan(count, itemGap) + (count > 0 ? DEFAULT_PROVIDER_GAP : 0)
}

export function getWidgetWidth(
  providerCount: number,
  orientation: WidgetOrientation = 'vertical',
  itemGap = DEFAULT_PROVIDER_GAP,
  scale = 1
): number {
  const width = orientation === 'horizontal'
    ? widgetLongAxis(providerCount, itemGap)
    : WIDGET_WIDTH
  return width * scale
}

export function getWidgetHeight(
  providerCount: number,
  orientation: WidgetOrientation = 'vertical',
  itemGap = DEFAULT_PROVIDER_GAP,
  scale = 1
): number {
  const height = orientation === 'horizontal'
    ? WIDGET_WIDTH
    : widgetLongAxis(providerCount, itemGap)
  return height * scale
}

export function getWidgetTop(verticalPosition: number, viewportHeight: number, widgetHeight: number): number {
  return widgetCoordinate(verticalPosition, viewportHeight, widgetHeight)
}

export function resolveCornerControlLayout(
  widgetLeft: number,
  widgetTop: number,
  widgetWidth: number,
  widgetHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  orientation: WidgetOrientation
): CornerControlLayout {
  const tolerance = 1
  const atLeft = widgetLeft <= WIDGET_MARGIN + tolerance
  const atRight = widgetLeft + widgetWidth >= viewportWidth - WIDGET_MARGIN - tolerance
  const atTop = widgetTop <= WIDGET_MARGIN + tolerance
  const atBottom = widgetTop + widgetHeight >= viewportHeight - WIDGET_MARGIN - tolerance

  if (orientation === 'vertical') {
    const horizontalTurn = widgetLeft + widgetWidth / 2 <= viewportWidth / 2 ? 'right' : 'left'
    const gearTurn = atTop ? horizontalTurn : undefined
    const grabTurn = atBottom ? horizontalTurn : undefined
    return {
      coreShiftX: 0,
      coreShiftY: (grabTurn ? WIDGET_CONTROL_INSET : 0) - (gearTurn ? WIDGET_CONTROL_INSET : 0),
      gearTurn,
      grabTurn
    }
  }

  const verticalTurn = atTop ? 'bottom' : atBottom ? 'top' : undefined
  const gearTurn = atLeft ? verticalTurn : undefined
  const grabTurn = atRight ? verticalTurn : undefined
  return {
    coreShiftX: (grabTurn ? WIDGET_CONTROL_INSET : 0) - (gearTurn ? WIDGET_CONTROL_INSET : 0),
    coreShiftY: 0,
    gearTurn,
    grabTurn
  }
}

export function resolveDropSide(
  widgetLeft: number,
  viewportWidth: number,
  widgetWidth = WIDGET_WIDTH,
  widgetTop?: number,
  viewportHeight?: number,
  widgetHeight = WIDGET_WIDTH
): DockSide | undefined {
  const maximumLeft = Math.max(WIDGET_MARGIN, viewportWidth - widgetWidth - WIDGET_MARGIN)
  const candidates: Array<{ side: DockSide; distance: number }> = []
  if (widgetLeft <= WIDGET_MARGIN + SNAP_ZONE_WIDTH) {
    candidates.push({ side: 'left', distance: Math.abs(widgetLeft - WIDGET_MARGIN) })
  }
  if (widgetLeft + widgetWidth >= viewportWidth - WIDGET_MARGIN - SNAP_ZONE_WIDTH) {
    candidates.push({ side: 'right', distance: Math.abs(maximumLeft - widgetLeft) })
  }
  if (widgetTop !== undefined && viewportHeight !== undefined) {
    const maximumTop = Math.max(WIDGET_MARGIN, viewportHeight - widgetHeight - WIDGET_MARGIN)
    if (widgetTop <= WIDGET_MARGIN + SNAP_ZONE_WIDTH) {
      candidates.push({ side: 'top', distance: Math.abs(widgetTop - WIDGET_MARGIN) })
    }
    if (widgetTop + widgetHeight >= viewportHeight - WIDGET_MARGIN - SNAP_ZONE_WIDTH) {
      candidates.push({ side: 'bottom', distance: Math.abs(maximumTop - widgetTop) })
    }
  }
  return candidates.sort((a, b) => a.distance - b.distance)[0]?.side
}

export function getWidgetLeft(horizontalPosition: number, viewportWidth: number, widgetWidth: number): number {
  return widgetCoordinate(horizontalPosition, viewportWidth, widgetWidth)
}

export function normalizeWidgetCoordinate(coordinate: number, viewportSize: number, widgetSize: number): number {
  const travel = Math.max(1, viewportSize - widgetSize - WIDGET_MARGIN * 2)
  return Math.min(1, Math.max(0, (coordinate - WIDGET_MARGIN) / travel))
}

function widgetCoordinate(position: number, viewportSize: number, widgetSize: number): number {
  const travel = Math.max(0, viewportSize - widgetSize - WIDGET_MARGIN * 2)
  return Math.round(WIDGET_MARGIN + Math.min(1, Math.max(0, position)) * travel)
}

export interface DraggedWidgetPosition {
  candidateSide?: DockSide
  left: number
  side: DockSide
  top: number
}

export interface HorizontalPopoverPosition {
  left: number
  placement: 'top' | 'bottom'
  top: number
}

const TURNED_THUMB_INNER_EDGE = 42
const TURNED_THUMB_OUTER_EDGE = 42

export function keepHorizontalPopoverOutsideTurnedThumb(
  position: HorizontalPopoverPosition,
  widgetLeft: number,
  widgetWidth: number,
  gearTurn: ControlTurnDirection | undefined,
  grabTurn: ControlTurnDirection | undefined,
  viewportWidth: number,
  scale = 1
): HorizontalPopoverPosition {
  let left = position.left
  if (gearTurn === position.placement) {
    left = Math.max(left, widgetLeft + TURNED_THUMB_INNER_EDGE * scale + POPOVER_GAP)
  }
  if (grabTurn === position.placement) {
    const thumbLeft = widgetLeft + widgetWidth - TURNED_THUMB_INNER_EDGE * scale
    left = Math.min(left, thumbLeft - POPOVER_GAP - POPOVER_PANEL_WIDTH)
  }
  const maximumLeft = Math.max(WIDGET_MARGIN, viewportWidth - POPOVER_PANEL_WIDTH - WIDGET_MARGIN)
  return { ...position, left: Math.min(maximumLeft, Math.max(WIDGET_MARGIN, left)) }
}

export interface VerticalPopoverLayout {
  maxHeight: number
  top: number
}

const POPOVER_MAX_HEIGHT = 360

export function keepVerticalPopoverOutsideTurnedThumb(
  top: number,
  popoverHeight: number,
  placement: 'left' | 'right',
  widgetTop: number,
  widgetHeight: number,
  gearTurn: ControlTurnDirection | undefined,
  grabTurn: ControlTurnDirection | undefined,
  viewportHeight: number,
  scale = 1
): VerticalPopoverLayout {
  const physicalSide = placement === 'left' ? 'right' : 'left'
  const minimumTop = Math.max(
    WIDGET_MARGIN,
    gearTurn === physicalSide ? widgetTop + TURNED_THUMB_OUTER_EDGE * scale + POPOVER_GAP : WIDGET_MARGIN
  )
  const maximumBottom = Math.min(
    viewportHeight - WIDGET_MARGIN,
    grabTurn === physicalSide
      ? widgetTop + widgetHeight - TURNED_THUMB_OUTER_EDGE * scale - POPOVER_GAP
      : viewportHeight - WIDGET_MARGIN
  )
  const height = Math.max(0, popoverHeight)
  const adjustedTop = Math.max(minimumTop, Math.min(top, maximumBottom - height))
  return {
    top: adjustedTop,
    maxHeight: Math.min(POPOVER_MAX_HEIGHT, Math.max(0, maximumBottom - adjustedTop))
  }
}

export function appIconTurn(widgetLeft: number, widgetWidth: number, viewportWidth: number): number {
  const center = widgetLeft + widgetWidth / 2
  return center <= viewportWidth / 2 ? APP_ICON_TURN_DEGREES : -APP_ICON_TURN_DEGREES
}

export function resolveVerticalPopoverTop(
  widgetTop: number,
  providerIndex: number,
  popoverHeight: number,
  coreShiftY = 0,
  providerPitch = PROVIDER_PITCH,
  scale = 1
): number {
  const providerCenter = widgetTop + (24 + coreShiftY + Math.max(0, providerIndex) * providerPitch + PROVIDER_SIZE / 2) * scale
  return providerCenter - Math.max(0, popoverHeight) / 2
}

export function resolveHorizontalPopoverPosition(
  widgetLeft: number,
  widgetTop: number,
  widgetHeight: number,
  providerIndex: number,
  popoverHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  providerPitch = PROVIDER_PITCH,
  scale = 1
): HorizontalPopoverPosition {
  const providerCenter = widgetLeft + (24 + Math.max(0, providerIndex) * providerPitch + 21) * scale
  const maximumLeft = Math.max(WIDGET_MARGIN, viewportWidth - POPOVER_PANEL_WIDTH - WIDGET_MARGIN)
  const left = Math.min(maximumLeft, Math.max(WIDGET_MARGIN, providerCenter - POPOVER_PANEL_WIDTH / 2))
  const placement = widgetTop + widgetHeight / 2 > viewportHeight / 2 ? 'top' : 'bottom'
  const desiredTop = placement === 'bottom'
    ? widgetTop + widgetHeight
    : widgetTop - popoverHeight - POPOVER_GAP
  const maximumTop = Math.max(WIDGET_MARGIN, viewportHeight - popoverHeight - POPOVER_GAP - WIDGET_MARGIN)
  const top = Math.min(maximumTop, Math.max(WIDGET_MARGIN, desiredTop))

  return { left, placement, top }
}

export function resolveDraggedWidgetPosition(
  pointerX: number,
  pointerY: number,
  offsetX: number,
  offsetY: number,
  viewportWidth: number,
  viewportHeight: number,
  widgetHeight: number,
  widgetWidth = WIDGET_WIDTH,
  dockingEnabled = true
): DraggedWidgetPosition {
  const minimumLeft = WIDGET_MARGIN
  const maximumLeft = Math.max(minimumLeft, viewportWidth - widgetWidth - WIDGET_MARGIN)
  const minimumTop = WIDGET_MARGIN
  const maximumTop = Math.max(minimumTop, viewportHeight - widgetHeight - WIDGET_MARGIN)
  const freeLeft = Math.min(maximumLeft, Math.max(minimumLeft, pointerX - offsetX))
  const freeTop = Math.min(maximumTop, Math.max(minimumTop, pointerY - offsetY))
  let candidateSide = dockingEnabled
    ? resolveDropSide(
        freeLeft,
        viewportWidth,
        widgetWidth,
        freeTop,
        viewportHeight,
        widgetHeight
      )
    : undefined
  const left = candidateSide === 'left' ? minimumLeft : candidateSide === 'right' ? maximumLeft : freeLeft
  let top = candidateSide === 'top' ? minimumTop : candidateSide === 'bottom' ? maximumTop : freeTop
  // A side lane used to win the whole gesture, so the widget never got pulled into the
  // top or bottom bar. Crossing that bar seats it on the bar's outer edge, and aiming
  // inside the bar makes that bar the dock target.
  if (dockingEnabled && candidateSide !== 'top' && candidateSide !== 'bottom') {
    const laneInnerEdge = WIDGET_MARGIN + SNAP_ZONE_WIDTH
    const bottomLaneTop = viewportHeight - WIDGET_MARGIN - SNAP_ZONE_WIDTH
    const enteredTop = freeTop <= laneInnerEdge
    const enteredBottom = freeTop + widgetHeight >= bottomLaneTop
    const pointerInTop = pointerY <= laneInnerEdge
    const pointerInBottom = pointerY >= bottomLaneTop && pointerY <= viewportHeight - WIDGET_MARGIN
    if (enteredBottom && !enteredTop) {
      top = maximumTop
      if (pointerInBottom && !candidateSide) candidateSide = 'bottom'
    } else if (enteredTop && !enteredBottom) {
      top = minimumTop
      if (pointerInTop && !candidateSide) candidateSide = 'top'
    }
  }
  const side = candidateSide ?? (left + widgetWidth / 2 <= viewportWidth / 2 ? 'left' : 'right')

  return { candidateSide, left, side, top }
}
