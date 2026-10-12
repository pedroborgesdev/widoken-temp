import { appendFile, mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zstdCompressSync } from 'node:zlib'
import { afterEach, describe, expect, it } from 'vitest'
import { DeepSeekActivityProbe } from '../../src/main/providers/DeepSeekActivityProbe'
import { DeepSeekProviderAdapter } from '../../src/main/providers/DeepSeekProviderAdapter'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function sessionsRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'widoken-deepseek-activity-'))
  temporaryDirectories.push(root)
  return root
}

async function sessionLog(root: string, workspace: string, session: string): Promise<string> {
  const directory = join(root, workspace, session)
  await mkdir(directory, { recursive: true })
  return join(directory, 'session.v4.jsonl.zstd')
}

function event(type: string): Buffer {
  return zstdCompressSync(Buffer.from(`${JSON.stringify({ type, seq: 1, time: Date.now(), data: {} })}\n`))
}

describe('DeepSeekActivityProbe', () => {
  it('tracks a Harness turn from its persisted start through completion', async () => {
    const now = Date.now()
    const root = await sessionsRoot()
    const path = await sessionLog(root, 'workspace-one', 'session-one')
    await writeFile(path, event('turn/start'))
    const probe = new DeepSeekActivityProbe(root)

    await expect(probe.isActive(now)).resolves.toBe(true)
    await appendFile(path, event('step/start'))
    await expect(probe.isActive(now)).resolves.toBe(true)
    await appendFile(path, event('turn/end'))
    await expect(probe.isActive(now)).resolves.toBe(false)
  })

  it('detects a new active session and keeps concurrent idle sessions from hiding it', async () => {
    const now = Date.now()
    const root = await sessionsRoot()
    const idle = await sessionLog(root, 'workspace-one', 'session-idle')
    await writeFile(idle, Buffer.concat([event('turn/start'), event('turn/end')]))
    const probe = new DeepSeekActivityProbe(root)
    await expect(probe.isActive(now)).resolves.toBe(false)

    const active = await sessionLog(root, 'workspace-two', 'session-active')
    await writeFile(active, event('turn/start'))
    await expect(probe.isActive(now + 2_000)).resolves.toBe(true)
  })

  it('ignores malformed and abandoned session logs', async () => {
    const now = Date.now()
    const root = await sessionsRoot()
    const malformed = await sessionLog(root, 'workspace-one', 'session-malformed')
    await writeFile(malformed, 'not-zstandard')
    const stale = await sessionLog(root, 'workspace-one', 'session-stale')
    await writeFile(stale, event('turn/start'))
    const staleDate = new Date(now - 2_000)
    await utimes(stale, staleDate, staleDate)

    await expect(new DeepSeekActivityProbe(root, 1_000).isActive(now)).resolves.toBe(false)
  })

  it('exposes Harness activity through the DeepSeek provider adapter', async () => {
    const dshRoot = await mkdtemp(join(tmpdir(), 'widoken-deepseek-home-'))
    temporaryDirectories.push(dshRoot)
    const path = await sessionLog(join(dshRoot, 'sessions'), 'workspace-one', 'session-live')
    await writeFile(path, event('turn/start'))
    const adapter = new DeepSeekProviderAdapter({ env: { DSH_HOME: dshRoot } })

    await expect(adapter.isActive()).resolves.toBe(true)
    adapter.configure({
      id: 'deepseek',
      enabled: true,
      order: 0,
      usageDisplay: { split: false },
      credentialSource: 'api-key'
    })
    await expect(adapter.isActive()).resolves.toBe(false)
  })
})
