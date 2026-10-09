import { describe, expect, it } from 'vitest'
import { isKdeWayland, overlaySpansDesktop } from '../../src/main/window/platform'

describe('overlay platform policy', () => {
  it('uses one continuous overlay on Windows and X11', () => {
    expect(overlaySpansDesktop(false, '')).toBe(true)
  })

  it('uses one continuous overlay on KDE Wayland to avoid cross-display window moves', () => {
    expect(isKdeWayland(true, 'KDE')).toBe(true)
    expect(overlaySpansDesktop(true, 'KDE')).toBe(true)
    expect(overlaySpansDesktop(true, 'KDE:GNOME')).toBe(true)
  })

  it('keeps the per-display fallback for Wayland compositors without a geometry bridge', () => {
    expect(isKdeWayland(true, 'GNOME')).toBe(false)
    expect(overlaySpansDesktop(true, 'GNOME')).toBe(false)
  })
})
