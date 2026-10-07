import type { PointerEventHandler } from 'react'
import grabIcon from '../../assets/ui/grab.svg'

interface GrabHandleProps {
  onPointerDown: PointerEventHandler<HTMLButtonElement>
}

export function GrabHandle({ onPointerDown }: GrabHandleProps): React.JSX.Element {
  return (
    <button
      className="grab-handle"
      type="button"
      aria-label="Move widget"
      onPointerDown={onPointerDown}
    >
      <img src={grabIcon} alt="" draggable={false} />
    </button>
  )
}
