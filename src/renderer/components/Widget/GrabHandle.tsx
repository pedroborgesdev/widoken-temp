import type { PointerEventHandler } from 'react'
import grabIcon from '../../assets/ui/grab.svg'

export function GrabHandle({ onPointerDown }: { onPointerDown: PointerEventHandler<HTMLButtonElement> }): React.JSX.Element {
  return (
    <button className="grab-handle" type="button" aria-label="Move widget" onPointerDown={onPointerDown}>
      <img src={grabIcon} alt="" draggable={false} />
    </button>
  )
}
