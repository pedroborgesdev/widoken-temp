import { appendFile, mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CursorActivityProbe } from '../../src/main/providers/CursorActivityProbe'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function projectsRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'widoken-cursor-activity-'))
  temporaryDirectories.push(root)
  return root
}

async function transcriptFile(root: string, project: string, chat: string): Promise<string> {
  const directory = join(root, project, 'agent-transcripts', chat)
  await mkdir(directory, { recursive: true })
  return join(directory, `${chat}.jsonl`)
}

const userPrompt = `${JSON.stringify({ role: 'user', message: { content: [{ type: 'text', text: 'hi' }] } })}\n`
const assistantReply = `${JSON.stringify({ role: 'assistant', message: { content: [{ type: 'text', text: 'ok' }] } })}\n`
const turnEnded = (status: string): string => `${JSON.stringify({ type: 'turn_ended', status })}\n`

describe('CursorActivityProbe', () => {
  it('is active from the prompt until the turn ends', async () => {
    const now = Date.now()
    const root = await projectsRoot()
    const path = await transcriptFile(root, 'c-repo', 'chat-a')
    await writeFile(path, userPrompt)
    const probe = new CursorActivityProbe(root)

    await expect(probe.isActive(now)).resolves.toBe(true)
    await appendFile(path, assistantReply)
    await expect(probe.isActive(now)).resolves.toBe(true)
    await appendFile(path, turnEnded('success'))
    await expect(probe.isActive(now)).resolves.toBe(false)
    await appendFile(path, userPrompt)
    await expect(probe.isActive(now)).resolves.toBe(true)
    await appendFile(path, turnEnded('aborted'))
    await expect(probe.isActive(now)).resolves.toBe(false)
  })

  it('finds a chat started in any project after the probe was created', async () => {
    const now = Date.now()
    const root = await projectsRoot()
    const idle = await transcriptFile(root, 'c-repo', 'chat-a')
    await writeFile(idle, userPrompt + turnEnded('success'))
    const probe = new CursorActivityProbe(root)
    await expect(probe.isActive(now)).resolves.toBe(false)

    const other = await transcriptFile(root, 'empty-window', 'chat-b')
    await writeFile(other, userPrompt)
    await expect(probe.isActive(now + 2_000)).resolves.toBe(true)
  })

  it('ignores subagent transcripts and expires abandoned prompts', async () => {
    const now = Date.now()
    const root = await projectsRoot()
    const path = await transcriptFile(root, 'c-repo', 'chat-a')
    await writeFile(path, userPrompt + turnEnded('success'))
    const subagents = join(root, 'c-repo', 'agent-transcripts', 'chat-a', 'subagents')
    await mkdir(subagents, { recursive: true })
    await writeFile(join(subagents, 'sub.jsonl'), userPrompt)
    const stale = await transcriptFile(root, 'c-old', 'chat-old')
    await writeFile(stale, userPrompt)
    const staleDate = new Date(now - 2_000)
    await utimes(stale, staleDate, staleDate)

    await expect(new CursorActivityProbe(root, 1_000).isActive(now)).resolves.toBe(false)
  })
})
