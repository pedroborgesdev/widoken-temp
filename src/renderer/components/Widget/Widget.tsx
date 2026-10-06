import { forwardRef, useLayoutEffect, useRef, type CSSProperties, type PointerEventHandler } from 'react'
import type { ProviderView } from '@shared/provider'
import type { DockSide, WidgetOrientation } from '@shared/settings'
import type { ControlTurnDirection } from '../../utils/layout'
import { GearButton } from './GearButton'
import { GrabHandle } from './GrabHandle'
import { ProviderItem } from './ProviderItem'

interface WidgetProps {
  providers: ProviderView[]
  side: DockSide
  left: number
  top: number
  dragging: boolean
  snapped: boolean
  settingsOpen: boolean
  orientation: WidgetOrientation
  itemGap: number
  scale: number
  coreShiftX: number
  coreShiftY: number
  gearTurn?: ControlTurnDirection
  grabTurn?: ControlTurnDirection
  onProviderEnter: (id: string) => void
  onProviderLeave: () => void
  onHoverChange: (hovered: boolean) => void
  onSettings: () => void
  onGrabPointerDown: PointerEventHandler<HTMLButtonElement>
}

export const Widget = forwardRef<HTMLDivElement, WidgetProps>(function Widget(
  {
    providers,
    side,
    left,
    top,
    dragging,
    snapped,
    settingsOpen,
    orientation,
    itemGap,
    scale,
    coreShiftX,
    coreShiftY,
    gearTurn,
    grabTurn,
    onProviderEnter,
    onProviderLeave,
    onHoverChange,
    onSettings,
    onGrabPointerDown
  },
  ref
) {
  const previousProviderIds = useRef<Set<string> | undefined>(undefined)
  const visualRef = useRef<HTMLDivElement>(null)
  const widgetAnimation = useRef<Animation | undefined>(undefined)
  const providerIdsSignature = providers.map((provider) => provider.id).join('|')
  const enteringProviderIds = new Set(
    previousProviderIds.current
      ? providers.filter((provider) => !previousProviderIds.current!.has(provider.id)).map((provider) => provider.id)
      : []
  )

  useLayoutEffect(() => {
    const nextProviderIds = new Set(providers.map((provider) => provider.id))
    const previousIds = previousProviderIds.current
    previousProviderIds.current = nextProviderIds
    if (!previousIds || !visualRef.current) return

    const added = [...nextProviderIds].some((id) => !previousIds.has(id))
    const removed = [...previousIds].some((id) => !nextProviderIds.has(id))
    if (!added && !removed) {
      widgetAnimation.current?.cancel()
      widgetAnimation.current = undefined
      return
    }

    widgetAnimation.current?.cancel()
    const horizontal = orientation === 'horizontal'
    const keyframes: Keyframe[] = added
      ? [
          {
            opacity: 0.68,
            transform: horizontal
              ? 'translate3d(-8px, 0, 0) scale(0.9, 0.96)'
              : 'translate3d(0, -8px, 0) scale(0.96, 0.9)'
          },
          {
            opacity: 1,
            offset: 0.58,
            transform: horizontal
              ? 'translate3d(2px, 0, 0) scale(1.035, 1.01)'
              : 'translate3d(0, 2px, 0) scale(1.01, 1.035)'
          },
          { opacity: 1, offset: 0.78, transform: 'translate3d(0, 0, 0) scale(0.992)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
        ]
      : [
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
          {
            opacity: 0.78,
            offset: 0.38,
            transform: horizontal
              ? 'translate3d(-3px, 0, 0) scale(0.94, 1.025)'
              : 'translate3d(0, -3px, 0) scale(1.025, 0.94)'
          },
          {
            opacity: 1,
            offset: 0.74,
            transform: horizontal
              ? 'translate3d(2px, 0, 0) scale(1.018, 0.99)'
              : 'translate3d(0, 2px, 0) scale(0.99, 1.018)'
          },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
        ]

    const animation = visualRef.current.animate(keyframes, {
      duration: added ? 480 : 420,
      easing: 'cubic-bezier(0.2, 0.85, 0.3, 1.15)',
      fill: 'both'
    })
    widgetAnimation.current = animation
    void animation.finished.then(() => {
      if (widgetAnimation.current !== animation) return
      animation.cancel()
      widgetAnimation.current = undefined
    }).catch(() => undefined)
  }, [orientation, providerIdsSignature])

  return (
    <div
      ref={ref}
      className={`widget widget--${side} widget--${orientation}${dragging ? ' widget--dragging' : ''}${snapped ? ' widget--snapped' : ''}${settingsOpen ? ' widget--settings-open' : ''}${gearTurn ? ` widget--gear-turn-${gearTurn}` : ''}${grabTurn ? ` widget--grab-turn-${grabTurn}` : ''}`}
      style={{
        top: top / scale,
        left: left / scale,
        '--provider-count': providers.length,
        '--provider-span': `${providers.length * 42 + Math.max(0, providers.length - 1) * itemGap}px`,
        '--provider-edge-spacing': providers.length > 0 ? '6px' : '0px',
        '--provider-gap': `${itemGap}px`,
        '--widget-scale': scale,
        '--widget-core-shift-x': `${coreShiftX}px`,
        '--widget-core-shift-y': `${coreShiftY}px`
      } as CSSProperties}
      data-node-id="9:7"
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
    >
      <div ref={visualRef} className="widget__visual">
        <div className="widget__thumb" aria-hidden="true">
          <div className="widget__thumb-segment widget__thumb-segment--gear" />
          <div className="widget__thumb-segment widget__thumb-segment--grab" />
        </div>
        <div className="widget__board" aria-hidden="true" />
        <div className="widget__content">
          <div className="widget__providers">
            {providers.map((provider) => (
              <ProviderItem
                key={provider.id}
                provider={provider}
                animateEntry={enteringProviderIds.has(provider.id)}
                onEnter={() => onProviderEnter(provider.id)}
                onLeave={onProviderLeave}
              />
            ))}
          </div>
          <div className="widget__controls">
            <GearButton onClick={onSettings} />
            <GrabHandle onPointerDown={onGrabPointerDown} />
          </div>
        </div>
      </div>
    </div>
  )
})
