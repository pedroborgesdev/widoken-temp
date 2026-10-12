import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HuggingFaceBrowser, ProviderSetting } from '../../src/shared/settings'
import {
  applyHuggingFaceBaseline,
  HUGGING_FACE_BASELINE_VERSION,
  HuggingFaceProviderAdapter
} from '../../src/main/providers/HuggingFaceProviderAdapter'
import type {
  HuggingFaceCollector,
  HuggingFaceMonitorResult
} from '../../src/main/providers/HuggingFacePythonBridge'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

function collector(balance = 10): HuggingFaceCollector & { emit(result: HuggingFaceMonitorResult): void; stopped: boolean } {
  let listener: ((result: HuggingFaceMonitorResult) => void) | undefined
  const instance: HuggingFaceCollector & { emit(result: HuggingFaceMonitorResult): void; stopped: boolean } = {
    stopped: false,
    balance: vi.fn(async (browser: HuggingFaceBrowser) => ({
      provider: 'huggingface' as const,
      username: 'octocat',
      balance_usd: balance,
      browser: browser === 'auto' ? 'firefox' as const : browser
    })),
    monitor: vi.fn((_browser, onResult) => {
      listener = onResult
      return { stop: () => { instance.stopped = true } }
    }),
    emit: (result) => listener?.(result)
  }
  return instance
}

function setting(browser: ProviderSetting['huggingFaceBrowser']): ProviderSetting {
  return { id: 'huggingface', enabled: true, order: 0, usageDisplay: { split: false }, huggingFaceBrowser: browser }
}

describe('Hugging Face baseline', () => {
  it('uses the DeepSeek-style observed balance and resets after a recharge', () => {
    const first = applyHuggingFaceBaseline(undefined, 10)
    expect(first.limit).toEqual({ percent: 0, used: 0, limit: 10, remaining: 10 })
    const spent = applyHuggingFaceBaseline(first.state, 4)
    expect(spent.limit).toEqual({ percent: 60, used: 6, limit: 10, remaining: 4 })
    const recharged = applyHuggingFaceBaseline(spent.state, 7)
    expect(recharged.limit).toEqual({ percent: 0, used: 0, limit: 7, remaining: 7 })
  })
})

describe('HuggingFaceProviderAdapter', () => {
  it('maps the collector balance to the shared USD contract and persists it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-huggingface-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'balance.json')
    const source = collector(12.5)
    const adapter = new HuggingFaceProviderAdapter({ statePath: path, collector: source })
    adapter.configure(setting('firefox'))

    const snapshot = await adapter.getUsage()

    expect(source.balance).toHaveBeenCalledWith('firefox')
    expect(snapshot).toMatchObject({ providerId: 'huggingface', status: 'connected' })
    expect(snapshot.limits).toEqual([{
      id: 'balance-usd', label: 'USD balance', currency: 'USD', percent: 0, used: 0, limit: 12.5, remaining: 12.5
    }])
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      capacity: 12.5, remaining: 12.5, baselineVersion: HUGGING_FACE_BASELINE_VERSION
    })
  })

  it('reflects monitor working/idle events through the standard activity contract', async () => {
    const source = collector()
    const adapter = new HuggingFaceProviderAdapter({ collector: source })
    expect(await adapter.isActive()).toBe(false)
    source.emit({ provider: 'huggingface', status: 'working', browser: 'chrome' })
    expect(await adapter.isActive()).toBe(true)
    source.emit({ provider: 'huggingface', status: 'idle', browser: 'chrome' })
    expect(await adapter.isActive()).toBe(false)
  })

  it('returns a safe unavailable snapshot when browser collection fails', async () => {
    const source = collector()
    vi.mocked(source.balance).mockRejectedValue(new Error('No signed-in browser session.'))
    const snapshot = await new HuggingFaceProviderAdapter({ collector: source }).getUsage()
    expect(snapshot).toMatchObject({
      providerId: 'huggingface', status: 'unavailable', limits: [], error: 'No signed-in browser session.'
    })
  })
})
