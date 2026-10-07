import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ProviderSetting } from '@shared/settings'
import antigravityLogo from '../../assets/providers/antigravity.png'
import claudeLogo from '../../assets/providers/claude.png'
import cursorLogo from '../../assets/providers/cursor.png'
import copilotLogo from '../../assets/providers/github-copilot.png'
import openaiLogo from '../../assets/providers/openai.png'
import { SettingsSection } from './SettingsControls'

const providerNames: Record<string, string> = {
  claude: 'Claude',
  openai: 'ChatGPT',
  cursor: 'Cursor',
  antigravity: 'Antigravity',
  copilot: 'GitHub Copilot'
}

const providerLogos: Record<string, string> = {
  claude: claudeLogo,
  openai: openaiLogo,
  cursor: cursorLogo,
  antigravity: antigravityLogo,
  copilot: copilotLogo
}

interface ProviderSettingsListProps {
  providers: ProviderSetting[]
  onToggle: (id: string) => void
  onReorder: (providerIds: string[]) => void
}

type DropPosition = { id: string; edge: 'before' | 'after' }

export function ProviderSettingsList({ providers, onToggle, onReorder }: ProviderSettingsListProps): React.JSX.Element {
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
      <div className="provider-settings-list">
        {ordered.map((provider) => {
          const name = providerNames[provider.id] ?? provider.id
          const dropClass = dropPosition?.id === provider.id
            ? ` provider-setting--drop-${dropPosition.edge}`
            : ''
          return (
            <div
              className={`provider-setting${draggedId === provider.id ? ' provider-setting--dragging' : ''}${dropClass}`}
              key={provider.id}
              data-provider-id={provider.id}
            >
              <button
                className="provider-setting__drag-handle"
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
                <span /><span /><span /><span /><span /><span />
              </button>
              <span className="provider-setting__icon-shell" aria-hidden="true">
                <img src={providerLogos[provider.id]} alt="" draggable={false} />
              </span>
              <span className="provider-setting__identity">
                <strong>{name}</strong>
                <span>{provider.enabled ? 'Visible in widget' : 'Hidden'}</span>
              </span>
              <label className="settings-switch">
                <input
                  className="settings-switch__input"
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={() => onToggle(provider.id)}
                  aria-label={`${provider.enabled ? 'Disable' : 'Enable'} ${name}`}
                />
                <span aria-hidden="true" />
              </label>
            </div>
          )
        })}
      </div>
    </SettingsSection>
  )
}
