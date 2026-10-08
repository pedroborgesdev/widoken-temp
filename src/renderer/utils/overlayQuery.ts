import { parseDisplayRects, type DisplayRect, type OverlayPlacement } from '@shared/overlayDisplay'

export function readOverlayQuery(search = window.location.search): OverlayPlacement & { displays: DisplayRect[] } {
  const params = new URLSearchParams(search)
  const displayId = Number(params.get('displayId'))
  return {
    displayId: Number.isInteger(displayId) && displayId >= 0 ? displayId : undefined,
    home: params.get('home') === '1',
    displays: parseDisplayRects(params.get('displays'))
  }
}
