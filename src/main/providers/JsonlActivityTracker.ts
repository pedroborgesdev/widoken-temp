import { createReadStream, promises as fs } from 'node:fs'
import { StringDecoder } from 'node:string_decoder'

interface TrackedFile {
  active: boolean
  modifiedAt: number
  offset: number
  remainder: string
}

export type ActivityLineReader = (line: string, current: boolean) => boolean

/**
 * Follows append-only JSONL logs and keeps only each file's latest
 * active/idle state, byte offset, and modification time.
 */
export class JsonlActivityTracker {
  private readonly tracked = new Map<string, TrackedFile>()

  constructor(
    private readonly readLine: ActivityLineReader,
    private readonly staleAfterMs: number
  ) {}

  async update(paths: string[], now = Date.now()): Promise<boolean> {
    const seen = new Set(paths)

    for (const path of paths) {
      try {
        const stats = await fs.stat(path)
        if (now - stats.mtimeMs > this.staleAfterMs) {
          this.tracked.delete(path)
          continue
        }
        await this.updateFile(path, stats.size, stats.mtimeMs)
      } catch {
        this.tracked.delete(path)
      }
    }

    for (const path of this.tracked.keys()) {
      if (!seen.has(path)) this.tracked.delete(path)
    }

    return [...this.tracked.values()].some(
      (file) => file.active && now - file.modifiedAt <= this.staleAfterMs
    )
  }

  private async updateFile(path: string, size: number, modifiedAt: number): Promise<void> {
    let file = this.tracked.get(path)
    if (!file || size < file.offset) {
      file = { active: false, modifiedAt, offset: 0, remainder: '' }
      this.tracked.set(path, file)
    }
    file.modifiedAt = modifiedAt
    if (size === file.offset) return

    const decoder = new StringDecoder('utf8')
    let pending = file.remainder
    const stream = createReadStream(path, { start: file.offset, end: size - 1 })
    for await (const chunk of stream) {
      pending += decoder.write(chunk as Buffer)
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) file.active = this.readLine(line, file.active)
    }
    pending += decoder.end()
    file.remainder = pending
    file.offset = size
  }
}
