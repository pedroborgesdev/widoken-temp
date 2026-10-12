import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { JsonlActivityTracker } from './JsonlActivityTracker'

const DEFAULT_STALE_AFTER_MS = 30 * 60 * 1000
const DEFAULT_IDLE_GRACE_MS = 5_000
const DISCOVERY_INTERVAL_MS = 2_000

interface RolloutEvent {
  type?: string
  payload?: {
    type?: string
  }
}

function activityFromLine(line: string, current: boolean): boolean {
  try {
    const event = JSON.parse(line) as RolloutEvent
    if (event.type !== 'event_msg') return current
    switch (event.payload?.type) {
      case 'task_started':
      case 'turn_started':
        return true
      case 'task_complete':
      case 'turn_complete':
      case 'task_aborted':
      case 'turn_aborted':
        return false
      default:
        return current
    }
  } catch {
    return current
  }
}

export class CodexActivityProbe {
  private readonly tracker: JsonlActivityTracker
  private candidates: string[] = []
  private discoveredAt = Number.NEGATIVE_INFINITY
  private reportedActive = false
  private inactiveSince?: number

  constructor(
    private readonly sessionsRoot = join(homedir(), '.codex', 'sessions'),
    private readonly staleAfterMs = DEFAULT_STALE_AFTER_MS,
    private readonly idleGraceMs = DEFAULT_IDLE_GRACE_MS
  ) {
    this.tracker = new JsonlActivityTracker(activityFromLine, staleAfterMs)
  }

  async isActive(now = Date.now()): Promise<boolean> {
    if (now - this.discoveredAt >= DISCOVERY_INTERVAL_MS) {
      this.candidates = await this.recentRolloutFiles(now)
      this.discoveredAt = now
    }

    const rawActive = await this.tracker.update(this.candidates, now)
    if (rawActive) {
      this.reportedActive = true
      this.inactiveSince = undefined
      return true
    }
    if (!this.reportedActive) return false

    this.inactiveSince ??= now
    if (now - this.inactiveSince < this.idleGraceMs) return true
    this.reportedActive = false
    this.inactiveSince = undefined
    return false
  }

  /** Finds recently modified rollouts regardless of the date directory in which a thread began. */
  private async recentRolloutFiles(now: number): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.sessionsRoot, { withFileTypes: true, recursive: true })
      const paths = entries
        .filter((entry) => entry.isFile() && entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl'))
        .map((entry) => join(entry.parentPath, entry.name))
      const recent = await Promise.all(paths.map(async (path) => {
        try {
          const stats = await fs.stat(path)
          return now - stats.mtimeMs <= this.staleAfterMs ? path : undefined
        } catch {
          return undefined
        }
      }))
      return recent.filter((path): path is string => Boolean(path))
    } catch {
      return []
    }
  }
}
