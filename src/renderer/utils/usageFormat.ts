import type { ProviderListPrice } from '@shared/provider'

export function listPriceDescription(price: ProviderListPrice): string {
  if (price.amount === 0) return 'Free list price'
  return `${new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: price.currency,
    maximumFractionDigits: 0
  }).format(price.amount)}/mo list`
}

export function relativeFuture(value: string): string {
  const difference = Date.parse(value) - Date.now()
  if (!Number.isFinite(difference) || difference <= 0) return 'soon'
  const hours = Math.round(difference / 3_600_000)
  if (hours < 24) return `in ${Math.max(1, hours)}h`
  return `in ${Math.round(hours / 24)}d`
}

/** Short countdown such as "45m", "3h 20m" or "4d 2h". */
export function compactDuration(milliseconds: number): string {
  const minutes = Math.max(0, Math.round(milliseconds / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return hours % 24 === 0 ? `${days}d` : `${days}d ${hours % 24}h`
}

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
