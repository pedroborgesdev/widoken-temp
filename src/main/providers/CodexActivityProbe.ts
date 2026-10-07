import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { JsonlActivityTracker } from './JsonlActivityTracker'

const DEFAULT_STALE_AFTER_MS = 30 * 60 * 1000

interface RolloutEvent {
  type?: string
  payload?: {
    type?: string
  }
}

function dateDirectory(root: string, date: Date): string {
  return join(
    root,
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  )
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

  constructor(
    private readonly sessionsRoot = join(homedir(), '.codex', 'sessions'),
    staleAfterMs = DEFAULT_STALE_AFTER_MS
  ) {
    this.tracker = new JsonlActivityTracker(activityFromLine, staleAfterMs)
  }

  async isActive(now = Date.now()): Promise<boolean> {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const directories = [...new Set([
      dateDirectory(this.sessionsRoot, new Date(now)),
      dateDirectory(this.sessionsRoot, yesterday)
    ])]
    const candidates = (await Promise.all(directories.map((directory) => this.rolloutFiles(directory)))).flat()
    return this.tracker.update(candidates, now)
  }

  private async rolloutFiles(directory: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true })
      return entries
        .filter((entry) => entry.isFile() && entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl'))
        .map((entry) => join(directory, entry.name))
    } catch {
      return []
    }
  }
}
