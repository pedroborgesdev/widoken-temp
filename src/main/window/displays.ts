import { powerMonitor, screen, type BrowserWindow, type Rectangle } from 'electron'
import type { AppSettings } from '@shared/settings'
import { resolveTargetDisplay } from './createOverlayWindow'
import { updateInteractionWindowBounds } from './interactionRegions'

const DISPLAY_SETTLE_DELAY_MS = 500
const RESUME_SETTLE_DELAY_MS = 1_000

type TargetBoundsChanged = (bounds: Rectangle, force: boolean) => void | Promise<void>

export function watchTargetDisplay(
  window: BrowserWindow,
  getSettings: () => Promise<AppSettings>,
  onTargetBoundsChanged?: TargetBoundsChanged
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let revision = 0
  let stopped = false

  const reconcileBounds = async (expectedRevision: number, force: boolean): Promise<void> => {
    try {
      const settings = await getSettings()
      if (stopped || expectedRevision !== revision || window.isDestroyed()) return

      const display = resolveTargetDisplay(settings)
      const bounds = { ...display.bounds }
      window.setBounds(bounds, false)
      updateInteractionWindowBounds(window, bounds)
      await onTargetBoundsChanged?.(bounds, force)
    } catch (error) {
      console.warn('Could not reconcile overlay display bounds:', error)
    }
  }

  const scheduleReconciliation = (delay: number): void => {
    revision += 1
    const expectedRevision = revision
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void reconcileBounds(expectedRevision, true), delay)
  }

  const onDisplayChanged = (): void => scheduleReconciliation(DISPLAY_SETTLE_DELAY_MS)
  const onResume = (): void => scheduleReconciliation(RESUME_SETTLE_DELAY_MS)
  screen.on('display-added', onDisplayChanged)
  screen.on('display-removed', onDisplayChanged)
  screen.on('display-metrics-changed', onDisplayChanged)
  powerMonitor.on('resume', onResume)

  return () => {
    stopped = true
    revision += 1
    if (timer) clearTimeout(timer)
    screen.off('display-added', onDisplayChanged)
    screen.off('display-removed', onDisplayChanged)
    screen.off('display-metrics-changed', onDisplayChanged)
    powerMonitor.off('resume', onResume)
  }
}
