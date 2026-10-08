import type { ProviderSnapshot, UsageLimit } from '@shared/provider'
import type { ProviderAdapter } from './ProviderAdapter'
import { AntigravityActivityProbe } from './AntigravityActivityProbe'
import {
  discoverAntigravityLanguageServers,
  type AntigravityLanguageServer
} from './AntigravityDiscovery'

const SERVICE_PATH = '/exa.language_server_pb.LanguageServerService/GetUserStatus'
const CSRF_HEADER = 'x-codeium-csrf-token'

interface QuotaInfo {
  remainingFraction?: number
  resetTime?: string
}

interface ModelConfig {
  label?: string
  modelOrAlias?: { model?: string }
  quotaInfo?: QuotaInfo
}

interface PlanInfo {
  planName?: string
  monthlyPromptCredits?: number
  monthlyFlowCredits?: number
  monthlyFlexCreditPurchaseAmount?: number
  canBuyMoreCredits?: boolean
}

interface PlanStatus {
  planInfo?: PlanInfo
  availablePromptCredits?: number
  availableFlowCredits?: number
}

interface UserStatusResponse {
  userStatus?: {
    name?: string
    email?: string
    planStatus?: PlanStatus
    cascadeModelConfigData?: {
      clientModelConfigs?: ModelConfig[]
    }
  }
}

interface QuotaPool {
  id: string
  label: string
  remainingFraction: number
  resetTime?: string
  models: string[]
}

// ---------------------------------------------------------------------------
// Quota parsing
// ---------------------------------------------------------------------------

function poolId(remainingFraction: number, resetTime: string | undefined): string {
  return `${remainingFraction.toFixed(8)}:${resetTime ?? ''}`
}

function isGeminiModel(label: string): boolean {
  return /gemini/i.test(label)
}

function classifyPools(models: ModelConfig[]): QuotaPool[] {
  const byKey = new Map<string, QuotaPool>()

  for (const model of models) {
    const qi = model.quotaInfo
    if (!qi || typeof qi.remainingFraction !== 'number') continue

    const key = poolId(qi.remainingFraction, qi.resetTime)
    let pool = byKey.get(key)
    if (!pool) {
      const gemini = isGeminiModel(model.label ?? '')
      pool = {
        id: gemini ? 'gemini' : 'partner',
        label: gemini ? 'Gemini models' : 'Partner models',
        remainingFraction: qi.remainingFraction,
        resetTime: qi.resetTime,
        models: []
      }
      byKey.set(key, pool)
    }
    pool.models.push(model.label ?? model.modelOrAlias?.model ?? 'unknown')
  }

  // If all models share the same pool, label it as a single "Models" pool
  if (byKey.size === 1) {
    const single = [...byKey.values()][0]
    single.id = 'models'
    single.label = 'All models'
  }

  return [...byKey.values()]
}

function parseReset(value?: string): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined
  return new Date(value).toISOString()
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

export function parseAntigravityUsage(response: UserStatusResponse): UsageLimit[] {
  const status = response.userStatus
  if (!status) return []

  const models = status.cascadeModelConfigData?.clientModelConfigs ?? []
  const pools = classifyPools(models)

  const limits: UsageLimit[] = pools.map((pool) => ({
    id: pool.id,
    label: pool.label,
    percent: roundPercent(Math.min(100, Math.max(0, (1 - pool.remainingFraction) * 100))),
    resetsAt: parseReset(pool.resetTime)
  }))

  // Add credits as metered limits when available
  const plan = status.planStatus
  if (plan?.planInfo) {
    const monthlyPrompt = plan.planInfo.monthlyPromptCredits
    const availablePrompt = plan.availablePromptCredits
    if (typeof monthlyPrompt === 'number' && monthlyPrompt > 0 && typeof availablePrompt === 'number') {
      const used = Math.max(0, monthlyPrompt - availablePrompt)
      limits.push({
        id: 'prompt-credits',
        label: 'Prompt credits',
        percent: roundPercent(Math.min(100, Math.max(0, (used / monthlyPrompt) * 100))),
        used,
        limit: monthlyPrompt,
        remaining: Math.max(0, availablePrompt)
      })
    }

    const monthlyFlow = plan.planInfo.monthlyFlowCredits
    const availableFlow = plan.availableFlowCredits
    if (typeof monthlyFlow === 'number' && monthlyFlow > 0 && typeof availableFlow === 'number') {
      const used = Math.max(0, monthlyFlow - availableFlow)
      limits.push({
        id: 'flow-credits',
        label: 'Flow credits',
        percent: roundPercent(Math.min(100, Math.max(0, (used / monthlyFlow) * 100))),
        used,
        limit: monthlyFlow,
        remaining: Math.max(0, availableFlow)
      })
    }
  }

  return limits
}

// ---------------------------------------------------------------------------
// Provider adapter
// ---------------------------------------------------------------------------

export class AntigravityProviderAdapter implements ProviderAdapter {
  readonly id = 'antigravity'
  readonly name = 'Antigravity'
  private connected = true
  private lastServer?: AntigravityLanguageServer
  private readonly activityProbe = new AntigravityActivityProbe()

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.lastServer = undefined
  }

  async isConnected(): Promise<boolean> {
    if (!this.connected) return false
    const servers = await this.languageServers()
    for (const server of servers) {
      try {
        const response = await fetch(this.serverUrl(server, '/healthz'), {
          signal: AbortSignal.timeout(2_000)
        })
        if (response.ok) {
          this.lastServer = server
          return true
        }
      } catch {
        // Another discovered Antigravity session may still be reachable.
      }
    }
    this.lastServer = undefined
    return false
  }

  async isActive(): Promise<boolean> {
    return this.activityProbe.isActive()
  }

  async getUsage(): Promise<ProviderSnapshot> {
    if (!this.connected) {
      return { providerId: this.id, status: 'disconnected', limits: [], lastUpdatedAt: new Date().toISOString() }
    }

    const servers = await this.languageServers()
    if (servers.length === 0) {
      return {
        providerId: this.id,
        status: 'unavailable',
        limits: [],
        lastUpdatedAt: new Date().toISOString(),
        error: 'Antigravity is not running. Start it with the agy CLI or IDE integration.'
      }
    }

    let rejected = false
    let receivedStatus = false
    for (const server of servers) {
      try {
        const response = await fetch(this.serverUrl(server, SERVICE_PATH), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [CSRF_HEADER]: server.csrfToken
          },
          body: '{}',
          signal: AbortSignal.timeout(5_000)
        })

        if (response.status === 401 || response.status === 403) {
          rejected = true
          continue
        }
        if (!response.ok) continue

        const payload = (await response.json()) as UserStatusResponse
        receivedStatus = true
        const limits = parseAntigravityUsage(payload)
        if (limits.length === 0) continue

        this.lastServer = server
        return {
          providerId: this.id,
          status: 'connected',
          limits,
          lastUpdatedAt: new Date().toISOString(),
          plan: payload.userStatus?.planStatus?.planInfo?.planName
        }
      } catch {
        // Processes can disappear between discovery and the request. Try every session.
      }
    }

    this.lastServer = undefined
    return {
      providerId: this.id,
      status: !receivedStatus && rejected ? 'error' : 'unavailable',
      limits: [],
      lastUpdatedAt: new Date().toISOString(),
      error: receivedStatus
        ? 'Antigravity reported no quota information for this account.'
        : rejected
          ? 'Antigravity rejected the local session. Restart Antigravity and Widoken.'
          : 'Antigravity was found, but its local server could not be reached.'
    }
  }

  private async languageServers(): Promise<AntigravityLanguageServer[]> {
    const discovered = await discoverAntigravityLanguageServers()
    if (!this.lastServer) return discovered
    return [
      this.lastServer,
      ...discovered.filter((server) =>
        server.host !== this.lastServer?.host
        || server.port !== this.lastServer.port
        || server.csrfToken !== this.lastServer.csrfToken)
    ]
  }

  private serverUrl(server: AntigravityLanguageServer, path: string): string {
    return `http://${server.host}:${server.port}${path}`
  }
}
