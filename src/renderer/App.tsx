import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { Rectangle } from 'electron'
import { DEFAULT_WIDGET_SECTION } from '@shared/dashboard'
import type { OverlayDragRelay } from '@shared/ipc'
import { shadowPaintOutset } from '@shared/overlay'
import { activeSyncedTheme, syncedThemeStyle } from './utils/theme'
import { SelectionGrid } from './components/SelectionGrid/SelectionGrid'
import { AppMenuPopover } from './components/UsagePopover/AppMenuPopover'
import { UsagePopover } from './components/UsagePopover/UsagePopover'
import { Widget } from './components/Widget/Widget'
import { widgetLivesOnDisplay, type DisplayRect } from '@shared/overlayDisplay'
import { widgetDesktop as desktop } from './services/desktop'
import { readOverlayQuery } from './utils/overlayQuery'
import { useWidget } from './widget/state/useWidget'
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
  edgesSharedWithAnotherDisplay,
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
  const { state, dispatch } = useWidget()
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [widgetHovered, setWidgetHovered] = useState(false)
  const [appMenuOpen, setAppMenuOpen] = useState(false)
  const [appPointing, setAppPointing] = useState(false)
  const [tucked, setTucked] = useState(false)
  const [collapseSettled, setCollapseSettled] = useState(false)
  const [expandSettled, setExpandSettled] = useState(true)
  const [initialLayoutReady, setInitialLayoutReady] = useState(false)
  const [playEntrance, setPlayEntrance] = useState(false)
  const entrancePlayed = useRef(false)
  const wasCollapsed = useRef(false)
  const expandSettledRef = useRef(true)
  const [resolvedPopoverHeight, setResolvedPopoverHeight] = useState<{ height: number, id: string } | undefined>(undefined)
  const widgetRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<number | undefined>(undefined)
  const dragSession = useRef<
    { pointerId: number; offsetX: number; offsetY: number; native?: boolean } | undefined
  >(undefined)
  const nativeDragActive = useRef(false)
  const dragVisitRef = useRef<'here' | 'away' | null>(null)
  const draggingHere = useRef(false)
  const placement = useMemo(() => readOverlayQuery(), [])
  const [displays, setDisplays] = useState<DisplayRect[]>(placement.displays)
  const [dragStage, setDragStage] = useState<DisplayRect | undefined>()
  const layoutStageRef = useRef({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight })
  const displaysRef = useRef(displays)
  const [dragVisit, setDragVisit] = useState<'here' | 'away' | null>(null)
  const [yielded, setYielded] = useState(false)

  const providerSettings = useMemo(
    () => [...state.settings.providers].filter((provider) => provider.enabled).sort((a, b) => a.order - b.order),
    [state.settings.providers]
  )
  const providerMap = useMemo(() => new Map(state.providers.map((provider) => [provider.id, provider])), [state.providers])
  const providers = useMemo(
    () => providerSettings.flatMap((setting) => {
      const provider = providerMap.get(setting.id)
      // Loading has no real status yet. Mounting it now paints the full-color
      // icon, and the dim treatment only arrives on the next snapshot.
      if (!provider || provider.snapshot.status === 'loading') return []
      return [provider]
    }),
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
  const restingDisplay = displays.find((display) => display.id === state.settings.display?.id)
    ?? displays.find((display) => display.id === placement.displayId)
    ?? displays[0]
  const stage = state.mode === 'dragging' && dragStage ? dragStage : restingDisplay
  const stageX = stage?.x ?? 0
  const stageY = stage?.y ?? 0
  const stageWidth = stage?.width ?? viewport.width
  const stageHeight = stage?.height ?? viewport.height
  layoutStageRef.current = { x: stageX, y: stageY, width: stageWidth, height: stageHeight }
  displaysRef.current = displays
  const freeTop = getWidgetTop(state.settings.widget.verticalPosition, stageHeight, baseWidgetHeight)
  const maxTop = Math.max(WIDGET_MARGIN, stageHeight - widgetHeight - WIDGET_MARGIN)
  const freeLeft = getWidgetLeft(state.settings.widget.horizontalPosition, stageWidth, baseWidgetWidth)
  const persistedTop = state.settings.widget.docked && (state.settings.widget.side === 'top' || state.settings.widget.side === 'bottom')
    ? state.settings.widget.side === 'top'
      ? WIDGET_MARGIN
      : maxTop
    : Math.min(Math.max(WIDGET_MARGIN, freeTop), maxTop)
  const persistedLeft = state.settings.widget.docked && (state.settings.widget.side === 'left' || state.settings.widget.side === 'right')
    ? state.settings.widget.side === 'left'
      ? WIDGET_MARGIN
      : Math.max(WIDGET_MARGIN, stageWidth - widgetWidth - WIDGET_MARGIN)
    : Math.min(Math.max(WIDGET_MARGIN, freeLeft), Math.max(WIDGET_MARGIN, stageWidth - widgetWidth - WIDGET_MARGIN))
  const effectiveTop = state.mode === 'dragging' && state.drag ? state.drag.top : persistedTop
  const effectiveLeft = state.mode === 'dragging' && state.drag ? state.drag.left : persistedLeft
  const effectiveSide = state.mode === 'dragging' && state.drag ? state.drag.side : state.settings.widget.side
  const edgeCollapse = state.settings.widget.edgeTuck
    ? resolveEdgeCollapse(
        widgetOrientation,
        effectiveLeft,
        effectiveTop,
        widgetWidth,
        widgetHeight,
        stageWidth,
        stageHeight
      )
    : undefined
  const holdWidgetOpen = widgetHovered
    || appMenuOpen
    || state.mode === 'dragging'
    || state.mode === 'provider-hover'
  const showCornerChrome = widgetHovered || state.mode === 'dragging'
  const collapsed = Boolean(edgeCollapse) && tucked && !holdWidgetOpen
  // A settled tuck has to stay clipped to the peek. Padding that sliver would
  // paint the shadow of the part that already slid off the screen.
  const paintOutset = shadowPaintOutset(
    state.settings.widget.shadows && !(collapsed && collapseSettled),
    widgetScale
  )
  const edgeGap = !edgeCollapse
    ? 0
    : edgeCollapse === 'left'
      ? effectiveLeft
      : edgeCollapse === 'right'
        ? stageWidth - effectiveLeft - widgetWidth
        : edgeCollapse === 'top'
          ? effectiveTop
          : stageHeight - effectiveTop - widgetHeight
  const collapseOffset = edgeCollapse
    ? edgeCollapseOffset(
        edgeCollapse,
        effectiveLeft,
        effectiveTop,
        widgetWidth,
        widgetHeight,
        stageWidth,
        stageHeight,
        widgetScale
      )
    : { x: 0, y: 0 }
  const cornerControls = resolveCornerControlLayout(
    effectiveLeft,
    effectiveTop,
    widgetWidth,
    widgetHeight,
    stageWidth,
    stageHeight,
    widgetOrientation
  )
  const effectivePopoverSide = effectiveSide === 'left' || effectiveSide === 'right'
    ? effectiveSide
    : effectiveLeft + widgetWidth / 2 <= stageWidth / 2 ? 'left' : 'right'
  const hoveredIndex = providers.findIndex((provider) => provider.id === state.hoveredProviderId)
  const hoveredProvider = hoveredIndex >= 0 ? providers[hoveredIndex] : undefined
  const hoveredProviderSetting = providerSettings.find((setting) => setting.id === hoveredProvider?.id)
  const popoverIndex = appMenuOpen ? providers.length : hoveredIndex
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
  const popoverId = appMenuOpen ? 'app-menu' : hoveredProvider?.id
  const measuredPopover = resolvedPopoverHeight
  const verticalLayoutHeight = measuredPopover && measuredPopover.id === popoverId
    ? measuredPopover.height
    : popoverHeight
  const baseVerticalPopoverTop = resolveVerticalPopoverTop(
    effectiveTop,
    popoverIndex,
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
    stageHeight,
    widgetScale
  )
  const verticalPopoverLeft = Math.min(
    Math.max(WIDGET_MARGIN, effectivePopoverSide === 'left' ? effectiveLeft + widgetWidth : effectiveLeft - POPOVER_WIDTH),
    Math.max(WIDGET_MARGIN, stageWidth - POPOVER_WIDTH - WIDGET_MARGIN)
  )
  const horizontalPopover = keepHorizontalPopoverOutsideTurnedThumb(
    resolveHorizontalPopoverPosition(
      effectiveLeft + cornerControls.coreShiftX * widgetScale,
      effectiveTop,
      widgetHeight,
      popoverIndex,
      popoverHeight,
      stageWidth,
      stageHeight,
      providerPitch,
      widgetScale
    ),
    effectiveLeft,
    widgetWidth,
    cornerControls.gearTurn,
    cornerControls.grabTurn,
    stageWidth,
    widgetScale
  )
  const popoverPlacement = widgetOrientation === 'horizontal' ? horizontalPopover.placement : effectivePopoverSide
  const popoverTop = widgetOrientation === 'horizontal'
    ? horizontalPopover.placement === 'bottom'
      ? horizontalPopover.top
      : undefined
    : verticalPopover.top
  const popoverBottom = widgetOrientation === 'horizontal' && horizontalPopover.placement === 'top'
    ? stageHeight - effectiveTop
    : undefined
  const popoverLeft = widgetOrientation === 'horizontal' ? horizontalPopover.left : verticalPopoverLeft
  const popoverMaxHeight = widgetOrientation === 'vertical' ? verticalPopover.maxHeight : undefined
  const startupDataReady = state.settingsReady && state.providersReady
  useLayoutEffect(() => {
    if (!startupDataReady || initialLayoutReady) return
    setInitialLayoutReady(true)
  }, [initialLayoutReady, startupDataReady])
  useLayoutEffect(() => {
    if (widgetOrientation !== 'vertical' || !popoverId || (state.mode !== 'provider-hover' && !appMenuOpen)) {
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
      current?.id === popoverId && current.height === height ? current : { height, id: popoverId }
    )
  }, [appMenuOpen, popoverHeight, popoverId, state.mode, viewport.height, widgetOrientation])
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
    if (providerId) {
      dispatch({ type: 'provider-hovered', providerId })
      return
    }
    if (widgetRef.current?.querySelector('.board-app:hover')) setAppMenuOpen(true)
  }, [dispatch, expandSettled, state.mode])
  useEffect(() => {
    const onBlur = (): void => {
      if (state.mode === 'dragging') return
      const pointerStillOver = widgetRef.current?.matches(':hover') || popoverRef.current?.matches(':hover')
      if (pointerStillOver) return
      setWidgetHovered(false)
      setAppMenuOpen(false)
      setAppPointing(false)
      dispatch({ type: 'provider-left' })
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [dispatch, state.mode])

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

  const hostsWidget = widgetLivesOnDisplay(state.settings, placement)
  const widgetIsHere = true
  const liveDisplayId = useRef(placement.displayId)
  const showDockGrid = state.settings.widget.showDockGuides && dragVisit !== null
  useEffect(() => {
    if (yielded && !hostsWidget) setYielded(false)
  }, [hostsWidget, yielded])
  useLayoutEffect(() => {
    if (entrancePlayed.current || !initialLayoutReady || !hostsWidget) return
    entrancePlayed.current = true
    setPlayEntrance(true)
    const timer = window.setTimeout(() => setPlayEntrance(false), 320)
    return () => window.clearTimeout(timer)
  }, [hostsWidget, initialLayoutReady])

  useEffect(() => {
    if (!initialLayoutReady || state.mode === 'dragging' || nativeDragActive.current) return
    const updateInteractionRegions = (): void => {
      if (nativeDragActive.current) return
      if (!widgetIsHere) {
        void desktop.overlay.setInteractionRegions([])
        return
      }
      // The OS region clips painting. Keep the full footprint until the slide finishes,
      // otherwise the exit is cut down to the peek on the first frame.
      const footprint = tuckInteractionRectangle(
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
        stageWidth,
        stageHeight,
        widgetScale
      )
      const regions = [
        { ...footprint, x: footprint.x + stageX, y: footprint.y + stageY },
        state.mode === 'provider-hover' || appMenuOpen ? elementRectangle(popoverRef.current) : undefined
      ].filter((region): region is Rectangle => Boolean(region))
      void desktop.overlay.setInteractionRegions(regions, paintOutset)
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
    initialLayoutReady,
    providers.length,
    state.mode,
    state.settingsReady,
    appMenuOpen,
    state.hoveredProviderId,
    collapsed,
    collapseSettled,
    edgeCollapse,
    stageHeight,
    stageWidth,
    stageX,
    stageY,
    widgetHeight,
    widgetHovered,
    widgetOrientation,
    paintOutset,
    widgetScale,
    widgetWidth,
    widgetIsHere
  ])

  const cancelHoverClose = (): void => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
  }

  const openProvider = (providerId: string): void => {
    cancelHoverClose()
    setAppMenuOpen(false)
    if (state.mode === 'dragging' || !expandSettled) return
    dispatch({ type: 'provider-hovered', providerId })
  }

  const openAppMenu = (): void => {
    cancelHoverClose()
    setAppPointing(true)
    if (state.mode === 'dragging' || !expandSettled) return
    if (state.mode === 'provider-hover') dispatch({ type: 'provider-left' })
    setAppMenuOpen(true)
  }

  const closeAppMenuSoon = (): void => {
    cancelHoverClose()
    setAppPointing(false)
    hoverTimer.current = window.setTimeout(() => setAppMenuOpen(false), 90)
  }

  const closeProviderSoon = (): void => {
    cancelHoverClose()
    hoverTimer.current = window.setTimeout(() => dispatch({ type: 'provider-left' }), 90)
  }

  const finishDrag = useCallback(
    async (pointerX: number, pointerY: number, offsetX: number, offsetY: number): Promise<void> => {
      const frame = layoutStageRef.current
      const position = resolveDraggedWidgetPosition(
        pointerX - frame.x,
        pointerY - frame.y,
        offsetX,
        offsetY,
        frame.width,
        frame.height,
        widgetHeight,
        widgetWidth,
        state.settings.widget.showDockGuides
      )
      const finalCornerControls = resolveCornerControlLayout(
        position.left,
        position.top,
        widgetWidth,
        widgetHeight,
        frame.width,
        frame.height,
        widgetOrientation
      )
      await desktop.overlay.endDragging([
        widgetInteractionRectangle(
          position.left + frame.x,
          position.top + frame.y,
          widgetWidth,
          widgetHeight,
          widgetOrientation,
          widgetHovered ? finalCornerControls.gearTurn : undefined,
          widgetHovered ? finalCornerControls.grabTurn : undefined,
          widgetScale
        )
      ], paintOutset)
      const settings = await desktop.settings.update({
        ...((liveDisplayId.current ?? placement.displayId) == null
          ? {}
          : { display: { id: (liveDisplayId.current ?? placement.displayId)! } }),
        widget: {
          docked: Boolean(position.candidateSide),
          horizontalPosition: normalizeWidgetCoordinate(position.left, frame.width, baseWidgetWidth),
          side: position.side,
          verticalPosition: normalizeWidgetCoordinate(position.top, frame.height, baseWidgetHeight)
        }
      })
      dispatch({ type: 'drag-ended', settings })
    },
    [baseWidgetHeight, baseWidgetWidth, dispatch, paintOutset, placement.displayId, state.settings.widget.showDockGuides, widgetHeight, widgetHovered, widgetOrientation, widgetScale, widgetWidth]
  )

  const finishDragRef = useRef(finishDrag)
  finishDragRef.current = finishDrag
  const crossDrag = useRef<(phase: 'move' | 'end', relay: OverlayDragRelay) => void>(() => undefined)
  crossDrag.current = (phase, relay): void => {
    if (relay.displayId != null) liveDisplayId.current = relay.displayId
    if (relay.stage) {
      layoutStageRef.current = {
        x: relay.stage.x,
        y: relay.stage.y,
        width: relay.stage.width,
        height: relay.stage.height
      }
      setDragStage(relay.stage)
    }
    const frame = relay.stage ?? layoutStageRef.current
    if (phase === 'end') {
      nativeDragActive.current = false
      dragSession.current = undefined
      if (!relay.hosting) {
        dragVisitRef.current = null
        setDragVisit(null)
        draggingHere.current = false
        setYielded(true)
        dispatch({ type: 'drag-released' })
        void desktop.overlay.setInteractionRegions([])
        return
      }
      dragVisitRef.current = null
      setDragVisit(null)
      draggingHere.current = false
      void finishDragRef.current(relay.x, relay.y, relay.offsetX, relay.offsetY)
      return
    }

    nativeDragActive.current = true
    if (!relay.hosting) {
      if (dragVisitRef.current !== 'away') {
        dragVisitRef.current = 'away'
        setDragVisit('away')
      }
      if (draggingHere.current) {
        draggingHere.current = false
        dispatch({ type: 'drag-released' })
      }
      return
    }

    draggingHere.current = true
    if (dragVisitRef.current !== 'here') {
      dragVisitRef.current = 'here'
      setDragVisit('here')
    }
    const loose = relay.stage ? edgesSharedWithAnotherDisplay(displaysRef.current, relay.stage) : []
    const drag = resolveDraggedWidgetPosition(
      relay.x - frame.x,
      relay.y - frame.y,
      relay.offsetX,
      relay.offsetY,
      frame.width,
      frame.height,
      widgetHeight,
      widgetWidth,
      state.settings.widget.showDockGuides,
      loose
    )
    if (!drag.pulled && relay.stage) {
      const minimumLeft = WIDGET_MARGIN
      const minimumTop = WIDGET_MARGIN
      const maximumLeft = Math.max(minimumLeft, viewport.width - widgetWidth - WIDGET_MARGIN)
      const maximumTop = Math.max(minimumTop, viewport.height - widgetHeight - WIDGET_MARGIN)
      drag.left = Math.min(maximumLeft, Math.max(minimumLeft, relay.x - relay.offsetX)) - frame.x
      drag.top = Math.min(maximumTop, Math.max(minimumTop, relay.y - relay.offsetY)) - frame.y
    }
    dispatch({ type: 'drag-moved', drag })
  }

  useEffect(() => {
    if (!window.widgetDesktop) return
    const offMove = desktop.overlay.onDragMove((relay) => crossDrag.current('move', relay))
    const offEnd = desktop.overlay.onDragEnd((relay) => crossDrag.current('end', relay))
    const offDisplays = desktop.overlay.onDisplays(setDisplays)
    const endNativeDrag = (): void => {
      if (!nativeDragActive.current) return
      void desktop.overlay.dragPointerUp()
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') endNativeDrag()
    }
    window.addEventListener('pointerup', endNativeDrag)
    window.addEventListener('pointercancel', endNativeDrag)
    window.addEventListener('keydown', onKey)
    return () => {
      offMove()
      offEnd()
      offDisplays()
      window.removeEventListener('pointerup', endNativeDrag)
      window.removeEventListener('pointercancel', endNativeDrag)
      window.removeEventListener('keydown', onKey)
    }
  }, [dispatch])

  useEffect(() => {
    if (state.mode !== 'dragging') return

    const onMove = (event: PointerEvent): void => {
      const session = dragSession.current
      if (!session || session.native || event.pointerId !== session.pointerId) return
      dispatch({
        type: 'drag-moved',
        drag: resolveDraggedWidgetPosition(
          event.clientX - layoutStageRef.current.x,
          event.clientY - layoutStageRef.current.y,
          session.offsetX,
          session.offsetY,
          layoutStageRef.current.width,
          layoutStageRef.current.height,
          widgetHeight,
          widgetWidth,
          state.settings.widget.showDockGuides,
          edgesSharedWithAnotherDisplay(displaysRef.current, {
            id: -1,
            ...layoutStageRef.current
          })
        )
      })
    }
    const onUp = (event: PointerEvent): void => {
      const session = dragSession.current
      if (!session || session.native || event.pointerId !== session.pointerId) return
      dragSession.current = undefined
      dragVisitRef.current = null
      setDragVisit(null)
      void finishDrag(event.clientX, event.clientY, session.offsetX, session.offsetY)
    }
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
    const offsetX = Math.min(widgetWidth, Math.max(0, event.clientX - (effectiveLeft + stageX)))
    const offsetY = Math.min(widgetHeight, Math.max(0, event.clientY - (effectiveTop + stageY)))
    setAppMenuOpen(false)
    if (window.widgetDesktop) {
      nativeDragActive.current = true
      draggingHere.current = true
      dragVisitRef.current = 'here'
      setDragVisit('here')
      setYielded(false)
      dragSession.current = { pointerId: event.pointerId, offsetX, offsetY, native: true }
      void desktop.overlay.startDragging(offsetX, offsetY)
      return
    }
    dragVisitRef.current = 'here'
    setDragVisit('here')
    void desktop.overlay.startDragging(offsetX, offsetY)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragSession.current = { pointerId: event.pointerId, offsetX, offsetY }
    const drag = resolveDraggedWidgetPosition(
      event.clientX - stageX,
      event.clientY - stageY,
      offsetX,
      offsetY,
      stageWidth,
      stageHeight,
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
      className={`overlay-root ${initialLayoutReady || dragVisit !== null ? 'overlay-root--ready' : 'overlay-root--initializing'}${playEntrance ? ' overlay-root--enter' : ''} overlay-root--theme-${state.settings.widget.theme} overlay-root--unavailable-${state.settings.widget.unavailableStyle} overlay-root--shadows-${state.settings.widget.shadows ? 'enabled' : 'disabled'}`}
      style={{
        ...syncedThemeStyle(activeSyncedTheme(state.settings)),
        '--shadow-opacity': `${state.settings.widget.shadowOpacity}%`
      } as CSSProperties}
    >
      {showDockGrid && (displays.length > 0 ? displays : [{ id: -1, x: 0, y: 0, width: viewport.width, height: viewport.height }]).map((display) => (
        <div
          key={display.id}
          className="selection-grid-frame"
          style={{ left: display.x, top: display.y, width: display.width, height: display.height }}
        >
          <SelectionGrid candidateSide={display.id === (stage?.id ?? -1) && dragVisit !== 'away' ? state.drag?.candidateSide : undefined} />
        </div>
      ))}
      {widgetIsHere && (
        <div
          className="widget-stage"
          style={{ left: stageX, top: stageY, width: stageWidth, height: stageHeight }}
        >
          <Widget
            ref={widgetRef}
            providers={providers}
            providerSettings={providerSettings}
            side={effectiveSide}
            left={effectiveLeft}
            top={effectiveTop}
            dragging={state.mode === 'dragging'}
            snapped={Boolean(state.drag?.pulled)}
            settingsOpen={state.dashboardWindowOpen}
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
            appTurn={appIconTurn(effectiveLeft, widgetWidth, stageWidth)}
            appTurned={appPointing}
            onProviderEnter={openProvider}
            onProviderLeave={closeProviderSoon}
            onHoverChange={setWidgetHovered}
            onAppEnter={openAppMenu}
            onAppLeave={closeAppMenuSoon}
            onDashboard={() => {
              setAppMenuOpen(false)
              void desktop.dashboard.open({ page: 'dashboard' })
            }}
            onSettings={() => {
              setAppMenuOpen(false)
              void desktop.dashboard.open({ page: 'widget', section: DEFAULT_WIDGET_SECTION })
            }}
            onGrabPointerDown={startDrag}
          />
        </div>
      )}
      {widgetIsHere && expandSettled && state.mode === 'provider-hover' && hoveredProvider && (
        <UsagePopover
          key={hoveredProvider.id}
          ref={popoverRef}
          provider={hoveredProvider}
          usageDisplay={hoveredProviderSetting?.usageDisplay}
          placement={popoverPlacement}
          left={popoverLeft + stageX}
          top={popoverTop == null ? undefined : popoverTop + stageY}
          bottom={popoverBottom == null ? undefined : viewport.height - stageY - effectiveTop}
          maxHeight={popoverMaxHeight}
          onEnter={cancelHoverClose}
          onLeave={closeProviderSoon}
        />
      )}
      {widgetIsHere && expandSettled && appMenuOpen && state.mode !== 'dragging' && !hoveredProvider && (
        <div
          ref={popoverRef}
          className={`usage-popover-anchor usage-popover-anchor--${popoverPlacement}`}
          style={{
            top: popoverTop == null ? undefined : popoverTop + stageY,
            bottom: popoverBottom == null ? undefined : viewport.height - stageY - effectiveTop,
            left: popoverLeft + stageX
          }}
          onPointerEnter={cancelHoverClose}
          onPointerLeave={closeAppMenuSoon}
        >
          <AppMenuPopover style={popoverMaxHeight === undefined ? undefined : { maxHeight: popoverMaxHeight, ...(popoverMaxHeight < 96 ? { minHeight: 0 } : {}) }} />
        </div>
      )}
    </main>
  )
}
