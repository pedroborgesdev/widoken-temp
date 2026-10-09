export function isNativeWayland(): boolean {
  return (
    process.platform === 'linux' &&
    process.env.XDG_SESSION_TYPE === 'wayland' &&
    (process.env.WIDOKEN_OZONE_PLATFORM ?? 'wayland') !== 'x11'
  )
}

export function isKdeWayland(
  nativeWayland = isNativeWayland(),
  desktop = process.env.XDG_CURRENT_DESKTOP ?? ''
): boolean {
  return nativeWayland && desktop.toLowerCase().includes('kde')
}

export function overlaySpansDesktop(
  nativeWayland = isNativeWayland(),
  desktop = process.env.XDG_CURRENT_DESKTOP ?? ''
): boolean {
  // KDE's bridge can enforce a union-sized surface on native Wayland. Keeping
  // that surface stationary avoids a compositor move whenever a drag crosses
  // displays, matching the flicker-free Windows/X11 path.
  return !nativeWayland || isKdeWayland(nativeWayland, desktop)
}
