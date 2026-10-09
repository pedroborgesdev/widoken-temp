import { beforeEach, describe, expect, it, vi } from 'vitest'

const handlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>())

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => handlers.set(channel, handler)
  }
}))

import { IPC, type DeepSeekCredentialStatus } from '../../src/shared/ipc'
import { registerDeepSeekCredentialsIpc } from '../../src/main/ipc/deepseekCredentials.ipc'

const STATUS: DeepSeekCredentialStatus = {
  storedApiKeyConfigured: true,
  environmentApiKeyAvailable: false,
  harnessAccountAvailable: true
}

beforeEach(() => handlers.clear())

describe('DeepSeek credential IPC', () => {
  it('registers dashboard-only handlers that never return the secret', async () => {
    const service = {
      status: vi.fn(async () => STATUS),
      saveApiKey: vi.fn(async (value: unknown) => {
        expect(value).toBe('sk-secret-value')
        return STATUS
      }),
      clearApiKey: vi.fn(async () => ({ ...STATUS, storedApiKeyConfigured: false }))
    }
    const providers = { refresh: vi.fn(async () => []) }

    registerDeepSeekCredentialsIpc(service as never, providers as never)

    expect([...handlers.keys()].sort()).toEqual([
      IPC.deepseekClearApiKey,
      IPC.deepseekCredentialStatus,
      IPC.deepseekSaveApiKey
    ].sort())

    const statusResult = await handlers.get(IPC.deepseekCredentialStatus)!()
    expect(statusResult).toEqual(STATUS)

    const saveResult = await handlers.get(IPC.deepseekSaveApiKey)!(undefined, 'sk-secret-value')
    expect(saveResult).toEqual(STATUS)
    expect(JSON.stringify(saveResult)).not.toContain('sk-secret-value')
    expect(providers.refresh).toHaveBeenCalledWith('deepseek')

    const clearResult = await handlers.get(IPC.deepseekClearApiKey)!(undefined)
    expect(clearResult).toMatchObject({ storedApiKeyConfigured: false })
    expect(JSON.stringify(clearResult)).not.toContain('sk-secret-value')
    expect(providers.refresh).toHaveBeenCalledTimes(2)
  })

  it('propagates main-process validation failures', async () => {
    const service = {
      status: vi.fn(async () => STATUS),
      saveApiKey: vi.fn(async () => { throw new Error('API key cannot be empty.') }),
      clearApiKey: vi.fn(async () => STATUS)
    }
    registerDeepSeekCredentialsIpc(service as never, { refresh: vi.fn(async () => []) } as never)

    await expect(handlers.get(IPC.deepseekSaveApiKey)!(undefined, '')).rejects.toThrow('API key cannot be empty.')
  })
})
