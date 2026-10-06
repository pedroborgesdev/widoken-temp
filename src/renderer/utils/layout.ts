import type { DockSide, WidgetOrientation } from '@shared/settings'

export const WIDGET_WIDTH = 54
export const WIDGET_MARGIN = 8
export const SNAP_ZONE_WIDTH = 54
export const PROVIDER_PITCH = 48
export const PROVIDER_SIZE = 42
export const DEFAULT_PROVIDER_GAP = PROVIDER_PITCH - PROVIDER_SIZE
export const WIDGET_CONTROLS_HEIGHT = 42
export const POPOVER_WIDTH = 246
export const POPOVER_PANEL_WIDTH = 240
export const POPOVER_GAP = 6
export const POPOVER_HEIGHT_CONNECTED = 108
export const POPOVER_HEIGHT_SINGLE = 58
export const POPOVER_HEIGHT_UNAVAILABLE = 56
export const SETTINGS_WIDTH = 292
export const SETTINGS_INSET = 40
export const SETTINGS_HEIGHT = 420
export const WIDGET_CONTROL_INSET = 18

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
  const candidateSide = dockingEnabled
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
  const top = candidateSide === 'top' ? minimumTop : candidateSide === 'bottom' ? maximumTop : freeTop
  const side = candidateSide ?? (left + widgetWidth / 2 <= viewportWidth / 2 ? 'left' : 'right')

  return { candidateSide, left, side, top }
}
