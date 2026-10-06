import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { Rectangle } from 'electron'
import { SelectionGrid } from './components/SelectionGrid/SelectionGrid'
import { UsagePopover } from './components/UsagePopover/UsagePopover'
import { Widget } from './components/Widget/Widget'
import { desktop } from './services/desktop'
import { useOverlay } from './state/OverlayContext'
import {
  type ControlTurnDirection,
  boardLongAxis,
  appIconTurn,
  edgeCollapseOffset,
  tuckInteractionRectangle,
  WIDGET_COLLAPSE_MS,
  getWidgetHeight,
  getWidgetWidth,
  getWidgetLeft,
  getWidgetTop,
  keepHorizontalPopoverOutsideTurnedThumb,
  keepVerticalPopoverOutsideTurnedThumb,
  resolveEdgeCollapse,
  normalizeWidgetCoordinate,
  POPOVER_HEIGHT_UNAVAILABLE,
  POPOVER_WIDTH,
  resolveHorizontalPopoverPosition,
  resolveVerticalPopoverTop,
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
  const [tucked, setTucked] = useState(false)
  const [collapseSettled, setCollapseSettled] = useState(false)
  const [expandSettled, setExpandSettled] = useState(true)
  const wasCollapsed = useRef(false)
  const expandSettledRef = useRef(true)
  const [resolvedPopoverHeight, setResolvedPopoverHeight] = useState<{ height: number, id: string } | undefined>(undefined)
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
  const boardLength = boardLongAxis(providers.length, itemGap)
  const baseWidgetWidth = widgetOrientation === 'horizontal' ? boardLength : getWidgetWidth(1, 'vertical', itemGap)
  const baseWidgetHeight = widgetOrientation === 'vertical' ? boardLength : getWidgetHeight(1, 'horizontal', itemGap)
  const widgetWidth = baseWidgetWidth * widgetScale
  const widgetHeight = baseWidgetHeight * widgetScale
  const freeTop = getWidgetTop(state.settings.widget.verticalPosition, viewport.height, widgetHeight)
  const maxTop = Math.max(WIDGET_MARGIN, viewport.height - widgetHeight - WIDGET_MARGIN)
  const freeLeft = getWidgetLeft(state.settings.widget.horizontalPosition, viewport.width, baseWidgetWidth)
  const persistedTop = state.settings.widget.docked && (state.settings.widget.side === 'top' || state.settings.widget.side === 'bottom')
    ? state.settings.widget.side === 'top'
      ? WIDGET_MARGIN
      : maxTop
    : Math.min(Math.max(WIDGET_MARGIN, freeTop), maxTop)
  const persistedLeft = state.settings.widget.docked && (state.settings.widget.side === 'left' || state.settings.widget.side === 'right')
    ? state.settings.widget.side === 'left'
      ? WIDGET_MARGIN
      : Math.max(WIDGET_MARGIN, viewport.width - widgetWidth - WIDGET_MARGIN)
    : Math.min(Math.max(WIDGET_MARGIN, freeLeft), Math.max(WIDGET_MARGIN, viewport.width - widgetWidth - WIDGET_MARGIN))
  const effectiveTop = state.mode === 'dragging' && state.drag ? state.drag.top : persistedTop
  const effectiveLeft = state.mode === 'dragging' && state.drag ? state.drag.left : persistedLeft
  const effectiveSide = state.mode === 'dragging' && state.drag ? state.drag.side : state.settings.widget.side
  const edgeCollapse = resolveEdgeCollapse(
    widgetOrientation,
    effectiveLeft,
    effectiveTop,
    widgetWidth,
    widgetHeight,
    viewport.width,
    viewport.height
  )
  const holdWidgetOpen = widgetHovered
    || state.mode === 'dragging'
    || state.mode === 'provider-hover'
  const showCornerChrome = widgetHovered || state.mode === 'dragging'
  const collapsed = Boolean(edgeCollapse) && tucked && !holdWidgetOpen
  const edgeGap = !edgeCollapse
    ? 0
    : edgeCollapse === 'left'
      ? effectiveLeft
      : edgeCollapse === 'right'
        ? viewport.width - effectiveLeft - widgetWidth
        : edgeCollapse === 'top'
          ? effectiveTop
          : viewport.height - effectiveTop - widgetHeight
  const collapseOffset = edgeCollapse
    ? edgeCollapseOffset(
        edgeCollapse,
        effectiveLeft,
        effectiveTop,
        widgetWidth,
        widgetHeight,
        viewport.width,
        viewport.height,
        widgetScale
      )
    : { x: 0, y: 0 }
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
  const hasUsage = hoveredProvider?.snapshot.status === 'connected' && hoveredProvider.snapshot.limits.length > 0
  const popoverHeight = !hasUsage
    ? POPOVER_HEIGHT_UNAVAILABLE
    : Math.min(
        360,
        96
          + Math.max(0, hoveredProvider.snapshot.limits.length - 1) * 64
          + hoveredProvider.snapshot.limits.filter((limit) =>
            limit.unlimited || typeof limit.used === 'number' || typeof limit.remaining === 'number'
          ).length * 18
          + hoveredProvider.snapshot.limits.length * 20
          + (hoveredProvider.snapshot.plan || hoveredProvider.snapshot.isUnlimited ? 28 : 0)
          + (hoveredProvider.snapshot.analytics?.localMetrics?.length
            ? 24 + hoveredProvider.snapshot.analytics.localMetrics.length * 14
            : 0)
      )
  const measuredPopover = resolvedPopoverHeight
  const verticalLayoutHeight = measuredPopover && measuredPopover.id === hoveredProvider?.id
    ? measuredPopover.height
    : popoverHeight
  const baseVerticalPopoverTop = resolveVerticalPopoverTop(
    effectiveTop,
    hoveredIndex,
    verticalLayoutHeight,
    cornerControls.coreShiftY,
    providerPitch,
    widgetScale
  )
  const verticalPopover = keepVerticalPopoverOutsideTurnedThumb(
    baseVerticalPopoverTop,
    verticalLayoutHeight,
    effectivePopoverSide,
    effectiveTop,
    widgetHeight,
    cornerControls.gearTurn,
    cornerControls.grabTurn,
    viewport.height,
    widgetScale
  )
  const verticalPopoverLeft = Math.min(
    Math.max(WIDGET_MARGIN, effectivePopoverSide === 'left' ? effectiveLeft + widgetWidth : effectiveLeft - POPOVER_WIDTH),
    Math.max(WIDGET_MARGIN, viewport.width - POPOVER_WIDTH - WIDGET_MARGIN)
  )
  const horizontalPopover = keepHorizontalPopoverOutsideTurnedThumb(
    resolveHorizontalPopoverPosition(
      effectiveLeft + cornerControls.coreShiftX * widgetScale,
      effectiveTop,
      widgetHeight,
      hoveredIndex,
      popoverHeight,
      viewport.width,
      viewport.height,
      providerPitch,
      widgetScale
    ),
    effectiveLeft,
    widgetWidth,
    cornerControls.gearTurn,
    cornerControls.grabTurn,
    viewport.width,
    widgetScale
  )
  const popoverPlacement = widgetOrientation === 'horizontal' ? horizontalPopover.placement : effectivePopoverSide
  const popoverTop = widgetOrientation === 'horizontal'
    ? horizontalPopover.placement === 'bottom'
      ? horizontalPopover.top
      : undefined
    : verticalPopover.top
  const popoverBottom = widgetOrientation === 'horizontal' && horizontalPopover.placement === 'top'
    ? viewport.height - effectiveTop
    : undefined
  const popoverLeft = widgetOrientation === 'horizontal' ? horizontalPopover.left : verticalPopoverLeft
  const popoverMaxHeight = widgetOrientation === 'vertical' ? verticalPopover.maxHeight : undefined
  useLayoutEffect(() => {
    const providerId = hoveredProvider?.id
    if (widgetOrientation !== 'vertical' || state.mode !== 'provider-hover' || !providerId) {
      setResolvedPopoverHeight((current) => (current === undefined ? current : undefined))
      return
    }
    const panel = popoverRef.current?.querySelector<HTMLElement>('.usage-popover, .unavailable-popover')
    if (!panel) return
    const previousMaxHeight = panel.style.maxHeight
    panel.style.maxHeight = ''
    const height = panel.offsetHeight
    panel.style.maxHeight = previousMaxHeight
    setResolvedPopoverHeight((current) =>
      current?.id === providerId && current.height === height ? current : { height, id: providerId }
    )
  }, [hoveredProvider?.id, popoverHeight, state.mode, viewport.height, widgetOrientation])
  useEffect(() => {
    if (!edgeCollapse || holdWidgetOpen) {
      setTucked(false)
      return
    }
    const timer = window.setTimeout(() => setTucked(true), 420)
    return () => window.clearTimeout(timer)
  }, [edgeCollapse, holdWidgetOpen])
  useEffect(() => {
    if (!collapsed) {
      setCollapseSettled(false)
      return
    }
    const visual = widgetRef.current?.querySelector<HTMLElement>('.widget__visual')
    if (!visual) {
      setCollapseSettled(true)
      return
    }
    const settle = (event: Event): void => {
      if (event.target !== visual || (event as TransitionEvent).propertyName !== 'transform') return
      setCollapseSettled(true)
    }
    visual.addEventListener('transitionend', settle)
    const timer = window.setTimeout(() => setCollapseSettled(true), WIDGET_COLLAPSE_MS)
    return () => {
      visual.removeEventListener('transitionend', settle)
      window.clearTimeout(timer)
    }
  }, [collapsed])
  useEffect(() => {
    if (!edgeCollapse) {
      wasCollapsed.current = false
      setExpandSettled(true)
      return
    }
    if (collapsed) {
      wasCollapsed.current = true
      setExpandSettled(false)
      return
    }
    if (!wasCollapsed.current) {
      setExpandSettled(true)
      return
    }
    setExpandSettled(false)
    const visual = widgetRef.current?.querySelector<HTMLElement>('.widget__visual')
    if (!visual) {
      wasCollapsed.current = false
      setExpandSettled(true)
      return
    }
    const finish = (event?: Event): void => {
      if (event && (event.target !== visual || (event as TransitionEvent).propertyName !== 'transform')) return
      wasCollapsed.current = false
      setExpandSettled(true)
    }
    visual.addEventListener('transitionend', finish)
    const timer = window.setTimeout(() => finish(), WIDGET_COLLAPSE_MS)
    return () => {
      visual.removeEventListener('transitionend', finish)
      window.clearTimeout(timer)
    }
  }, [collapsed, edgeCollapse])
  useEffect(() => {
    const becameSettled = expandSettled && !expandSettledRef.current
    expandSettledRef.current = expandSettled
    if (!becameSettled || state.mode === 'dragging') return
    const providerId = widgetRef.current?.querySelector<HTMLElement>('.provider-item:hover')?.dataset.providerId
    if (!providerId) return
    dispatch({ type: 'provider-hovered', providerId })
  }, [dispatch, expandSettled, state.mode])
  useEffect(() => {
    const onResize = (): void => setViewport((current) =>
      current.width === window.innerWidth && current.height === window.innerHeight
        ? current
        : { width: window.innerWidth, height: window.innerHeight }
    )
    // On Windows the main process stretches the window over the taskbar right after show,
    // which can land before this listener exists and leave the work-area height behind.
    const observer = new ResizeObserver(onResize)
    observer.observe(document.documentElement)
    window.addEventListener('resize', onResize)
    onResize()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    if (!state.settingsReady || state.mode === 'dragging') return
    const updateInteractionRegions = (): void => {
      // The OS region clips painting. Keep the full footprint until the slide finishes,
      // otherwise the exit is cut down to the peek on the first frame.
      const regions = [
        tuckInteractionRectangle(
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
          edgeCollapse,
          collapseSettled,
          effectiveLeft,
          effectiveTop,
          widgetWidth,
          widgetHeight,
          viewport.width,
          viewport.height,
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
    collapsed,
    collapseSettled,
    edgeCollapse,
    viewport.height,
    viewport.width,
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
    if (state.mode === 'dragging' || !expandSettled) return
    dispatch({ type: 'provider-hovered', providerId })
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
      const settings = await desktop.settings.update({
        widget: {
          docked: Boolean(position.candidateSide),
          horizontalPosition: normalizeWidgetCoordinate(position.left, viewport.width, baseWidgetWidth),
          side: position.side,
          verticalPosition: normalizeWidgetCoordinate(position.top, viewport.height, widgetHeight)
        }
      })
      dispatch({ type: 'drag-ended', settings })
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
    // Expand the native hit target before the pointer can leave the widget.
    // On Windows this IPC is synchronous, so a cursor sample cannot turn
    // click-through back on in the middle of the gesture.
    void desktop.overlay.startDragging()
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
        hot={showCornerChrome}
        orientation={widgetOrientation}
        itemGap={itemGap}
        scale={widgetScale}
        coreShiftX={cornerControls.coreShiftX}
        coreShiftY={cornerControls.coreShiftY}
        gearTurn={showCornerChrome ? cornerControls.gearTurn : undefined}
        grabTurn={showCornerChrome ? cornerControls.grabTurn : undefined}
        collapsedEdge={collapsed && edgeCollapse ? edgeCollapse : undefined}
        edge={edgeCollapse}
        collapseX={collapseOffset.x / widgetScale}
        collapseY={collapseOffset.y / widgetScale}
        edgeGap={edgeGap / widgetScale}
        appTurn={appIconTurn(effectiveLeft, widgetWidth, viewport.width)}
        onProviderEnter={openProvider}
        onProviderLeave={closeProviderSoon}
        onHoverChange={setWidgetHovered}
        onSettings={() => void desktop.settings.openWindow()}
        onGrabPointerDown={startDrag}
      />
      {expandSettled && state.mode === 'provider-hover' && hoveredProvider && (
        <UsagePopover
          key={hoveredProvider.id}
          ref={popoverRef}
          provider={hoveredProvider}
          placement={popoverPlacement}
          left={popoverLeft}
          top={popoverTop}
          bottom={popoverBottom}
          maxHeight={popoverMaxHeight}
          onEnter={cancelHoverClose}
          onLeave={closeProviderSoon}
        />
      )}
    </main>
  )
}
