import { beforeEach, describe, expect, it, vi } from 'vitest'

const electron = vi.hoisted(() => {
  const fetch = vi.fn(async () => new Response('{}', { status: 200 }))
  const clearData = vi.fn(async () => undefined)
  const providerSession = {
    fetch,
    clearData,
    setPermissionRequestHandler: vi.fn(),
    on: vi.fn()
  }
  return {
    fetch,
    clearData,
    providerSession,
    fromPartition: vi.fn(() => providerSession)
  }
})

vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => 'C:\\widoken' },
  BrowserWindow: vi.fn(),
  WebContentsView: vi.fn(),
  session: { fromPartition: electron.fromPartition }
}))

import {
  ProviderBrowserSessionManager,
  type ProviderBrowserSessionDefinition
} from '../../src/main/browserSessions/ProviderBrowserSessionManager'

function definition(overrides: Partial<ProviderBrowserSessionDefinition> = {}): ProviderBrowserSessionDefinition {
  return {
    providerId: 'example',
    displayName: 'Example',
    loginUrl: 'https://example.com/login',
    allowedNavigationOrigins: ['https://example.com'],
    allowedRequestOrigins: ['https://example.com'],
    welcome: {
      reason: 'Example requires a website session.',
      collectedData: ['Account usage']
    },
    verify: async () => ({ accountLabel: 'person' }),
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  electron.fetch.mockResolvedValue(new Response('{}', { status: 200 }))
})

describe('ProviderBrowserSessionManager', () => {
  it('uses an isolated persistent partition and forces session cookies without redirects', async () => {
    const manager = new ProviderBrowserSessionManager([definition()])
    await manager.client('example').fetch('https://example.com/private', {
      credentials: 'omit',
      redirect: 'follow'
    })

    expect(electron.fromPartition).toHaveBeenCalledWith('persist:widoken-provider-example')
    expect(electron.fetch).toHaveBeenCalledWith('https://example.com/private', expect.objectContaining({
      credentials: 'include',
      redirect: 'error'
    }))
  })

  it('blocks arbitrary origins before making a request', async () => {
    const manager = new ProviderBrowserSessionManager([definition()])
    await expect(manager.client('example').fetch('https://attacker.example/private')).rejects.toThrow(/blocked/i)
    expect(electron.fetch).not.toHaveBeenCalled()
  })

  it('returns only the verifier identity and clears only configured provider storage', async () => {
    const manager = new ProviderBrowserSessionManager([definition()])
    await expect(manager.list()).resolves.toEqual([{
      providerId: 'example',
      displayName: 'Example',
      authenticated: true,
      accountLabel: 'person'
    }])

    await manager.logout('example')
    expect(electron.clearData).toHaveBeenCalledWith({
      dataTypes: ['cookies', 'localStorage', 'indexedDB', 'serviceWorkers']
    })
  })

  it('rejects unsafe ids, insecure login URLs, duplicates, and unknown providers', () => {
    expect(() => new ProviderBrowserSessionManager([definition({ providerId: '../escape' })])).toThrow(/invalid/i)
    expect(() => new ProviderBrowserSessionManager([definition({ loginUrl: 'http://example.com/login' })])).toThrow(/HTTPS/i)
    expect(() => new ProviderBrowserSessionManager([definition({ allowedRequestOrigins: ['https://example.com/'] })])).toThrow(/canonical/i)
    expect(() => new ProviderBrowserSessionManager([definition({ allowedNavigationOrigins: ['https://elsewhere.example'] })])).toThrow(/login origin/i)
    expect(() => new ProviderBrowserSessionManager([definition(), definition()])).toThrow(/duplicate/i)

    const manager = new ProviderBrowserSessionManager([definition()])
    expect(() => manager.client('missing')).toThrow(/unknown/i)
  })
})
