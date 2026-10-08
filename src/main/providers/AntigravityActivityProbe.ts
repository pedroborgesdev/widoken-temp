import { promises as fs, type Dirent } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { JsonlActivityTracker } from './JsonlActivityTracker'
import { antigravityDataRoot } from './antigravityStorage'

// Antigravity transcripts are flushed at the end of each agent turn,
// so we allow a generous stale window to avoid false-idle during long turns.
const DEFAULT_STALE_AFTER_MS = 2 * 60 * 60 * 1000
const DISCOVERY_INTERVAL_MS = 2_000

interface TranscriptLine {
  source?: string
  type?: string
  status?: string
}

function activityFromLine(line: string, current: boolean): boolean {
  try {
    const entry = JSON.parse(line) as TranscriptLine
    // A user input starts a turn
    if (entry.type === 'USER_INPUT') return true
    // A completed planner response ends a turn
    if (entry.type === 'PLANNER_RESPONSE' && entry.status === 'DONE') return false
    return current
  } catch {
    return current
  }
}

async function directoryEntries(directory: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

export class AntigravityActivityProbe {
  private readonly tracker: JsonlActivityTracker
  private candidates: string[] = []
  private discoveredAt = Number.NEGATIVE_INFINITY

  constructor(
    private readonly brainRoot = join(antigravityDataRoot(process.platform, homedir()), 'brain'),
    private readonly presenceRoot = join(antigravityDataRoot(process.platform, homedir()), 'presence'),
    private readonly staleAfterMs = DEFAULT_STALE_AFTER_MS
  ) {
    this.tracker = new JsonlActivityTracker(activityFromLine, staleAfterMs)
  }

  async isActive(now = Date.now()): Promise<boolean> {
    // Quick check: are there presence lock files?
    const hasPresence = await this.hasPresenceLocks()
    if (!hasPresence) return false

    if (now - this.discoveredAt >= DISCOVERY_INTERVAL_MS) {
      this.candidates = await this.recentTranscripts(now)
      this.discoveredAt = now
    }
    return this.tracker.update(this.candidates, now)
  }

  private async hasPresenceLocks(): Promise<boolean> {
    const entries = await directoryEntries(this.presenceRoot)
    return entries.some((entry) => entry.isFile() && entry.name.endsWith('.lock'))
  }

  private async recentTranscripts(now: number): Promise<string[]> {
    const conversations = (await directoryEntries(this.brainRoot)).filter((entry) => entry.isDirectory())
    const transcripts = conversations.map((entry) =>
      join(this.brainRoot, entry.name, '.system_generated', 'logs', 'transcript.jsonl')
    )

    const recent = await Promise.all(
      transcripts.map(async (path) => {
        try {
          const stats = await fs.stat(path)
          return now - stats.mtimeMs <= this.staleAfterMs ? path : undefined
        } catch {
          return undefined
        }
      })
    )
    return recent.filter((path): path is string => Boolean(path))
  }
}
