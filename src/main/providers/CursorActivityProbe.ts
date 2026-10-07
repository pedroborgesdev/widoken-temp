import { promises as fs, type Dirent } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { JsonlActivityTracker } from './JsonlActivityTracker'

// Cursor only flushes the agent's own lines when a turn ends, so the file is not
// touched while the agent works. Staleness therefore counts from the prompt and
// has to outlast a long agent turn.
const DEFAULT_STALE_AFTER_MS = 2 * 60 * 60 * 1000
const DISCOVERY_INTERVAL_MS = 2_000

interface TranscriptLine {
  role?: string
  type?: string
}

function activityFromLine(line: string, current: boolean): boolean {
  try {
    const entry = JSON.parse(line) as TranscriptLine
    if (entry.type === 'turn_ended') return false
    if (entry.role === 'user') return true
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

export class CursorActivityProbe {
  private readonly tracker: JsonlActivityTracker
  private candidates: string[] = []
  private discoveredAt = Number.NEGATIVE_INFINITY

  constructor(
    private readonly projectsRoot = join(homedir(), '.cursor', 'projects'),
    private readonly staleAfterMs = DEFAULT_STALE_AFTER_MS
  ) {
    this.tracker = new JsonlActivityTracker(activityFromLine, staleAfterMs)
  }

  async isActive(now = Date.now()): Promise<boolean> {
    if (now - this.discoveredAt >= DISCOVERY_INTERVAL_MS) {
      this.candidates = await this.recentTranscripts(now)
      this.discoveredAt = now
    }
    return this.tracker.update(this.candidates, now)
  }

  private async recentTranscripts(now: number): Promise<string[]> {
    const projects = (await directoryEntries(this.projectsRoot)).filter((entry) => entry.isDirectory())
    const transcripts = (await Promise.all(projects.map((project) =>
      this.projectTranscripts(join(this.projectsRoot, project.name, 'agent-transcripts'))
    ))).flat()
    const recent = await Promise.all(transcripts.map(async (path) => {
      try {
        const stats = await fs.stat(path)
        return now - stats.mtimeMs <= this.staleAfterMs ? path : undefined
      } catch {
        return undefined
      }
    }))
    return recent.filter((path): path is string => Boolean(path))
  }

  // Subagent transcripts are skipped: the parent turn stays open while they run.
  private async projectTranscripts(directory: string): Promise<string[]> {
    const entries = await directoryEntries(directory)
    return entries.flatMap((entry) => {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) return [join(directory, entry.name)]
      if (entry.isDirectory()) return [join(directory, entry.name, `${entry.name}.jsonl`)]
      return []
    })
  }
}
