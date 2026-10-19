import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import type { ProviderSnapshot, UsageLimit } from '@shared/provider'
import type { ProviderAdapter } from './ProviderAdapter'
import {
  type HuggingFaceCollector,
  type HuggingFaceMonitorHandle,
  type HuggingFaceMonitorResult
} from './HuggingFaceSessionCollector'

export const HUGGING_FACE_BASELINE_VERSION = 1

export interface HuggingFaceBalanceState {
  capacity: number
  remaining: number
  baselineVersion: typeof HUGGING_FACE_BASELINE_VERSION
}

export interface HuggingFaceAdapterOptions {
  statePath?: string
  collector: HuggingFaceCollector
}

export function applyHuggingFaceBaseline(
  previous: HuggingFaceBalanceState | undefined,
  remaining: number
): { state: HuggingFaceBalanceState; limit: Pick<UsageLimit, 'percent' | 'used' | 'limit' | 'remaining'> } {
  const current = Number.isFinite(remaining) && remaining >= 0 ? remaining : 0
  const recharged = previous !== undefined && current > previous.remaining
  const capacity = previous === undefined || recharged ? current : previous.capacity
  const used = Math.max(0, capacity - current)
  return {
    state: { capacity, remaining: current, baselineVersion: HUGGING_FACE_BASELINE_VERSION },
    limit: {
      percent: capacity > 0 ? Math.min(100, (used / capacity) * 100) : 100,
      used,
      limit: capacity,
      remaining: current
    }
  }
}

function sanitizeState(value: unknown): HuggingFaceBalanceState | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<HuggingFaceBalanceState>
  if (typeof candidate.remaining !== 'number' || !Number.isFinite(candidate.remaining) || candidate.remaining < 0) return undefined
  const current = candidate.baselineVersion === HUGGING_FACE_BASELINE_VERSION
    && typeof candidate.capacity === 'number'
    && Number.isFinite(candidate.capacity)
    && candidate.capacity >= 0
  return {
    capacity: current ? candidate.capacity! : candidate.remaining,
    remaining: candidate.remaining,
    baselineVersion: HUGGING_FACE_BASELINE_VERSION
  }
}

export class HuggingFaceProviderAdapter implements ProviderAdapter {
  readonly id = 'huggingface'
  readonly name = 'Hugging Face'
  private connected = true
  private state: HuggingFaceBalanceState | undefined
  private stateLoaded = false
  private monitor?: HuggingFaceMonitorHandle
  private monitorResult?: HuggingFaceMonitorResult
  private readonly collector: HuggingFaceCollector

  constructor(private readonly options: HuggingFaceAdapterOptions) {
    this.collector = options.collector
  }

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.stopMonitor()
  }

  async isConnected(): Promise<boolean> {
    return this.connected
  }

  async isActive(): Promise<boolean> {
    if (!this.connected) return false
    this.ensureMonitor()
    return this.monitorResult?.status === 'working'
  }

  async getUsage(): Promise<ProviderSnapshot> {
    const lastUpdatedAt = new Date().toISOString()
    if (!this.connected) return { providerId: this.id, status: 'disconnected', limits: [], lastUpdatedAt }
    this.ensureMonitor()
    try {
      const result = await this.collector.balance()
      const applied = applyHuggingFaceBaseline(await this.loadState(), result.balance_usd)
      this.state = applied.state
      await this.persistState(applied.state)
      return {
        providerId: this.id,
        status: 'connected',
        limits: [{
          id: 'balance-usd',
          label: 'USD balance',
          currency: 'USD',
          ...applied.limit
        }],
        lastUpdatedAt
      }
    } catch (error) {
      return {
        providerId: this.id,
        status: 'unavailable',
        limits: [],
        lastUpdatedAt,
        error: error instanceof Error ? error.message : 'Unable to read the Hugging Face browser session.'
      }
    }
  }

  private ensureMonitor(): void {
    if (this.monitor) return
    this.stopMonitor()
    try {
      this.monitor = this.collector.monitor((result) => { this.monitorResult = result })
    } catch {
      this.monitor = undefined
    }
  }

  private stopMonitor(): void {
    this.monitor?.stop()
    this.monitor = undefined
    this.monitorResult = undefined
  }

  private async loadState(): Promise<HuggingFaceBalanceState | undefined> {
    if (this.stateLoaded) return this.state
    this.stateLoaded = true
    if (!this.options.statePath) return undefined
    try {
      this.state = sanitizeState(JSON.parse(await fs.readFile(this.options.statePath, 'utf8')))
    } catch {
      this.state = undefined
    }
    return this.state
  }

  private async persistState(state: HuggingFaceBalanceState): Promise<void> {
    if (!this.options.statePath) return
    await fs.mkdir(dirname(this.options.statePath), { recursive: true, mode: 0o700 })
    const temporaryPath = `${this.options.statePath}.tmp`
    await fs.writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
    await fs.rename(temporaryPath, this.options.statePath)
  }
}
