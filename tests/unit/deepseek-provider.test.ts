import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderSetting } from '../../src/shared/settings'
import {
  applyDeepSeekBaseline,
  DEEPSEEK_BASELINE_VERSION,
  DeepSeekProviderAdapter,
  parseDeepSeekBalances,
  sanitizeBalanceStates,
  type BalanceState,
  type DeepSeekAdapterOptions
} from '../../src/main/providers/DeepSeekProviderAdapter'
import { DEEPSEEK_ISSUER, HARNESS_SUMMARY_ENDPOINT } from '../../src/main/providers/deepseekHarness'

const temporaryDirectories: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function statePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'widoken-deepseek-'))
  temporaryDirectories.push(directory)
  return join(directory, 'deepseek-balance.json')
}

function state(capacity: number, remaining: number): BalanceState {
  return { capacity, remaining, baselineVersion: DEEPSEEK_BASELINE_VERSION }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function apiKeyPayload(total: string, currency = 'USD'): Response {
  return jsonResponse({
    is_available: Number(total) > 0,
    balance_infos: [{ currency, total_balance: total, granted_balance: '0.00', topped_up_balance: total }]
  })
}

function platformPayload(usd: string, cny?: string, bonusUsd = '0.00'): Response {
  return jsonResponse({
    code: 0,
    data: {
      biz_code: 0,
      biz_data: {
        normal_wallets: [{ currency: 'USD', balance: usd }, ...(cny ? [{ currency: 'CNY', balance: cny }] : [])],
        bonus_wallets: [{ currency: 'USD', balance: bonusUsd }]
      }
    }
  })
}

const grant = { token: 'harness-token', issuer: DEEPSEEK_ISSUER } as const

function setting(credentialSource: ProviderSetting['credentialSource']): ProviderSetting {
  return { id: 'deepseek', enabled: true, order: 0, usageDisplay: { split: false }, credentialSource }
}

function adapter(options: DeepSeekAdapterOptions): DeepSeekProviderAdapter {
  return new DeepSeekProviderAdapter(options)
}

function apiKeyAdapter(options: DeepSeekAdapterOptions = {}): DeepSeekProviderAdapter {
  const instance = adapter({
    apiKeys: { getApiKey: async () => 'stored-key', hasApiKey: async () => true },
    env: {},
    ...options
  })
  instance.configure(setting('api-key'))
  return instance
}

describe('DeepSeek baseline rule', () => {
  it('sets the first observation as capacity with no usage', () => {
    expect(applyDeepSeekBaseline(undefined, 10)).toEqual({
      state: state(10, 10),
      limit: { percent: 0, used: 0, limit: 10, remaining: 10 }
    })
  })

  it('keeps the capacity while the balance falls and measures usage against it', () => {
    expect(applyDeepSeekBaseline(state(10, 10), 5)).toEqual({
      state: state(10, 5),
      limit: { percent: 50, used: 5, limit: 10, remaining: 5 }
    })
  })

  it('treats a balance above the previous reading as a recharge that resets the whole capacity', () => {
    const recharged = applyDeepSeekBaseline(state(10, 5), 7)

    expect(recharged.state).toEqual(state(7, 7))
    expect(recharged.limit).toEqual({ percent: 0, used: 0, limit: 7, remaining: 7 })

    const afterRecharge = applyDeepSeekBaseline(recharged.state, 6)
    expect(afterRecharge.state).toEqual(state(7, 6))
    expect(afterRecharge.limit).toMatchObject({ used: 1, limit: 7, remaining: 6 })
    expect(afterRecharge.limit.percent).toBeCloseTo(14.285714, 6)
  })

  it('keeps a first observation at zero fully depleted', () => {
    expect(applyDeepSeekBaseline(undefined, 0)).toEqual({
      state: state(0, 0),
      limit: { percent: 100, used: 0, limit: 0, remaining: 0 }
    })
  })

  it('never derives the percent from the absolute balance value', () => {
    // 2 would read 98 under an absolute formula, but only the observed baseline matters.
    expect(applyDeepSeekBaseline(undefined, 2).limit.percent).toBe(0)
    expect(applyDeepSeekBaseline(state(100, 50), 2).limit.percent).toBe(98)
  })
})

describe('DeepSeek baseline persistence', () => {
  it('follows the 10 -> 5 -> 7 -> 6 sequence and persists the last capacity', async () => {
    const path = await statePath()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiKeyPayload('10.00'))
      .mockResolvedValueOnce(apiKeyPayload('5.00'))
      .mockResolvedValueOnce(apiKeyPayload('7.00'))
      .mockResolvedValueOnce(apiKeyPayload('6.00'))
    const instance = apiKeyAdapter({ statePath: path, fetchImpl: fetchMock as unknown as typeof fetch })

    const first = await instance.getUsage()
    const second = await instance.getUsage()
    const recharged = await instance.getUsage()
    const fourth = await instance.getUsage()

    expect(first.limits[0]).toMatchObject({ percent: 0, used: 0, limit: 10, remaining: 10 })
    expect(second.limits[0]).toMatchObject({ percent: 50, used: 5, limit: 10, remaining: 5 })
    expect(recharged.limits[0]).toMatchObject({ percent: 0, used: 0, limit: 7, remaining: 7 })
    expect(fourth.limits[0]).toMatchObject({ used: 1, limit: 7, remaining: 6 })
    expect(fourth.limits[0]?.percent).toBeCloseTo(14.285714, 6)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      'api-key:USD': { capacity: 7, remaining: 6, baselineVersion: DEEPSEEK_BASELINE_VERSION }
    })
  })

  it('restores the capacity after an adapter restart and rebases it on a later recharge', async () => {
    const path = await statePath()
    const firstRun = apiKeyAdapter({
      statePath: path,
      fetchImpl: vi.fn(async () => apiKeyPayload('100.00')) as unknown as typeof fetch
    })
    await firstRun.getUsage()

    const secondRun = apiKeyAdapter({
      statePath: path,
      fetchImpl: vi.fn(async () => apiKeyPayload('75.00')) as unknown as typeof fetch
    })
    const consumed = await secondRun.getUsage()

    expect(consumed.limits[0]).toMatchObject({ percent: 25, used: 25, limit: 100, remaining: 75 })
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      'api-key:USD': { capacity: 100, remaining: 75, baselineVersion: DEEPSEEK_BASELINE_VERSION }
    })

    const thirdRun = apiKeyAdapter({
      statePath: path,
      fetchImpl: vi.fn(async () => apiKeyPayload('90.00')) as unknown as typeof fetch
    })
    const recharged = await thirdRun.getUsage()

    expect(recharged.limits[0]).toMatchObject({ percent: 0, used: 0, limit: 90, remaining: 90 })
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      'api-key:USD': { capacity: 90, remaining: 90, baselineVersion: DEEPSEEK_BASELINE_VERSION }
    })
  })

  it('keeps two auth sources and currencies isolated', async () => {
    const path = await statePath()
    const apiValues = ['40.00', '30.00']
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === HARNESS_SUMMARY_ENDPOINT) return platformPayload('10.00')
      return apiKeyPayload(apiValues.shift() ?? '30.00')
    })
    const instance = adapter({
      statePath: path,
      fetchImpl: fetchMock as unknown as typeof fetch,
      readHarnessGrant: async () => grant,
      apiKeys: { getApiKey: async () => 'stored-key', hasApiKey: async () => true },
      env: {}
    })

    instance.configure(setting('api-key'))
    const apiBaseline = await instance.getUsage()
    instance.configure(setting('harness-account'))
    const harnessBaseline = await instance.getUsage()
    instance.configure(setting('api-key'))
    const apiConsumed = await instance.getUsage()

    expect(apiBaseline.limits[0]).toMatchObject({ percent: 0, used: 0, limit: 40, remaining: 40 })
    expect(harnessBaseline.limits[0]).toMatchObject({ percent: 0, used: 0, limit: 10, remaining: 10 })
    expect(apiConsumed.limits[0]).toMatchObject({ percent: 25, used: 10, limit: 40, remaining: 30 })
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      'api-key:USD': { capacity: 40, remaining: 30, baselineVersion: DEEPSEEK_BASELINE_VERSION },
      'harness-account:USD': { capacity: 10, remaining: 10, baselineVersion: DEEPSEEK_BASELINE_VERSION }
    })
  })

  it('exposes stable balance IDs per currency', async () => {
    const instance = apiKeyAdapter({
      fetchImpl: vi.fn(async () => jsonResponse({
        is_available: true,
        balance_infos: [
          { currency: 'USD', total_balance: '20.00' },
          { currency: 'CNY', total_balance: '3.53' }
        ]
      })) as unknown as typeof fetch
    })

    const limits = (await instance.getUsage()).limits

    expect(limits.map(({ id, currency, percent, used, limit, remaining }) => ({ id, currency, percent, used, limit, remaining }))).toEqual([
      { id: 'balance-cny', currency: 'CNY', percent: 0, used: 0, limit: 3.53, remaining: 3.53 },
      { id: 'balance-usd', currency: 'USD', percent: 0, used: 0, limit: 20, remaining: 20 }
    ])
  })
})

describe('DeepSeek state migration', () => {
  it('rebases legacy states without a marker to the persisted remaining balance', () => {
    expect(sanitizeBalanceStates({
      USD: { capacity: 100, remaining: 25 },
      'api-key:CNY': { capacity: 80, remaining: 20, baselineVersion: 2 },
      'harness-account:USD': { capacity: 9, remaining: 4, baselineVersion: 1 },
      'api-key:EUR': { capacity: -1, remaining: 0 },
      'unknown:USD': { capacity: 5, remaining: 5 }
    })).toEqual({
      'api-key:USD': { capacity: 25, remaining: 25, baselineVersion: 2 },
      'api-key:CNY': { capacity: 80, remaining: 20, baselineVersion: 2 },
      'harness-account:USD': { capacity: 4, remaining: 4, baselineVersion: 2 },
      'api-key:EUR': { capacity: 0, remaining: 0, baselineVersion: 2 }
    })
  })

  it('rewrites a legacy file on load and starts from the current balance', async () => {
    const path = await statePath()
    await writeFile(path, JSON.stringify({ USD: { capacity: 100, remaining: 25 } }))
    const instance = apiKeyAdapter({
      statePath: path,
      fetchImpl: vi.fn(async () => apiKeyPayload('25.00')) as unknown as typeof fetch
    })

    const snapshot = await instance.getUsage()

    expect(snapshot.limits[0]).toMatchObject({ percent: 0, used: 0, limit: 25, remaining: 25 })
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      'api-key:USD': { capacity: 25, remaining: 25, baselineVersion: DEEPSEEK_BASELINE_VERSION }
    })
  })

  it('drops malformed persisted states', () => {
    expect(sanitizeBalanceStates({
      'api-key:USD': 'nope',
      'api-key:CNY': { capacity: 5, remaining: 'y', baselineVersion: 2 },
      'bad key': { capacity: 5, remaining: 5 },
      'api-key:BRL': { capacity: 5, remaining: -1, baselineVersion: 2 }
    })).toEqual({})
  })
})

describe('DeepSeek balance parsing', () => {
  it('parses supported balances and rejects malformed values', () => {
    expect(parseDeepSeekBalances({
      balance_infos: [
        { currency: 'usd', total_balance: '12.50' },
        { currency: 'CNY', total_balance: '30' },
        { currency: 'invalid', total_balance: '4' },
        { currency: 'EUR', total_balance: '-1' },
        { currency: 'BRL', total_balance: 'not-a-number' }
      ]
    })).toEqual([
      { currency: 'CNY', remaining: 30 },
      { currency: 'USD', remaining: 12.5 }
    ])
  })
})

describe('DeepSeek source selection', () => {
  it('sums normal and bonus wallets from the Harness account first in auto mode', async () => {
    const fetchMock = vi.fn(async () => platformPayload('10.00', undefined, '2.50'))
    const snapshot = await adapter({
      fetchImpl: fetchMock as unknown as typeof fetch,
      readHarnessGrant: async () => grant,
      apiKeys: { getApiKey: async () => 'stored-key', hasApiKey: async () => true },
      env: {}
    }).getUsage()

    expect(fetchMock).toHaveBeenCalledWith(
      HARNESS_SUMMARY_ENDPOINT,
      expect.objectContaining({
        redirect: 'error',
        headers: expect.objectContaining({
          'x-dsh-auth-token': 'harness-token',
          'x-client-bundle-id': ''
        })
      })
    )
    expect(snapshot).toMatchObject({
      providerId: 'deepseek',
      status: 'connected',
      authSource: 'harness-account',
      limits: [{
        id: 'balance-usd',
        label: 'USD balance',
        currency: 'USD',
        percent: 0,
        remaining: 12.5
      }]
    })
  })

  it('falls back to the API key and keeps using it on later polls', async () => {
    const platformCalls: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === HARNESS_SUMMARY_ENDPOINT) {
        platformCalls.push(url)
        return jsonResponse({ code: 500 }, 500)
      }
      return apiKeyPayload('40.00')
    })
    const instance = adapter({
      fetchImpl: fetchMock as unknown as typeof fetch,
      readHarnessGrant: async () => grant,
      apiKeys: { getApiKey: async () => 'stored-key', hasApiKey: async () => true },
      env: {}
    })

    const first = await instance.getUsage()
    const second = await instance.getUsage()

    expect(first).toMatchObject({ status: 'connected', authSource: 'api-key' })
    expect(second).toMatchObject({ status: 'connected', authSource: 'api-key' })
    expect(platformCalls).toHaveLength(1)
  })

  it('switches sources when the cached source starts failing', async () => {
    let harnessFails = false
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === HARNESS_SUMMARY_ENDPOINT) {
        return harnessFails ? new Response('', { status: 401 }) : platformPayload('30.00')
      }
      return apiKeyPayload('40.00')
    })
    const instance = adapter({
      fetchImpl: fetchMock as unknown as typeof fetch,
      readHarnessGrant: async () => grant,
      apiKeys: { getApiKey: async () => 'stored-key', hasApiKey: async () => true },
      env: {}
    })

    expect((await instance.getUsage()).authSource).toBe('harness-account')

    harnessFails = true
    expect((await instance.getUsage()).authSource).toBe('api-key')

    const cached = await instance.getUsage()
    expect(cached).toMatchObject({ status: 'connected', authSource: 'api-key' })
    expect(cached.limits[0]).toMatchObject({ remaining: 40 })
  })

  it('never falls back in fixed Harness mode', async () => {
    const apiCalls = vi.fn()
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === HARNESS_SUMMARY_ENDPOINT) return new Response('', { status: 401 })
      apiCalls()
      return apiKeyPayload('40.00')
    })
    const instance = adapter({
      fetchImpl: fetchMock as unknown as typeof fetch,
      readHarnessGrant: async () => grant,
      apiKeys: { getApiKey: async () => 'stored-key', hasApiKey: async () => true },
      env: {}
    })
    instance.configure(setting('harness-account'))

    const snapshot = await instance.getUsage()

    expect(snapshot.status).toBe('error')
    expect(snapshot.authSource).toBeUndefined()
    expect(snapshot.error).toContain('Harness')
    expect(apiCalls).not.toHaveBeenCalled()
  })

  it('never falls back in fixed API key mode', async () => {
    const fetchMock = vi.fn(async () => platformPayload('10.00'))
    const instance = adapter({
      fetchImpl: fetchMock as unknown as typeof fetch,
      readHarnessGrant: async () => grant,
      apiKeys: { getApiKey: async () => undefined, hasApiKey: async () => false },
      env: {}
    })
    instance.configure(setting('api-key'))

    const snapshot = await instance.getUsage()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(snapshot).toMatchObject({ status: 'unavailable', limits: [] })
    expect(snapshot.error).toContain('API key')
  })

  it('prefers the stored API key over the environment fallback', async () => {
    const fetchMock = vi.fn(async () => apiKeyPayload('1.00'))
    const instance = adapter({
      fetchImpl: fetchMock as unknown as typeof fetch,
      apiKeys: { getApiKey: async () => 'stored-key', hasApiKey: async () => true },
      env: { DEEPSEEK_API_KEY: 'environment-key' }
    })
    instance.configure(setting('api-key'))

    await instance.getUsage()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/user/balance',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer stored-key' }) })
    )
  })

  it('uses the environment API key when the repository has none', async () => {
    const fetchMock = vi.fn(async () => apiKeyPayload('5.00'))
    const instance = adapter({
      fetchImpl: fetchMock as unknown as typeof fetch,
      apiKeys: { getApiKey: async () => undefined, hasApiKey: async () => false },
      env: { DEEPSEEK_API_KEY: 'environment-key' }
    })
    instance.configure(setting('api-key'))

    const snapshot = await instance.getUsage()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/user/balance',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer environment-key' }) })
    )
    expect(snapshot).toMatchObject({ status: 'connected', authSource: 'api-key' })
  })

  it('reports unavailable when no credential source is configured', async () => {
    const fetchMock = vi.fn()
    const snapshot = await adapter({
      fetchImpl: fetchMock as unknown as typeof fetch,
      readHarnessGrant: async () => undefined,
      env: {}
    }).getUsage()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(snapshot).toMatchObject({ status: 'unavailable', limits: [] })
  })
})

describe('DeepSeek adapter failures', () => {
  it.each([
    [401, 'rejected'],
    [403, 'rejected'],
    [429, 'rate limited']
  ])('reports API key HTTP %i explicitly', async (status, message) => {
    const instance = apiKeyAdapter({
      fetchImpl: vi.fn(async () => new Response('', { status })) as unknown as typeof fetch
    })

    const snapshot = await instance.getUsage()

    expect(snapshot.status).toBe('error')
    expect(snapshot.error).toContain(message)
  })

  it('reports offline failures without exposing the API key', async () => {
    const instance = adapter({
      fetchImpl: vi.fn(async () => { throw new Error('network unavailable') }) as unknown as typeof fetch,
      apiKeys: { getApiKey: async () => 'secret-value', hasApiKey: async () => true },
      env: {}
    })
    instance.configure(setting('api-key'))

    const snapshot = await instance.getUsage()

    expect(snapshot.status).toBe('error')
    expect(JSON.stringify(snapshot)).not.toContain('secret-value')
  })

  it('rejects malformed successful payloads', async () => {
    const instance = apiKeyAdapter({
      fetchImpl: vi.fn(async () => jsonResponse({ balance_infos: [] })) as unknown as typeof fetch
    })

    const snapshot = await instance.getUsage()

    expect(snapshot).toMatchObject({ status: 'unavailable', limits: [] })
    expect(snapshot.error).toContain('no valid account balance')
  })

  it('reports invalid JSON without exposing the API key', async () => {
    const instance = adapter({
      fetchImpl: vi.fn(async () => new Response('not-json', { status: 200 })) as unknown as typeof fetch,
      apiKeys: { getApiKey: async () => 'secret-value', hasApiKey: async () => true },
      env: {}
    })
    instance.configure(setting('api-key'))

    const snapshot = await instance.getUsage()

    expect(snapshot.status).toBe('error')
    expect(snapshot.limits).toEqual([])
    expect(JSON.stringify(snapshot)).not.toContain('secret-value')
  })

  it('never leaks the Harness token in errors or snapshots', async () => {
    const instance = adapter({
      fetchImpl: vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch,
      readHarnessGrant: async () => grant,
      env: {}
    })
    instance.configure(setting('harness-account'))

    const snapshot = await instance.getUsage()

    expect(snapshot.status).toBe('error')
    expect(JSON.stringify(snapshot)).not.toContain('harness-token')
  })

  it('treats a platform code 40003 as a rejected Harness session', async () => {
    const instance = adapter({
      fetchImpl: vi.fn(async () => jsonResponse({ code: 40003 })) as unknown as typeof fetch,
      readHarnessGrant: async () => grant,
      env: {}
    })
    instance.configure(setting('harness-account'))

    const snapshot = await instance.getUsage()

    expect(snapshot.status).toBe('error')
    expect(snapshot.error).toContain('rejected the stored session')
    expect(JSON.stringify(snapshot)).not.toContain('harness-token')
  })

  it('reports Harness network failures without exposing the token', async () => {
    const instance = adapter({
      fetchImpl: vi.fn(async () => { throw new Error('socket hang up') }) as unknown as typeof fetch,
      readHarnessGrant: async () => grant,
      env: {}
    })
    instance.configure(setting('harness-account'))

    const snapshot = await instance.getUsage()

    expect(snapshot).toMatchObject({ status: 'error', limits: [] })
    expect(snapshot.error).toContain('Unable to reach')
    expect(JSON.stringify(snapshot)).not.toContain('harness-token')
  })
})
