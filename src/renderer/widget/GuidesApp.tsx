import { useEffect, useRef, useState } from 'react'
import { SelectionGrid } from '../components/SelectionGrid/SelectionGrid'
import { widgetDesktop } from '../services/desktop'

export function GuidesApp(): React.JSX.Element {
  const [showGrid, setShowGrid] = useState(false)
  const dragging = useRef(false)

  useEffect(() => {
    const offMove = widgetDesktop.overlay.onDragMove((relay) => {
      dragging.current = true
      setShowGrid(relay.showGrid !== false)
    })
    const offEnd = widgetDesktop.overlay.onDragEnd(() => {
      dragging.current = false
      setShowGrid(false)
    })
    const endDrag = (): void => {
      if (!dragging.current) return
      void widgetDesktop.overlay.dragPointerUp()
    }
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      offMove()
      offEnd()
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [])

  return (
    <main className="overlay-root overlay-root--ready">
      {showGrid && <SelectionGrid />}
    </main>
  )
}
