export function percentDescription(value: number): string {
  const percent = Math.min(100, Math.max(0, value))
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(percent)}%`
}

export function readableName(value: string): string {
  return value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function resetDescription(value?: string): string {
  if (!value) return 'Reset time unavailable'
  const reset = new Date(value)
  if (Number.isNaN(reset.getTime())) return value

  const difference = reset.getTime() - Date.now()
  const minutes = Math.max(0, Math.round(difference / 60_000))
  const relative = minutes >= 1440 ? `${Math.round(minutes / 1440)} days` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  const formatted = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: minutes >= 1440 ? '2-digit' : undefined,
    day: minutes >= 1440 ? '2-digit' : undefined
  }).format(reset)
  return `Resets at ${formatted} (in ${relative})`
}
