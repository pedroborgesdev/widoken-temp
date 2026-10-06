import type { DockSide } from '@shared/settings'
import { DropZone } from './DropZone'

export function SelectionGrid({ candidateSide }: { candidateSide?: DockSide }): React.JSX.Element {
  return (
    <div className="selection-grid" data-node-id="10:6" aria-hidden="true">
      <DropZone side="left" active={candidateSide === 'left'} />
      <DropZone side="right" active={candidateSide === 'right'} />
      <DropZone side="top" active={candidateSide === 'top'} />
      <DropZone side="bottom" active={candidateSide === 'bottom'} />
    </div>
  )
}
