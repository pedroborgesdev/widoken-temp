import type { UsageLimit } from './provider'
import type { ProviderUsageDisplay } from './settings'

export interface UsageLimitOption {
  id: string
  label: string
  aliases?: string[]
}

export const PROVIDER_USAGE_LIMITS: Record<string, UsageLimitOption[]> = {
  claude: [
    { id: 'session', label: 'Current session', aliases: ['five_hour'] },
    { id: 'weekly', label: 'Weekly limit', aliases: ['seven_day', 'weekly_all'] }
  ],
  openai: [
    { id: 'primary', label: 'Primary window' },
    { id: 'secondary', label: 'Secondary window' }
  ],
  cursor: [
    { id: 'auto', label: 'Cursor Models' },
    { id: 'api', label: 'Other Models' },
    { id: 'on-demand', label: 'On-demand usage' },
    { id: 'included', label: 'Included usage' }
  ],
  copilot: [
    { id: 'premium_interactions', label: 'Premium requests' },
    { id: 'chat', label: 'Chat requests' },
    { id: 'completions', label: 'Completions' }
  ],
  antigravity: [
    { id: 'gemini', label: 'Gemini models', aliases: ['models'] },
    { id: 'partner', label: 'Partner models' },
    { id: 'prompt-credits', label: 'Prompt credits' },
    { id: 'flow-credits', label: 'Flow credits' }
  ]
}

export interface DisplayedUsageLimit {
  limit: UsageLimit
  side?: 'left' | 'right'
}

function resolveLimit(
  providerId: string,
  configuredId: string | undefined,
  limits: UsageLimit[]
): UsageLimit | undefined {
  if (!configuredId) return undefined
  const option = PROVIDER_USAGE_LIMITS[providerId]?.find((candidate) => candidate.id === configuredId)
  const ids = [configuredId, ...(option?.aliases ?? [])]
  return limits.find((limit) => ids.includes(limit.id) && !limit.unlimited)
}

export function displayedUsageLimits(
  providerId: string,
  limits: UsageLimit[],
  display?: ProviderUsageDisplay
): DisplayedUsageLimit[] {
  const metered = limits.filter((limit) => !limit.unlimited)
  if (metered.length === 0) return []

  const primary = resolveLimit(providerId, display?.primaryLimitId, metered) ?? metered[0]
  if (!display?.split) return [{ limit: primary }]

  const secondary = resolveLimit(providerId, display.secondaryLimitId, metered)
    ?? metered.find((limit) => limit.id !== primary.id)
  if (!secondary || secondary.id === primary.id) return [{ limit: primary }]
  return [
    { limit: primary, side: 'left' },
    { limit: secondary, side: 'right' }
  ]
}
