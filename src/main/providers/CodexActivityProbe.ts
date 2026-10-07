import { createReadStream, promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { StringDecoder } from 'node:string_decoder'

const DEFAULT_STALE_AFTER_MS = 30 * 60 * 1000

interface TrackedRollout {
  active: boolean
  modifiedAt: number
  offset: number
  remainder: string
}

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
  private readonly tracked = new Map<string, TrackedRollout>()

  constructor(
    private readonly sessionsRoot = join(homedir(), '.codex', 'sessions'),
    private readonly staleAfterMs = DEFAULT_STALE_AFTER_MS
  ) {}

  async isActive(now = Date.now()): Promise<boolean> {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const directories = [...new Set([
      dateDirectory(this.sessionsRoot, new Date(now)),
      dateDirectory(this.sessionsRoot, yesterday)
    ])]
    const candidates = (await Promise.all(directories.map((directory) => this.rolloutFiles(directory)))).flat()
    const seen = new Set(candidates)

    for (const path of candidates) {
      try {
        const stats = await fs.stat(path)
        if (now - stats.mtimeMs > this.staleAfterMs) {
          this.tracked.delete(path)
          continue
        }
        await this.updateRollout(path, stats.size, stats.mtimeMs)
      } catch {
        this.tracked.delete(path)
      }
    }

    for (const path of this.tracked.keys()) {
      if (!seen.has(path)) this.tracked.delete(path)
    }

    return [...this.tracked.values()].some(
      (rollout) => rollout.active && now - rollout.modifiedAt <= this.staleAfterMs
    )
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

  private async updateRollout(path: string, size: number, modifiedAt: number): Promise<void> {
    let rollout = this.tracked.get(path)
    if (!rollout || size < rollout.offset) {
      rollout = { active: false, modifiedAt, offset: 0, remainder: '' }
      this.tracked.set(path, rollout)
    }
    rollout.modifiedAt = modifiedAt
    if (size === rollout.offset) return

    const decoder = new StringDecoder('utf8')
    let pending = rollout.remainder
    const stream = createReadStream(path, { start: rollout.offset, end: size - 1 })
    for await (const chunk of stream) {
      pending += decoder.write(chunk as Buffer)
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) rollout.active = activityFromLine(line, rollout.active)
    }
    pending += decoder.end()
    rollout.remainder = pending
    rollout.offset = size
  }
}
