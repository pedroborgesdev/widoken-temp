export function isNativeWayland(): boolean {
  return (
    process.platform === 'linux' &&
    process.env.XDG_SESSION_TYPE === 'wayland' &&
    (process.env.WIDOKEN_OZONE_PLATFORM ?? 'wayland') !== 'x11'
  )
}
