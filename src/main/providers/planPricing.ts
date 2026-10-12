import type { ProviderListPrice } from '@shared/provider'

const PRICE_CATALOG_DATE = '2026-10-05'

function normalizePlan(value?: string): string | undefined {
  return value?.trim().toLowerCase().replaceAll('+', ' plus').replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Reference monthly list price for the plan a provider reports, when it is known. */
export function planListPrice(providerId: string, plan?: string): ProviderListPrice | undefined {
  const normalized = normalizePlan(plan)
  if (!normalized) return undefined
  const prices: Record<string, number> = {
    'openai:free': 0,
    'openai:plus': 20,
    'cursor:hobby': 0,
    'cursor:free': 0,
    'cursor:pro': 20,
    'cursor:pro plus': 60,
    'cursor:proplus': 60,
    'cursor:ultra': 200,
    'copilot:free': 0,
    'copilot:student': 0,
    'copilot:pro': 10,
    'copilot:pro plus': 39,
    'copilot:proplus': 39,
    'copilot:max': 100
  }
  const amount = prices[`${providerId}:${normalized}`]
  return amount === undefined
    ? undefined
    : { amount, currency: 'USD', interval: 'month', asOf: PRICE_CATALOG_DATE }
}
