import { appendFile, mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CodexActivityProbe } from '../../src/main/providers/CodexActivityProbe'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function rolloutFile(now: number): Promise<{ path: string; root: string }> {
  const root = await mkdtemp(join(tmpdir(), 'widoken-codex-activity-'))
  temporaryDirectories.push(root)
  const date = new Date(now)
  const directory = join(
    root,
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  )
  await mkdir(directory, { recursive: true })
  return { path: join(directory, 'rollout-test.jsonl'), root }
}

function event(type: string): string {
  return `${JSON.stringify({ type: 'event_msg', payload: { type } })}\n`
}

describe('CodexActivityProbe', () => {
  it('tracks a Codex turn from its persisted start through completion', async () => {
    const now = Date.now()
    const { path, root } = await rolloutFile(now)
    await writeFile(path, event('task_started'))
    const probe = new CodexActivityProbe(root)

    await expect(probe.isActive(now)).resolves.toBe(true)
    await appendFile(path, `${JSON.stringify({ type: 'event_msg', payload: { type: 'token_count' } })}\n`)
    await expect(probe.isActive(now)).resolves.toBe(true)
    await appendFile(path, event('task_complete'))
    await expect(probe.isActive(now)).resolves.toBe(true)
    await expect(probe.isActive(now + 5_001)).resolves.toBe(false)
  })

  it('bridges short idle gaps between consecutive Codex task phases', async () => {
    const now = Date.now()
    const { path, root } = await rolloutFile(now)
    await writeFile(path, event('task_started'))
    const probe = new CodexActivityProbe(root)

    await expect(probe.isActive(now)).resolves.toBe(true)
    await appendFile(path, event('task_complete'))
    await expect(probe.isActive(now + 1_000)).resolves.toBe(true)
    await appendFile(path, event('task_started'))
    await expect(probe.isActive(now + 4_000)).resolves.toBe(true)
    await appendFile(path, event('task_complete'))
    await expect(probe.isActive(now + 5_000)).resolves.toBe(true)
    await expect(probe.isActive(now + 10_001)).resolves.toBe(false)
  })

  it('accepts the v2 turn names and expires abandoned rollouts', async () => {
    const now = Date.now()
    const { path, root } = await rolloutFile(now)
    await writeFile(path, event('turn_started'))
    const probe = new CodexActivityProbe(root, 1_000, 0)

    await expect(probe.isActive(now)).resolves.toBe(true)
    const staleDate = new Date(now - 2_000)
    await utimes(path, staleDate, staleDate)
    await expect(probe.isActive(now)).resolves.toBe(false)
  })

  it('finds a resumed thread even when its rollout lives in an older date directory', async () => {
    const now = Date.now()
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1_000
    const { path, root } = await rolloutFile(threeDaysAgo)
    await writeFile(path, event('task_started'))
    const current = new Date(now)
    await utimes(path, current, current)

    await expect(new CodexActivityProbe(root).isActive(now)).resolves.toBe(true)
  })
})
