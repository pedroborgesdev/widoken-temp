import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { Rectangle } from 'electron'
import { SelectionGrid } from './components/SelectionGrid/SelectionGrid'
import { UsagePopover } from './components/UsagePopover/UsagePopover'
import { Widget } from './components/Widget/Widget'
import { desktop } from './services/desktop'
import { useOverlay } from './state/OverlayContext'
import {
  type ControlTurnDirection,
  getWidgetHeight,
  getWidgetWidth,
  getWidgetLeft,
  getWidgetTop,
  normalizeWidgetCoordinate,
  POPOVER_HEIGHT_UNAVAILABLE,
  POPOVER_WIDTH,
  resolveHorizontalPopoverPosition,
  resolveDraggedWidgetPosition,
  resolveCornerControlLayout,
  WIDGET_MARGIN,
} from './utils/layout'

function widgetInteractionRectangle(
  left: number,
  top: number,
  width: number,
  height: number,
  orientation: 'vertical' | 'horizontal',
  gearTurn: ControlTurnDirection | undefined,
  grabTurn: ControlTurnDirection | undefined,
  scale: number
): Rectangle {
  const turns = new Set([gearTurn, grabTurn])
  const extension = 36 * scale
  const extendedLeft = orientation === 'vertical' && turns.has('left') ? left - extension : left
  const extendedRight = orientation === 'vertical' && turns.has('right') ? left + width + extension : left + width
  const extendedTop = orientation === 'horizontal' && turns.has('top') ? top - extension : top
  const extendedBottom = orientation === 'horizontal' && turns.has('bottom') ? top + height + extension : top + height
  return {
    x: Math.floor(extendedLeft),
    y: Math.floor(extendedTop),
    width: Math.ceil(extendedRight - extendedLeft),
    height: Math.ceil(extendedBottom - extendedTop)
  }
}

function elementRectangle(element: HTMLElement | null, includeOverflow = false): Rectangle | undefined {
  if (!element) return undefined
  const rectangles = [element.getBoundingClientRect()]
  if (includeOverflow) {
    rectangles.push(
      ...[...element.querySelectorAll<HTMLElement>('.widget__thumb-segment, .gear-button, .grab-handle')]
        .map((descendant) => descendant.getBoundingClientRect())
    )
  }
  const left = Math.min(...rectangles.map((rect) => rect.left))
  const top = Math.min(...rectangles.map((rect) => rect.top))
  const right = Math.max(...rectangles.map((rect) => rect.right))
  const bottom = Math.max(...rectangles.map((rect) => rect.bottom))
  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top))
  }
}

export default function App(): React.JSX.Element {
  const { state, dispatch } = useOverlay()
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [widgetHovered, setWidgetHovered] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<number | undefined>(undefined)
  const dragSession = useRef<
    { pointerId: number; offsetX: number; offsetY: number } | undefined
  >(undefined)

  const providerSettings = useMemo(
    () => [...state.settings.providers].filter((provider) => provider.enabled).sort((a, b) => a.order - b.order),
    [state.settings.providers]
  )
  const providerMap = useMemo(() => new Map(state.providers.map((provider) => [provider.id, provider])), [state.providers])
  const providers = useMemo(
    () => providerSettings.flatMap((setting) => (providerMap.has(setting.id) ? [providerMap.get(setting.id)!] : [])),
    [providerMap, providerSettings]
  )
  const widgetOrientation = state.settings.widget.orientation
  const itemGap = state.settings.widget.itemGap
  const widgetScale = state.settings.widget.scale / 100
  const providerPitch = 42 + itemGap
  const baseWidgetWidth = getWidgetWidth(providers.length, widgetOrientation, itemGap)
  const baseWidgetHeight = getWidgetHeight(providers.length, widgetOrientation, itemGap)
  const widgetWidth = baseWidgetWidth * widgetScale
  const widgetHeight = baseWidgetHeight * widgetScale
  const freeTop = getWidgetTop(state.settings.widget.verticalPosition, viewport.height, baseWidgetHeight)
  const freeLeft = getWidgetLeft(state.settings.widget.horizontalPosition, viewport.width, baseWidgetWidth)
  const persistedTop = state.settings.widget.docked && (state.settings.widget.side === 'top' || state.settings.widget.side === 'bottom')
    ? state.settings.widget.side === 'top'
      ? WIDGET_MARGIN
      : Math.max(WIDGET_MARGIN, viewport.height - widgetHeight - WIDGET_MARGIN)
    : Math.min(Math.max(WIDGET_MARGIN, freeTop), Math.max(WIDGET_MARGIN, viewport.height - widgetHeight - WIDGET_MARGIN))
  const persistedLeft = state.settings.widget.docked && (state.settings.widget.side === 'left' || state.settings.widget.side === 'right')
    ? state.settings.widget.side === 'left'
      ? WIDGET_MARGIN
      : Math.max(WIDGET_MARGIN, viewport.width - widgetWidth - WIDGET_MARGIN)
    : Math.min(Math.max(WIDGET_MARGIN, freeLeft), Math.max(WIDGET_MARGIN, viewport.width - widgetWidth - WIDGET_MARGIN))
  const effectiveTop = state.mode === 'dragging' && state.drag ? state.drag.top : persistedTop
  const effectiveLeft = state.mode === 'dragging' && state.drag ? state.drag.left : persistedLeft
  const effectiveSide = state.mode === 'dragging' && state.drag ? state.drag.side : state.settings.widget.side
  const cornerControls = resolveCornerControlLayout(
    effectiveLeft,
    effectiveTop,
    widgetWidth,
    widgetHeight,
    viewport.width,
    viewport.height,
    widgetOrientation
  )
  const effectivePopoverSide = effectiveSide === 'left' || effectiveSide === 'right'
    ? effectiveSide
    : effectiveLeft + widgetWidth / 2 <= viewport.width / 2 ? 'left' : 'right'
  const hoveredIndex = providers.findIndex((provider) => provider.id === state.hoveredProviderId)
  const hoveredProvider = hoveredIndex >= 0 ? providers[hoveredIndex] : undefined
  const hoveredOffset = Math.max(0, hoveredIndex) * providerPitch * widgetScale
  const hasUsage = hoveredProvider?.snapshot.status === 'connected' && hoveredProvider.snapshot.limits.length > 0
  const popoverHeight = !hasUsage
    ? POPOVER_HEIGHT_UNAVAILABLE
    : Math.min(
        280,
        78
          + Math.max(0, hoveredProvider.snapshot.limits.length - 1) * 50
          + hoveredProvider.snapshot.limits.filter((limit) =>
            limit.unlimited || typeof limit.used === 'number' || typeof limit.remaining === 'number'
          ).length * 15
          + hoveredProvider.snapshot.limits.length * 16
          + (hoveredProvider.snapshot.plan || hoveredProvider.snapshot.isUnlimited ? 24 : 0)
          + (hoveredProvider.snapshot.analytics?.localMetrics?.length
            ? 20 + hoveredProvider.snapshot.analytics.localMetrics.length * 11
            : 0)
      )
  const verticalPopoverTop = Math.min(
    Math.max(6, effectiveTop + (24 + cornerControls.coreShiftY) * widgetScale + hoveredOffset),
    Math.max(6, viewport.height - popoverHeight - 6)
  )
  const verticalPopoverLeft = Math.min(
    Math.max(WIDGET_MARGIN, effectivePopoverSide === 'left' ? effectiveLeft + widgetWidth : effectiveLeft - POPOVER_WIDTH),
    Math.max(WIDGET_MARGIN, viewport.width - POPOVER_WIDTH - WIDGET_MARGIN)
  )
  const horizontalPopover = resolveHorizontalPopoverPosition(
    effectiveLeft + cornerControls.coreShiftX * widgetScale,
    effectiveTop,
    widgetHeight,
    hoveredIndex,
    popoverHeight,
    viewport.width,
    viewport.height,
    providerPitch,
    widgetScale
  )
  const popoverPlacement = widgetOrientation === 'horizontal' ? horizontalPopover.placement : effectivePopoverSide
  const popoverTop = widgetOrientation === 'horizontal'
    ? horizontalPopover.placement === 'bottom'
      ? horizontalPopover.top
      : undefined
    : verticalPopoverTop
  const popoverBottom = widgetOrientation === 'horizontal' && horizontalPopover.placement === 'top'
    ? viewport.height - effectiveTop
    : undefined
  const popoverLeft = widgetOrientation === 'horizontal' ? horizontalPopover.left : verticalPopoverLeft
  useEffect(() => {
    const onResize = (): void => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!state.settingsReady || state.mode === 'dragging') return
    const updateInteractionRegions = (): void => {
      const regions = [
        widgetInteractionRectangle(
          effectiveLeft,
          effectiveTop,
          widgetWidth,
          widgetHeight,
          widgetOrientation,
          widgetHovered ? cornerControls.gearTurn : undefined,
          widgetHovered ? cornerControls.grabTurn : undefined,
          widgetScale
        ),
        state.mode === 'provider-hover' ? elementRectangle(popoverRef.current) : undefined
      ].filter((region): region is Rectangle => Boolean(region))
      void desktop.overlay.setInteractionRegions(regions)
    }
    const widget = widgetRef.current
    widget?.addEventListener('transitionend', updateInteractionRegions)
    const frame = window.requestAnimationFrame(updateInteractionRegions)
    const transitionTimer = window.setTimeout(updateInteractionRegions, 280)
    return () => {
      widget?.removeEventListener('transitionend', updateInteractionRegions)
      window.cancelAnimationFrame(frame)
      window.clearTimeout(transitionTimer)
    }
  }, [
    effectiveLeft,
    effectiveSide,
    effectiveTop,
    providers.length,
    state.mode,
    state.settingsReady,
    state.hoveredProviderId,
    widgetHeight,
    widgetHovered,
    widgetOrientation,
    widgetScale,
    widgetWidth
  ])

  const cancelHoverClose = (): void => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
  }

  const openProvider = (providerId: string): void => {
    cancelHoverClose()
    if (state.mode !== 'dragging') dispatch({ type: 'provider-hovered', providerId })
  }

  const closeProviderSoon = (): void => {
    cancelHoverClose()
    hoverTimer.current = window.setTimeout(() => dispatch({ type: 'provider-left' }), 90)
  }

  const finishDrag = useCallback(
    async (event: PointerEvent): Promise<void> => {
      const session = dragSession.current
      if (!session || event.pointerId !== session.pointerId) return
      dragSession.current = undefined

      const position = resolveDraggedWidgetPosition(
        event.clientX,
        event.clientY,
        session.offsetX,
        session.offsetY,
        viewport.width,
        viewport.height,
        widgetHeight,
        widgetWidth,
        state.settings.widget.showDockGuides
      )
      const settings = await desktop.settings.update({
        widget: {
          docked: Boolean(position.candidateSide),
          horizontalPosition: normalizeWidgetCoordinate(position.left, viewport.width, baseWidgetWidth),
          side: position.side,
          verticalPosition: normalizeWidgetCoordinate(position.top, viewport.height, baseWidgetHeight)
        }
      })
      dispatch({ type: 'drag-ended', settings })
      const finalCornerControls = resolveCornerControlLayout(
        position.left,
        position.top,
        widgetWidth,
        widgetHeight,
        viewport.width,
        viewport.height,
        widgetOrientation
      )
      await desktop.overlay.endDragging([
        widgetInteractionRectangle(
          position.left,
          position.top,
          widgetWidth,
          widgetHeight,
          widgetOrientation,
          widgetHovered ? finalCornerControls.gearTurn : undefined,
          widgetHovered ? finalCornerControls.grabTurn : undefined,
          widgetScale
        )
      ])
    },
    [baseWidgetHeight, baseWidgetWidth, dispatch, state.settings.widget.showDockGuides, viewport.height, viewport.width, widgetHeight, widgetHovered, widgetOrientation, widgetScale, widgetWidth]
  )

  useEffect(() => {
    if (state.mode !== 'dragging') return

    const onMove = (event: PointerEvent): void => {
      const session = dragSession.current
      if (!session || event.pointerId !== session.pointerId) return
      dispatch({
        type: 'drag-moved',
        drag: resolveDraggedWidgetPosition(
          event.clientX,
          event.clientY,
          session.offsetX,
          session.offsetY,
          viewport.width,
          viewport.height,
          widgetHeight,
          widgetWidth,
          state.settings.widget.showDockGuides
        )
      })
    }
    const onUp = (event: PointerEvent): void => void finishDrag(event)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dispatch, finishDrag, state.mode, state.settings.widget.showDockGuides, viewport.height, viewport.width, widgetHeight, widgetWidth])

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const offsetX = Math.min(widgetWidth, Math.max(0, event.clientX - effectiveLeft))
    const offsetY = Math.min(widgetHeight, Math.max(0, event.clientY - effectiveTop))
    dragSession.current = {
      pointerId: event.pointerId,
      offsetX,
      offsetY
    }
    const drag = resolveDraggedWidgetPosition(
      event.clientX,
      event.clientY,
      offsetX,
      offsetY,
      viewport.width,
      viewport.height,
      widgetHeight,
      widgetWidth,
      state.settings.widget.showDockGuides
    )
    dispatch({
      type: 'drag-started',
      drag
    })
    void desktop.overlay.startDragging()
  }

  return (
    <main
      className={`overlay-root overlay-root--theme-${state.settings.widget.theme} overlay-root--unavailable-${state.settings.widget.unavailableStyle} overlay-root--shadows-${state.settings.widget.shadows ? 'enabled' : 'disabled'}`}
      style={{ '--shadow-opacity': `${state.settings.widget.shadowOpacity}%` } as CSSProperties}
    >
      {state.mode === 'dragging' && state.settings.widget.showDockGuides && (
        <SelectionGrid candidateSide={state.drag?.candidateSide} />
      )}
      <Widget
        ref={widgetRef}
        providers={providers}
        side={effectiveSide}
        left={effectiveLeft}
        top={effectiveTop}
        dragging={state.mode === 'dragging'}
        snapped={Boolean(state.drag?.candidateSide)}
        settingsOpen={state.settingsWindowOpen}
        orientation={widgetOrientation}
        itemGap={itemGap}
        scale={widgetScale}
        coreShiftX={cornerControls.coreShiftX}
        coreShiftY={cornerControls.coreShiftY}
        gearTurn={cornerControls.gearTurn}
        grabTurn={cornerControls.grabTurn}
        onProviderEnter={openProvider}
        onProviderLeave={closeProviderSoon}
        onHoverChange={setWidgetHovered}
        onSettings={() => void desktop.settings.openWindow()}
        onGrabPointerDown={startDrag}
      />
      {state.mode === 'provider-hover' && hoveredProvider && (
        <UsagePopover
          key={hoveredProvider.id}
          ref={popoverRef}
          provider={hoveredProvider}
          placement={popoverPlacement}
          left={popoverLeft}
          top={popoverTop}
          bottom={popoverBottom}
          onEnter={cancelHoverClose}
          onLeave={closeProviderSoon}
        />
      )}
    </main>
  )
}
