import { describe, expect, it } from 'vitest'
import { calculateVerticalPosition, switchSide } from '../../src/shared/settings'
import {
  appIconTurn,
  boardItemCount,
  boardLongAxis,
  getWidgetHeight,
  getWidgetLeft,
  getWidgetTop,
  getWidgetWidth,
  collapsedWidgetRectangle,
  tuckInteractionRectangle,
  edgeCollapseOffset,
  keepHorizontalPopoverOutsideTurnedThumb,
  keepVerticalPopoverOutsideTurnedThumb,
  normalizeWidgetCoordinate,
  resolveCornerControlLayout,
  resolveEdgeCollapse,
  resolveDraggedWidgetPosition,
  resolveDropSide,
  resolveHorizontalPopoverPosition,
  resolveVerticalPopoverTop,
  WIDGET_MARGIN
} from '../../src/renderer/utils/layout'
import { globalPointIsInsideRegions, pointIsInsideRegions } from '../../src/main/window/interactionRegions'

describe('widget layout', () => {
  it.each([
    [1, 90],
    [2, 138],
    [3, 186],
    [4, 234]
  ])('uses the Figma height for %i providers', (providers, expected) => {
    expect(getWidgetHeight(providers)).toBe(expected)
  })

  it('reserves a leading slot for the app mark', () => {
    expect(boardItemCount(4)).toBe(5)
    expect(boardLongAxis(4)).toBe(282)
    expect(getWidgetHeight(boardItemCount(4))).toBe(282)
    expect(getWidgetWidth(boardItemCount(4), 'horizontal')).toBe(282)
  })

  it('rotates the widget dimensions for horizontal layout', () => {
    expect(getWidgetWidth(4, 'horizontal')).toBe(234)
    expect(getWidgetHeight(4, 'horizontal')).toBe(54)
  })

  it('turns only the control that reaches a vertical corner', () => {
    expect(resolveCornerControlLayout(1138, 758, 54, 234, 1200, 1000, 'vertical')).toEqual({
      coreShiftX: 0,
      coreShiftY: 18,
      gearTurn: undefined,
      grabTurn: 'left'
    })
    expect(resolveCornerControlLayout(8, 8, 54, 234, 1200, 1000, 'vertical')).toEqual({
      coreShiftX: 0,
      coreShiftY: -18,
      gearTurn: 'right',
      grabTurn: undefined
    })
    expect(resolveCornerControlLayout(500, 758, 54, 234, 1200, 1000, 'vertical')).toEqual({
      coreShiftX: 0,
      coreShiftY: 18,
      gearTurn: undefined,
      grabTurn: 'right'
    })
  })

  it('turns horizontal controls toward the available corner space', () => {
    expect(resolveCornerControlLayout(958, 938, 234, 54, 1200, 1000, 'horizontal')).toEqual({
      coreShiftX: 18,
      coreShiftY: 0,
      gearTurn: undefined,
      grabTurn: 'top'
    })
    expect(resolveCornerControlLayout(8, 8, 234, 54, 1200, 1000, 'horizontal')).toEqual({
      coreShiftX: -18,
      coreShiftY: 0,
      gearTurn: 'bottom',
      grabTurn: undefined
    })
  })

  it('includes custom item gaps and scale in widget dimensions', () => {
    expect(getWidgetHeight(4, 'vertical', 12, 1.2)).toBeCloseTo(302.4)
    expect(getWidgetWidth(4, 'horizontal', 12, 1.2)).toBeCloseTo(302.4)
    expect(getWidgetHeight(4, 'horizontal', 12, 1.2)).toBeCloseTo(64.8)
  })

  it('normalizes and restores vertical position', () => {
    expect(calculateVerticalPosition(410, 0, 1000, 180)).toBe(0.5)
    expect(getWidgetTop(0.5, 1000, 180)).toBe(410)
    expect(getWidgetTop(0, 1000, 180)).toBe(WIDGET_MARGIN)
    expect(getWidgetTop(1, 1000, 180)).toBe(812)
    expect(getWidgetLeft(0.25, 1200, 54)).toBe(291)
    expect(normalizeWidgetCoordinate(291, 1200, 54)).toBeCloseTo(0.25)
  })

  it('switches sides', () => {
    expect(switchSide('left')).toBe('right')
    expect(switchSide('right')).toBe('left')
    expect(switchSide('top')).toBe('bottom')
    expect(switchSide('bottom')).toBe('top')
  })

  it('resolves outer and arrow docking lanes', () => {
    expect(resolveDropSide(20, 1200)).toBe('left')
    expect(resolveDropSide(60, 1200)).toBe('left')
    expect(resolveDropSide(1140, 1200)).toBe('right')
    expect(resolveDropSide(1180, 1200)).toBe('right')
    expect(resolveDropSide(600, 1200)).toBeUndefined()
    expect(resolveDropSide(600, 1200, 54, 12, 1000, 234)).toBe('top')
    expect(resolveDropSide(600, 1200, 54, 755, 1000, 234)).toBe('bottom')
  })

  it('starts magnetic capture when the widget itself enters a lane', () => {
    expect(resolveDraggedWidgetPosition(80, 500, 18, 75, 1200, 1000, 234).candidateSide).toBe('left')
    expect(resolveDraggedWidgetPosition(1102, 500, 18, 75, 1200, 1000, 234).candidateSide).toBe('right')
    expect(resolveDraggedWidgetPosition(600, 20, 18, 75, 1200, 1000, 234).candidateSide).toBe('top')
    expect(resolveDraggedWidgetPosition(600, 990, 18, 75, 1200, 1000, 234).candidateSide).toBe('bottom')
  })

  it('does not magnetically capture the widget when docking guides are disabled', () => {
    expect(resolveDraggedWidgetPosition(600, 125, 18, 75, 1200, 1000, 234, 54, false)).toEqual({
      candidateSide: undefined,
      left: 582,
      side: 'right',
      top: 50
    })
    expect(resolveDraggedWidgetPosition(1110, 500, 18, 75, 1200, 1000, 234, 54, false)).toEqual({
      candidateSide: undefined,
      left: 1092,
      side: 'right',
      top: 425
    })
  })

  it('aligns horizontal popovers to the provider and chooses above or below', () => {
    expect(resolveHorizontalPopoverPosition(500, 100, 54, 2, 108, 1200, 1000)).toEqual({
      left: 491,
      placement: 'bottom',
      top: 154
    })
    expect(resolveHorizontalPopoverPosition(500, 900, 54, 2, 108, 1200, 1000)).toEqual({
      left: 491,
      placement: 'top',
      top: 786
    })
    expect(resolveHorizontalPopoverPosition(500, 550, 54, 2, 108, 1200, 1000)).toEqual({
      left: 491,
      placement: 'top',
      top: 436
    })
    expect(resolveHorizontalPopoverPosition(8, 100, 54, 0, 108, 1200, 1000).left).toBe(8)
  })

  it('uses a turned horizontal thumb as the popover boundary', () => {
    const topRight = keepHorizontalPopoverOutsideTurnedThumb(
      { left: 884, placement: 'top', top: 786 },
      958,
      234,
      undefined,
      'top',
      1200
    )
    expect(topRight.left).toBe(844)
    expect(topRight.left + 300).toBe(958 + 234 - 42 - 6)

    const bottomLeft = keepHorizontalPopoverOutsideTurnedThumb(
      { left: 8, placement: 'bottom', top: 62 },
      8,
      234,
      'bottom',
      undefined,
      1200
    )
    expect(bottomLeft.left).toBe(56)
  })

  it('tucks the widget into the edge that matches its orientation', () => {
    expect(resolveEdgeCollapse('vertical', 8, 8, 54, 234, 1200, 1000)).toBe('left')
    expect(resolveEdgeCollapse('vertical', 1138, 400, 54, 234, 1200, 1000)).toBe('right')
    expect(resolveEdgeCollapse('vertical', 400, 8, 54, 234, 1200, 1000)).toBeUndefined()
    expect(resolveEdgeCollapse('vertical', 400, 758, 54, 234, 1200, 1000)).toBeUndefined()

    expect(resolveEdgeCollapse('horizontal', 8, 8, 234, 54, 1200, 1000)).toBe('top')
    expect(resolveEdgeCollapse('horizontal', 400, 938, 234, 54, 1200, 1000)).toBe('bottom')
    expect(resolveEdgeCollapse('horizontal', 8, 400, 234, 54, 1200, 1000)).toBeUndefined()
    expect(resolveEdgeCollapse('horizontal', 958, 400, 234, 54, 1200, 1000)).toBeUndefined()
  })

  it('leaves a scaled peek of the board on the screen edge', () => {
    expect(edgeCollapseOffset('left', 8, 100, 54, 234, 1200, 1000)).toEqual({ x: -48, y: 0 })
    expect(edgeCollapseOffset('right', 1138, 100, 54, 234, 1200, 1000)).toEqual({ x: 48, y: 0 })
    expect(edgeCollapseOffset('top', 100, 8, 234, 54, 1200, 1000)).toEqual({ x: 0, y: -48 })
    expect(edgeCollapseOffset('bottom', 100, 938, 234, 54, 1200, 1000)).toEqual({ x: 0, y: 48 })
    expect(collapsedWidgetRectangle('bottom', 100, 938, 234, 54, 1200, 1000)).toEqual({
      x: 100,
      y: 986,
      width: 234,
      height: 14
    })
  })

  it('keeps the full footprint until the tuck slide has finished', () => {
    const resting = { x: 8, y: 100, width: 54, height: 234 }
    expect(tuckInteractionRectangle(resting, 'left', false, 8, 100, 54, 234, 1200, 1000)).toEqual({
      x: 0,
      y: 100,
      width: 62,
      height: 234
    })
    expect(tuckInteractionRectangle(resting, 'left', true, 8, 100, 54, 234, 1200, 1000)).toEqual({
      x: 0,
      y: 100,
      width: 14,
      height: 234
    })
  })

  it('turns the app icon away from the nearest lateral edge', () => {
    expect(appIconTurn(8, 54, 1200)).toBe(16)
    expect(appIconTurn(1138, 54, 1200)).toBe(-16)
  })

  it('centers a vertical popover on the hovered provider', () => {
    expect(resolveVerticalPopoverTop(200, 1, 140, 0, 48, 1)).toBe(223)
    expect(resolveVerticalPopoverTop(100, 0, 120, 0, 48, 1.2)).toBe(94)
    expect(resolveVerticalPopoverTop(80, 2, 80, 4, 54, 1)).toBe(197)
  })

  it('uses a turned vertical thumb as the popover boundary', () => {
    expect(keepVerticalPopoverOutsideTurnedThumb(32, 140, 'left', 8, 234, 'right', undefined, 1000)).toEqual({
      maxHeight: 360,
      top: 56
    })
    expect(keepVerticalPopoverOutsideTurnedThumb(820, 140, 'right', 758, 234, undefined, 'left', 1000)).toEqual({
      maxHeight: 140,
      top: 804
    })
    expect(keepVerticalPopoverOutsideTurnedThumb(200, 140, 'left', 200, 234, 'left', undefined, 1000)).toEqual({
      maxHeight: 360,
      top: 200
    })
  })

  it('keeps a tall vertical popover outside both turned thumbs', () => {
    const gear = keepVerticalPopoverOutsideTurnedThumb(8, 400, 'right', 8, 234, 'left', undefined, 320)
    expect(gear.top).toBe(56)
    expect(gear.top + gear.maxHeight).toBeLessThanOrEqual(312)
    expect(gear.maxHeight).toBe(256)

    const grab = keepVerticalPopoverOutsideTurnedThumb(600, 200, 'right', 558, 234, undefined, 'left', 800)
    expect(grab.top).toBe(544)
    expect(grab.top + grab.maxHeight).toBe(744)

    const corner = keepVerticalPopoverOutsideTurnedThumb(8, 400, 'right', 8, 234, 'left', 'left', 250)
    expect(corner.top).toBe(56)
    expect(corner.top + corner.maxHeight).toBe(194)
  })

  it('moves freely, keeps an 8px margin, and magnetically snaps inside an edge lane', () => {
    expect(resolveDraggedWidgetPosition(600, 500, 18, 75, 1200, 1000, 234)).toEqual({
      candidateSide: undefined,
      left: 582,
      side: 'right',
      top: 425
    })
    expect(resolveDraggedWidgetPosition(40, 2, 18, 75, 1200, 1000, 234)).toEqual({
      candidateSide: 'top',
      left: 22,
      side: 'top',
      top: 8
    })
    expect(resolveDraggedWidgetPosition(1170, 999, 18, 75, 1200, 1000, 234)).toEqual({
      candidateSide: 'right',
      left: 1138,
      side: 'right',
      top: 758
    })
  })

  it('pulls the widget into the bottom lane and stops on its outer edge', () => {
    expect(resolveDraggedWidgetPosition(600, 960, 18, 75, 1200, 1000, 234)).toEqual({
      candidateSide: 'bottom',
      left: 582,
      side: 'bottom',
      top: 758
    })
  })

  it('seats the widget in the corner when a side lane meets the bottom lane', () => {
    expect(resolveDraggedWidgetPosition(26, 800, 18, 75, 1200, 1000, 234)).toEqual({
      candidateSide: 'left',
      left: 8,
      side: 'left',
      top: 758
    })
    expect(resolveDraggedWidgetPosition(1190, 990, 18, 75, 1200, 1000, 234)).toEqual({
      candidateSide: 'right',
      left: 1138,
      side: 'right',
      top: 758
    })
  })

  it('detects points inside interaction regions', () => {
    const regions = [{ x: 0, y: 400, width: 54, height: 234 }]
    expect(pointIsInsideRegions({ x: 18, y: 450 }, regions)).toBe(true)
    expect(pointIsInsideRegions({ x: 60, y: 450 }, regions)).toBe(false)
    expect(pointIsInsideRegions({ x: 18, y: 640 }, regions)).toBe(false)
  })

  it('translates KWin global coordinates into display-local regions', () => {
    const display = { x: 1600, y: 0, width: 1920, height: 1080 }
    const regions = [{ x: 0, y: 450, width: 54, height: 234 }]

    expect(globalPointIsInsideRegions({ x: 1618, y: 500 }, display, regions)).toBe(true)
    expect(globalPointIsInsideRegions({ x: 1700, y: 500 }, display, regions)).toBe(false)
    expect(globalPointIsInsideRegions({ x: 18, y: 500 }, display, regions)).toBe(false)
  })
})
