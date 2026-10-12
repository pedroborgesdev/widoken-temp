import { createReadStream, promises as fs, type Dirent } from 'node:fs'
import { join } from 'node:path'
import { zstdDecompressSync, type ZstdDecompress } from 'node:zlib'
import { harnessDataRoot } from './deepseekHarness'

const DEFAULT_STALE_AFTER_MS = 2 * 60 * 60 * 1000
const DISCOVERY_INTERVAL_MS = 2_000

interface TrackedLog {
  active: boolean
  modifiedAt: number
  offset: number
  remainder: string
}

interface SessionEvent {
  type?: string
}

async function directoryEntries(directory: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

function activityFromLine(line: string, current: boolean): boolean {
  try {
    const event = JSON.parse(line) as SessionEvent
    if (event.type === 'turn/start') return true
    if (event.type === 'turn/end') return false
    return current
  } catch {
    return current
  }
}

function decompressFrames(input: Buffer): Buffer {
  const frames: Buffer[] = []
  let offset = 0
  while (offset < input.length) {
    const result = zstdDecompressSync(input.subarray(offset), { info: true }) as unknown as {
      buffer: Buffer
      engine: ZstdDecompress
    }
    const consumed = result.engine.bytesWritten
    if (!Number.isSafeInteger(consumed) || consumed <= 0) throw new Error('Invalid Zstandard frame length')
    frames.push(result.buffer)
    offset += consumed
  }
  return Buffer.concat(frames)
}

/** Follows the Harness's append-only Zstandard JSONL session logs read-only. */
export class DeepSeekActivityProbe {
  private candidates: string[] = []
  private discoveredAt = Number.NEGATIVE_INFINITY
  private readonly tracked = new Map<string, TrackedLog>()

  constructor(
    private readonly sessionsRoot = join(harnessDataRoot(), 'sessions'),
    private readonly staleAfterMs = DEFAULT_STALE_AFTER_MS
  ) {}

  async isActive(now = Date.now()): Promise<boolean> {
    if (now - this.discoveredAt >= DISCOVERY_INTERVAL_MS) {
      this.candidates = await this.sessionLogs()
      this.discoveredAt = now
    }

    const seen = new Set(this.candidates)
    await Promise.all(this.candidates.map((path) => this.updateLog(path, now)))
    for (const path of this.tracked.keys()) {
      if (!seen.has(path)) this.tracked.delete(path)
    }
    return [...this.tracked.values()].some(
      (log) => log.active && now - log.modifiedAt <= this.staleAfterMs
    )
  }

  private async sessionLogs(): Promise<string[]> {
    const workspaces = (await directoryEntries(this.sessionsRoot)).filter((entry) => entry.isDirectory())
    return (await Promise.all(workspaces.map(async (workspace) => {
      const workspaceRoot = join(this.sessionsRoot, workspace.name)
      const sessions = (await directoryEntries(workspaceRoot)).filter((entry) => entry.isDirectory())
      return (await Promise.all(sessions.map(async (session) => {
        const sessionRoot = join(workspaceRoot, session.name)
        return (await directoryEntries(sessionRoot))
          .filter((entry) => entry.isFile() && /^session\.v\d+\.jsonl\.zstd$/.test(entry.name))
          .map((entry) => join(sessionRoot, entry.name))
      }))).flat()
    }))).flat()
  }

  private async updateLog(path: string, now: number): Promise<void> {
    try {
      const stats = await fs.stat(path)
      if (now - stats.mtimeMs > this.staleAfterMs) {
        this.tracked.delete(path)
        return
      }
      await this.readAppendedFrames(path, stats.size, stats.mtimeMs)
    } catch {
      // A file may be replaced or still receiving its next frame. Retain the
      // previous state so the following poll can retry from the same offset.
    }
  }

  private async readAppendedFrames(path: string, size: number, modifiedAt: number): Promise<void> {
    const existing = this.tracked.get(path)
    const previous = !existing || size < existing.offset
      ? { active: false, modifiedAt, offset: 0, remainder: '' }
      : existing
    if (size === previous.offset) {
      previous.modifiedAt = modifiedAt
      this.tracked.set(path, previous)
      return
    }

    let active = previous.active
    const compressed = createReadStream(path, { start: previous.offset, end: size - 1 })
    const chunks: Buffer[] = []
    for await (const chunk of compressed) chunks.push(chunk as Buffer)
    const decoded = decompressFrames(Buffer.concat(chunks))
    const lines = `${previous.remainder}${decoded.toString('utf8')}`.split('\n')
    const pending = lines.pop() ?? ''
    for (const line of lines) active = activityFromLine(line, active)
    this.tracked.set(path, { active, modifiedAt, offset: size, remainder: pending })
  }
}
