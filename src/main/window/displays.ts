import { powerMonitor, screen } from 'electron'

const DISPLAY_SETTLE_DELAY_MS = 500
const RESUME_SETTLE_DELAY_MS = 1_000

export function watchDisplays(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let revision = 0
  let stopped = false

  const schedule = (delay: number): void => {
    revision += 1
    const expectedRevision = revision
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (stopped || expectedRevision !== revision) return
      onChange()
    }, delay)
  }

  const onDisplayChanged = (): void => schedule(DISPLAY_SETTLE_DELAY_MS)
  const onResume = (): void => schedule(RESUME_SETTLE_DELAY_MS)
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
