import Database from 'better-sqlite3'
import { promises as fs, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type {
  LocalAnalyticsMetric,
  ProviderAnalytics,
  ProviderListPrice,
  ProviderSnapshot,
  UsageLimit,
  UsageTrend
} from '@shared/provider'
import { buildUsageHistory, type UsageHistory, type UsageHistorySample } from '@shared/usageHistory'
import { cursorStateDatabasePath } from '../providers/cursorStorage'

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const RETENTION_MS = 90 * DAY_MS
const LOCAL_CACHE_MS = 5 * 60_000
const PRICE_CATALOG_DATE = '2026-10-05'

interface UsageRow {
  captured_at: number
  percent: number
  reset_at: number | null
}

interface LocalCacheEntry {
  expiresAt: number
  metrics: LocalAnalyticsMetric[]
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function normalizePlan(value?: string): string | undefined {
  return value?.trim().toLowerCase().replaceAll('+', ' plus').replace(/[^a-z0-9]+/g, ' ').trim()
}

function listPrice(providerId: string, plan?: string): ProviderListPrice | undefined {
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

function safeResetTimestamp(value?: string): number | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function sameCycle(first: UsageRow, second: UsageRow): boolean {
  if (first.reset_at === null || second.reset_at === null) return first.percent <= second.percent
  return Math.abs(first.reset_at - second.reset_at) < 5 * 60_000
}

function consumptionSince(rows: UsageRow[], cutoff: number): { amount: number; observedHours: number } | undefined {
  const selected = rows.filter((row) => row.captured_at >= cutoff)
  if (selected.length < 2) return undefined
  let amount = 0
  for (let index = 1; index < selected.length; index += 1) {
    const previous = selected[index - 1]
    const current = selected[index]
    if (!sameCycle(previous, current)) continue
    const delta = current.percent - previous.percent
    if (delta > 0) amount += delta
  }
  const observedHours = (selected.at(-1)!.captured_at - selected[0].captured_at) / HOUR_MS
  return observedHours > 0 ? { amount, observedHours } : undefined
}

function trendFor(limit: UsageLimit, rows: UsageRow[], now: number): UsageTrend | undefined {
  if (rows.length === 0 || limit.unlimited) return undefined
  const last24Hours = consumptionSince(rows, now - DAY_MS)
  const last7Days = consumptionSince(rows, now - 7 * DAY_MS)
  const burnRatePerHour = last24Hours && last24Hours.observedHours >= 0.25
    ? last24Hours.amount / last24Hours.observedHours
    : last7Days && last7Days.observedHours >= 0.25
      ? last7Days.amount / last7Days.observedHours
      : undefined
  const resetAt = safeResetTimestamp(limit.resetsAt)
  const hoursUntilReset = resetAt && resetAt > now ? (resetAt - now) / HOUR_MS : undefined

  return {
    limitId: limit.id,
    observedSince: new Date(rows[0].captured_at).toISOString(),
    consumedLast24Hours: last24Hours ? round(last24Hours.amount) : undefined,
    averageDailyConsumption: last7Days ? round((last7Days.amount / last7Days.observedHours) * 24) : undefined,
    burnRatePerHour: burnRatePerHour === undefined ? undefined : round(burnRatePerHour, 2),
    estimatedExhaustionAt: burnRatePerHour && burnRatePerHour > 0 && limit.percent < 100
      ? new Date(now + ((100 - limit.percent) / burnRatePerHour) * HOUR_MS).toISOString()
      : undefined,
    projectedPercentAtReset: burnRatePerHour && hoursUntilReset
      ? round(Math.min(100, limit.percent + burnRatePerHour * hoursUntilReset))
      : undefined
  }
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function duration(valueMs: number): string {
  const minutes = Math.max(0, Math.round(valueMs / 60_000))
  return minutes >= 60 ? `${round(minutes / 60)}h` : `${minutes}m`
}

export class AnalyticsService {
  private database?: Database.Database
  private localInsights = false
  private lastCleanupAt = 0
  private readonly localCache = new Map<string, LocalCacheEntry>()
  private warned = false

  constructor(
    databasePath: string,
    private readonly userHome = homedir()
  ) {
    try {
      mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 })
      this.database = new Database(databasePath, { timeout: 250 })
      this.database.pragma('busy_timeout = 250')
      this.database.pragma('journal_mode = WAL')
      this.database.pragma('synchronous = NORMAL')
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS usage_samples (
          provider_id TEXT NOT NULL,
          limit_id TEXT NOT NULL,
          captured_at INTEGER NOT NULL,
          percent REAL NOT NULL,
          reset_at INTEGER,
          used REAL,
          limit_value REAL,
          remaining REAL,
          unlimited INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (provider_id, limit_id, captured_at)
        );
        CREATE INDEX IF NOT EXISTS usage_samples_lookup
          ON usage_samples(provider_id, limit_id, captured_at);
      `)
    } catch (error) {
      this.database = undefined
      this.warnOnce('Analytics database unavailable; usage history is disabled.', error)
    }
  }

  setLocalInsights(enabled: boolean): void {
    this.localInsights = enabled
    if (!enabled) this.localCache.clear()
  }

  async enhance(snapshot: ProviderSnapshot, capturedAt = Date.now()): Promise<ProviderSnapshot> {
    if (snapshot.status === 'connected') this.record(snapshot, capturedAt)
    const trends = snapshot.status === 'connected'
      ? snapshot.limits.flatMap((limit) => {
          const trend = this.readTrend(snapshot.providerId, limit, capturedAt)
          return trend ? [trend] : []
        })
      : []
    const analytics: ProviderAnalytics = {
      trends,
      listPrice: listPrice(snapshot.providerId, snapshot.plan),
      localMetrics: this.localInsights ? await this.localMetrics(snapshot.providerId) : undefined
    }
    const hasAnalytics = analytics.trends.length > 0 || analytics.listPrice || analytics.localMetrics?.length
    return hasAnalytics ? { ...snapshot, analytics } : snapshot
  }

  usageHistory(now = Date.now()): UsageHistory {
    const empty = buildUsageHistory([], now)
    if (!this.database) return empty
    try {
      const rows = this.database.prepare(`
        SELECT provider_id, limit_id, captured_at, percent, reset_at, used, limit_value
        FROM usage_samples
        WHERE captured_at >= ?
        ORDER BY captured_at ASC
      `).all(now - 40 * DAY_MS) as Array<{
        provider_id: string
        limit_id: string
        captured_at: number
        percent: number
        reset_at: number | null
        used: number | null
        limit_value: number | null
      }>
      const samples: UsageHistorySample[] = rows.map((row) => ({
        providerId: row.provider_id,
        limitId: row.limit_id,
        capturedAt: row.captured_at,
        percent: row.percent,
        resetAt: row.reset_at,
        used: row.used,
        limitValue: row.limit_value
      }))
      const first = this.database.prepare('SELECT MIN(captured_at) AS since FROM usage_samples').get() as { since: number | null }
      return {
        ...buildUsageHistory(samples, now),
        since: first.since === null ? undefined : new Date(first.since).toISOString()
      }
    } catch (error) {
      this.warnOnce('Unable to read usage history; the dashboard chart will stay empty.', error)
      return empty
    }
  }

  close(): void {
    try {
      this.database?.close()
    } catch {
      // The application is already shutting down.
    }
    this.database = undefined
  }

  private record(snapshot: ProviderSnapshot, capturedAt: number): void {
    if (!this.database) return
    try {
      const insert = this.database.prepare(`
        INSERT OR IGNORE INTO usage_samples (
          provider_id, limit_id, captured_at, percent, reset_at, used, limit_value, remaining, unlimited
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const transaction = this.database.transaction(() => {
        for (const limit of snapshot.limits) {
          insert.run(
            snapshot.providerId,
            limit.id,
            capturedAt,
            Math.min(100, Math.max(0, limit.percent)),
            safeResetTimestamp(limit.resetsAt),
            finiteNumber(limit.used) ?? null,
            finiteNumber(limit.limit) ?? null,
            finiteNumber(limit.remaining) ?? null,
            limit.unlimited ? 1 : 0
          )
        }
      })
      transaction()
      if (capturedAt - this.lastCleanupAt > DAY_MS) {
        this.database.prepare('DELETE FROM usage_samples WHERE captured_at < ?').run(capturedAt - RETENTION_MS)
        this.lastCleanupAt = capturedAt
      }
    } catch (error) {
      this.warnOnce('Unable to write analytics snapshot; provider refresh will continue.', error)
    }
  }

  private readTrend(providerId: string, limit: UsageLimit, now: number): UsageTrend | undefined {
    if (!this.database) return undefined
    try {
      const rows = this.database.prepare(`
        SELECT captured_at, percent, reset_at
        FROM usage_samples
        WHERE provider_id = ? AND limit_id = ? AND captured_at >= ?
        ORDER BY captured_at ASC
      `).all(providerId, limit.id, now - 30 * DAY_MS) as UsageRow[]
      return trendFor(limit, rows, now)
    } catch (error) {
      this.warnOnce('Unable to read analytics history; provider refresh will continue.', error)
      return undefined
    }
  }

  private async localMetrics(providerId: string): Promise<LocalAnalyticsMetric[]> {
    const cached = this.localCache.get(providerId)
    if (cached && cached.expiresAt > Date.now()) return cached.metrics
    let metrics: LocalAnalyticsMetric[] = []
    try {
      if (providerId === 'claude') metrics = await this.claudeMetrics()
      if (providerId === 'openai') metrics = this.codexMetrics()
      if (providerId === 'cursor') metrics = this.cursorMetrics()
      if (providerId === 'antigravity') metrics = await this.antigravityMetrics()
    } catch {
      metrics = []
    }
    this.localCache.set(providerId, { expiresAt: Date.now() + LOCAL_CACHE_MS, metrics })
    return metrics
  }

  private async claudeMetrics(): Promise<LocalAnalyticsMetric[]> {
    const root = join(this.userHome, '.claude', 'projects')
    const cutoff = Date.now() - 30 * DAY_MS
    const files = await this.recentFiles(root, '.jsonl', cutoff, 250)
    const sessions = new Set<string>()
    let cost = 0
    let activeMs = 0
    let linesAdded = 0
    let linesRemoved = 0
    for (const file of files) {
      const contents = await fs.readFile(file, 'utf8')
      for (const line of contents.split('\n')) {
        if (!line.includes('total')) continue
        try {
          const item = JSON.parse(line) as Record<string, unknown>
          if (typeof item.sessionId === 'string') sessions.add(item.sessionId)
          cost += finiteNumber(item.totalCostUSD) ?? 0
          activeMs += finiteNumber(item.totalDuration) ?? 0
          linesAdded += finiteNumber(item.totalLinesAdded) ?? 0
          linesRemoved += finiteNumber(item.totalLinesRemoved) ?? 0
        } catch {
          // Ignore partial JSONL records while Claude is writing them.
        }
      }
    }
    return [
      sessions.size > 0 ? { label: '30d sessions', value: compactNumber(sessions.size) } : undefined,
      cost > 0 ? { label: '30d API-equivalent', value: `$${round(cost, 2)}` } : undefined,
      activeMs > 0 ? { label: '30d active time', value: duration(activeMs) } : undefined,
      linesAdded + linesRemoved > 0
        ? { label: '30d code changes', value: `+${compactNumber(linesAdded)} / -${compactNumber(linesRemoved)}` }
        : undefined
    ].filter((metric): metric is LocalAnalyticsMetric => Boolean(metric))
  }

  private codexMetrics(): LocalAnalyticsMetric[] {
    const database = this.openReadonly(join(this.userHome, '.codex', 'state_5.sqlite'))
    if (!database) return []
    try {
      const cutoff = Date.now() - 30 * DAY_MS
      const row = database.prepare(`
        SELECT COUNT(*) AS sessions, COALESCE(SUM(tokens_used), 0) AS tokens
        FROM threads
        WHERE COALESCE(updated_at_ms, updated_at * 1000) >= ?
      `).get(cutoff) as { sessions: number; tokens: number }
      return [
        row.sessions > 0 ? { label: '30d threads', value: compactNumber(row.sessions) } : undefined,
        row.tokens > 0 ? { label: '30d tokens', value: compactNumber(row.tokens) } : undefined
      ].filter((metric): metric is LocalAnalyticsMetric => Boolean(metric))
    } finally {
      database.close()
    }
  }

  private cursorMetrics(): LocalAnalyticsMetric[] {
    const database = this.openReadonly(cursorStateDatabasePath(process.platform, this.userHome))
    if (!database) return []
    try {
      const row = database.prepare(`
        SELECT
          SUM(CASE WHEN lastUpdatedAt >= ? THEN 1 ELSE 0 END) AS recent,
          COUNT(*) AS total
        FROM composerHeaders
      `).get(Date.now() - 7 * DAY_MS) as { recent: number; total: number }
      return [
        row.recent > 0 ? { label: '7d conversations', value: compactNumber(row.recent) } : undefined,
        row.total > 0 ? { label: 'Local conversations', value: compactNumber(row.total) } : undefined
      ].filter((metric): metric is LocalAnalyticsMetric => Boolean(metric))
    } finally {
      database.close()
    }
  }

  private async antigravityMetrics(): Promise<LocalAnalyticsMetric[]> {
    const root = join(this.userHome, '.gemini', 'antigravity')
    const conversations = await this.recentFiles(join(root, 'conversations'), '.db', Date.now() - 30 * DAY_MS, 500)
    const recent = await Promise.all(conversations.map(async (file) => (await fs.stat(file)).mtimeMs >= Date.now() - 7 * DAY_MS))
    let model: string | undefined
    try {
      const state = await fs.readFile(join(root, 'antigravity_state.pbtxt'), 'utf8')
      model = state.match(/last_selected_agent_model:\s*"([^"]+)"/)?.[1]
    } catch {
      // Antigravity may not have created state yet.
    }
    return [
      recent.filter(Boolean).length > 0
        ? { label: '7d conversations', value: compactNumber(recent.filter(Boolean).length) }
        : undefined,
      conversations.length > 0 ? { label: '30d conversations', value: compactNumber(conversations.length) } : undefined,
      model ? { label: 'Last local model', value: model } : undefined
    ].filter((metric): metric is LocalAnalyticsMetric => Boolean(metric))
  }

  private openReadonly(filePath: string): Database.Database | undefined {
    try {
      const database = new Database(filePath, { readonly: true, fileMustExist: true, timeout: 100 })
      database.pragma('query_only = ON')
      database.pragma('busy_timeout = 100')
      return database
    } catch {
      return undefined
    }
  }

  private async recentFiles(root: string, suffix: string, cutoff: number, maximum: number): Promise<string[]> {
    const result: string[] = []
    const visit = async (directory: string): Promise<void> => {
      if (result.length >= maximum) return
      let entries
      try {
        entries = await fs.readdir(directory, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (result.length >= maximum) break
        const path = join(directory, entry.name)
        if (entry.isDirectory()) await visit(path)
        if (!entry.isFile() || !entry.name.endsWith(suffix)) continue
        try {
          if ((await fs.stat(path)).mtimeMs >= cutoff) result.push(path)
        } catch {
          // File disappeared between directory scan and stat.
        }
      }
    }
    await visit(root)
    return result
  }

  private warnOnce(message: string, error: unknown): void {
    if (this.warned) return
    this.warned = true
    console.warn(message, error)
  }
}
