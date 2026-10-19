import { beforeEach, describe, expect, it, vi } from 'vitest'

const handlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>())

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => handlers.set(channel, handler)
  }
}))

import { IPC, type BrowserSessionStatus } from '../../src/shared/ipc'
import { registerBrowserSessionsIpc } from '../../src/main/ipc/browserSessions.ipc'

const STATUS: BrowserSessionStatus = {
  providerId: 'huggingface',
  displayName: 'Hugging Face',
  authenticated: true,
  accountLabel: 'octocat'
}

beforeEach(() => handlers.clear())

describe('browser-session IPC', () => {
  it('exposes only non-secret status and refreshes the affected provider', async () => {
    const sessions = {
      list: vi.fn(async () => [STATUS]),
      login: vi.fn(async () => STATUS),
      logout: vi.fn(async () => ({ ...STATUS, authenticated: false, accountLabel: undefined }))
    }
    const providers = { refresh: vi.fn(async () => []) }
    registerBrowserSessionsIpc(sessions as never, providers as never)

    expect(await handlers.get(IPC.browserSessionsList)!()).toEqual([STATUS])
    expect(await handlers.get(IPC.browserSessionLogin)!(undefined, 'huggingface')).toEqual(STATUS)
    expect(await handlers.get(IPC.browserSessionLogout)!(undefined, 'huggingface')).toMatchObject({ authenticated: false })
    expect(providers.refresh).toHaveBeenNthCalledWith(1, 'huggingface')
    expect(providers.refresh).toHaveBeenNthCalledWith(2, 'huggingface')
    expect(JSON.stringify(await handlers.get(IPC.browserSessionsList)!())).not.toMatch(/cookie|token|secret/i)
  })

  it('rejects missing provider ids before reaching the session manager', async () => {
    const sessions = { list: vi.fn(async () => []), login: vi.fn(), logout: vi.fn() }
    registerBrowserSessionsIpc(sessions as never, { refresh: vi.fn() } as never)

    await expect(handlers.get(IPC.browserSessionLogin)!(undefined, '')).rejects.toThrow(/provider id/i)
    expect(sessions.login).not.toHaveBeenCalled()
  })

  it('forwards window controls using only the requesting web contents id', async () => {
    const sessions = {
      list: vi.fn(async () => []),
      login: vi.fn(),
      logout: vi.fn(),
      closeLoginWindow: vi.fn(),
      minimizeLoginWindow: vi.fn()
    }
    registerBrowserSessionsIpc(sessions as never, { refresh: vi.fn() } as never)
    const event = { sender: { id: 42 } }

    await handlers.get(IPC.browserSessionWindowMinimize)!(event)
    await handlers.get(IPC.browserSessionWindowClose)!(event)

    expect(sessions.minimizeLoginWindow).toHaveBeenCalledWith(42)
    expect(sessions.closeLoginWindow).toHaveBeenCalledWith(42)
  })
})
