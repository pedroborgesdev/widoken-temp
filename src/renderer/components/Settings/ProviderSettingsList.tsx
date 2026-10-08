import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ProviderSetting } from '@shared/settings'
import { providerLogos, providerName } from '../../utils/providerBranding'
import { SettingsSection, SettingsToggle } from './SettingsControls'

interface ProviderSettingsListProps {
  providers: ProviderSetting[]
  onToggle: (id: string) => void
  onReorder: (providerIds: string[]) => void
}

type DropPosition = { id: string; edge: 'before' | 'after' }

export function ProviderSettingsList({
  providers,
  onToggle,
  onReorder
}: ProviderSettingsListProps): React.JSX.Element {
  const ordered = [...providers].sort((a, b) => a.order - b.order)
  const draggedIdRef = useRef<string | undefined>(undefined)
  const dropPositionRef = useRef<DropPosition | undefined>(undefined)
  const [draggedId, setDraggedId] = useState<string>()
  const [dropPosition, setDropPosition] = useState<DropPosition>()

  const resetDrag = (): void => {
    draggedIdRef.current = undefined
    dropPositionRef.current = undefined
    setDraggedId(undefined)
    setDropPosition(undefined)
  }

  const reorder = (sourceId: string, targetId: string, edge: DropPosition['edge']): void => {
    if (sourceId === targetId) return
    const ids = ordered.map((provider) => provider.id)
    const withoutSource = ids.filter((id) => id !== sourceId)
    const targetIndex = withoutSource.indexOf(targetId)
    if (targetIndex < 0) return
    withoutSource.splice(targetIndex + (edge === 'after' ? 1 : 0), 0, sourceId)
    onReorder(withoutSource)
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, id: string): void => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggedIdRef.current = id
    setDraggedId(id)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>): void => {
    const sourceId = draggedIdRef.current
    if (!sourceId || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    event.preventDefault()
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.provider-setting')
    const id = row?.dataset.providerId
    if (!row || !id || sourceId === id) {
      dropPositionRef.current = undefined
      setDropPosition(undefined)
      return
    }
    const bounds = row.getBoundingClientRect()
    const nextPosition: DropPosition = {
      id,
      edge: event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
    }
    dropPositionRef.current = nextPosition
    setDropPosition(nextPosition)
  }

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    const sourceId = draggedIdRef.current
    const target = dropPositionRef.current
    if (sourceId && target) reorder(sourceId, target.id, target.edge)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    resetDrag()
  }

  const handleHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string): void => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const index = ordered.findIndex((provider) => provider.id === id)
    const target = index + (event.key === 'ArrowUp' ? -1 : 1)
    if (index < 0 || target < 0 || target >= ordered.length) return
    const ids = ordered.map((provider) => provider.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    onReorder(ids)
  }

  return (
    <SettingsSection title="Providers" description="Drag the handle to change the order in the widget.">
      <div className="grid border-t border-overlay-track">
        {ordered.map((provider) => {
          const name = providerName(provider.id)
          return (
            <div
              className={`provider-setting relative flex min-h-14 flex-wrap items-center gap-3 border-b border-overlay-track py-2 transition-[opacity,transform] duration-[120ms] ${draggedId === provider.id ? 'scale-[0.985] opacity-[0.38]' : ''} ${dropPosition?.id === provider.id && dropPosition.edge === 'before' ? 'before:absolute before:inset-x-0 before:top-[-1px] before:h-0.5 before:rounded-full before:bg-overlay-blue before:content-[""]' : ''} ${dropPosition?.id === provider.id && dropPosition.edge === 'after' ? 'after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-overlay-blue after:content-[""]' : ''}`}
              key={provider.id}
              data-provider-id={provider.id}
            >
              <button
                className="grid h-8 w-5 shrink-0 cursor-grab touch-none place-content-center gap-[3px] rounded-[5px] opacity-60 transition-[background-color,opacity] duration-[120ms] [grid-template-columns:repeat(2,3px)] [grid-auto-rows:3px] hover:bg-overlay-hover hover:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-overlay-blue active:cursor-grabbing"
                type="button"
                aria-label={`Drag ${name} to reorder`}
                aria-pressed={draggedId === provider.id}
                title="Drag to reorder"
                onPointerDown={(event) => handlePointerDown(event, provider.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={resetDrag}
                onKeyDown={(event) => handleHandleKeyDown(event, provider.id)}
              >
                <span className="size-[3px] rounded-full bg-overlay-muted" /><span className="size-[3px] rounded-full bg-overlay-muted" /><span className="size-[3px] rounded-full bg-overlay-muted" /><span className="size-[3px] rounded-full bg-overlay-muted" /><span className="size-[3px] rounded-full bg-overlay-muted" /><span className="size-[3px] rounded-full bg-overlay-muted" />
              </button>
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-overlay-elevated" aria-hidden="true">
                <img className="block size-6 object-contain" src={providerLogos[provider.id]} alt="" draggable={false} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <strong className="truncate text-sm font-medium text-overlay-strong">{name}</strong>
                <span className="text-[12.5px] text-overlay-muted">{provider.enabled ? 'Visible in widget' : 'Hidden'}</span>
              </span>
              <SettingsToggle
                checked={provider.enabled}
                label={`${provider.enabled ? 'Disable' : 'Enable'} ${name}`}
                onChange={() => onToggle(provider.id)}
              />
            </div>
          )
        })}
      </div>
    </SettingsSection>
  )
}
