import { appendFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AntigravityActivityProbe } from '../../src/main/providers/AntigravityActivityProbe'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function setupRoots(): Promise<{ brain: string; presence: string }> {
  const base = await mkdtemp(join(tmpdir(), 'widoken-antigravity-activity-'))
  temporaryDirectories.push(base)
  const brain = join(base, 'brain')
  const presence = join(base, 'presence')
  await mkdir(brain, { recursive: true })
  await mkdir(presence, { recursive: true })
  return { brain, presence }
}

async function transcriptFile(brain: string, conversationId: string): Promise<string> {
  const dir = join(brain, conversationId, '.system_generated', 'logs')
  await mkdir(dir, { recursive: true })
  return join(dir, 'transcript.jsonl')
}

const userInput = `${JSON.stringify({ step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE' })}\n`
const toolCall = `${JSON.stringify({ step_index: 1, source: 'MODEL', type: 'GENERIC', status: 'DONE' })}\n`
const plannerDone = `${JSON.stringify({ step_index: 2, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE' })}\n`

describe('AntigravityActivityProbe', () => {
  it('returns false when there are no presence locks', async () => {
    const { brain, presence } = await setupRoots()
    const path = await transcriptFile(brain, 'convo-1')
    await writeFile(path, userInput)

    const probe = new AntigravityActivityProbe(brain, presence)
    await expect(probe.isActive()).resolves.toBe(false)
  })

  it('is active from USER_INPUT until PLANNER_RESPONSE completes', async () => {
    const now = Date.now()
    const { brain, presence } = await setupRoots()
    await writeFile(join(presence, 'convo-1.lock'), '')

    const path = await transcriptFile(brain, 'convo-1')
    await writeFile(path, userInput)

    const probe = new AntigravityActivityProbe(brain, presence)
    await expect(probe.isActive(now)).resolves.toBe(true)

    await appendFile(path, toolCall)
    await expect(probe.isActive(now)).resolves.toBe(true)

    await appendFile(path, plannerDone)
    await expect(probe.isActive(now)).resolves.toBe(false)

    await appendFile(path, userInput)
    await expect(probe.isActive(now)).resolves.toBe(true)
  })

  it('detects turns across multiple active conversations', async () => {
    const now = Date.now()
    const { brain, presence } = await setupRoots()
    await writeFile(join(presence, 'convo-1.lock'), '')
    await writeFile(join(presence, 'convo-2.lock'), '')

    const path1 = await transcriptFile(brain, 'convo-1')
    await writeFile(path1, userInput + plannerDone)

    const probe = new AntigravityActivityProbe(brain, presence)
    await expect(probe.isActive(now)).resolves.toBe(false)

    const path2 = await transcriptFile(brain, 'convo-2')
    await writeFile(path2, userInput)
    await expect(probe.isActive(now + 2_000)).resolves.toBe(true)
  })
})

