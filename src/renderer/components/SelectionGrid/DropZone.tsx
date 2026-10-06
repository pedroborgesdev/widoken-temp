import type { DockSide } from '@shared/settings'

interface DropZoneProps {
  side: DockSide
  active: boolean
}

export function DropZone({ side, active }: DropZoneProps): React.JSX.Element {
  return (
    <div className={`drop-zone drop-zone--${side}${active ? ' drop-zone--active' : ''}`} />
  )
}
