import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEEPSEEK_ISSUER,
  HARNESS_ACCOUNT_RECORD,
  harnessClientPlatform,
  harnessCredentialPath,
  harnessHeaders,
  parseHarnessGrant,
  parsePlatformSummary,
  platformResponseCode,
  platformSessionRejected,
  readHarnessGrant
} from '../../src/main/providers/deepseekHarness'

function documentWith(record: unknown): unknown {
  return { version: 1, records: { [HARNESS_ACCOUNT_RECORD]: record } }
}

const validRecord = {
  kind: 'grant',
  payload: { version: 1, token: 'ascii-token-123', issuer: DEEPSEEK_ISSUER }
}

describe('harness credential path', () => {
  it('prefers DSH_HOME and falls back to the home directory', () => {
    expect(harnessCredentialPath({ DSH_HOME: '/dsh' }, '/home/me'))
      .toBe(join('/dsh', '.credentials.yaml'))
    expect(harnessCredentialPath({}, '/home/me')).toBe(join('/home/me', '.dsh', '.credentials.yaml'))
    expect(harnessCredentialPath({ DSH_HOME: '   ' }, '/home/me')).toBe(join('/home/me', '.dsh', '.credentials.yaml'))
  })
})

describe('harness grant parsing', () => {
  it('accepts a valid grant record', () => {
    expect(parseHarnessGrant(documentWith(validRecord))).toEqual({
      token: 'ascii-token-123',
      issuer: DEEPSEEK_ISSUER
    })
  })

  it('accepts a record placed at the document root', () => {
    expect(parseHarnessGrant({ [HARNESS_ACCOUNT_RECORD]: validRecord })).toMatchObject({
      token: 'ascii-token-123'
    })
  })

  it.each([
    ['missing kind', { payload: validRecord.payload }],
    ['wrong kind', { ...validRecord, kind: 'token' }],
    ['missing payload', { kind: 'grant' }],
    ['foreign issuer', { kind: 'grant', payload: { ...validRecord.payload, issuer: 'https://evil.example' } }],
    ['non-string token', { kind: 'grant', payload: { ...validRecord.payload, token: 42 } }],
    ['blank token', { kind: 'grant', payload: { ...validRecord.payload, token: '   ' } }],
    ['non-ascii token', { kind: 'grant', payload: { ...validRecord.payload, token: 'token\u0000' } }]
  ])('rejects %s', (_label, record) => {
    expect(parseHarnessGrant(documentWith(record))).toBeUndefined()
  })

  it('reads a valid credentials file without touching other records', async () => {
    const grant = await readHarnessGrant({
      env: { DSH_HOME: '/dsh' },
      readFile: async (path) => {
        expect(path).toBe(join('/dsh', '.credentials.yaml'))
        return [
          'version: 1',
          'records:',
          '  client-connection/browser-session:',
          '    kind: session',
          `  ${HARNESS_ACCOUNT_RECORD}:`,
          '    kind: grant',
          '    payload:',
          '      version: 1',
          "      token: 'ascii-token-123'",
          `      issuer: ${DEEPSEEK_ISSUER}`,
          ''
        ].join('\n')
      }
    })

    expect(grant).toEqual({ token: 'ascii-token-123', issuer: DEEPSEEK_ISSUER })
  })

  it('returns undefined for missing or malformed files', async () => {
    await expect(readHarnessGrant({ readFile: async () => { throw new Error('ENOENT') } })).resolves.toBeUndefined()
    await expect(readHarnessGrant({ readFile: async () => ': : :' })).resolves.toBeUndefined()
  })
})

describe('platform summary parsing', () => {
  it('sums normal and bonus wallets per currency', () => {
    expect(parsePlatformSummary({
      code: 0,
      data: {
        biz_code: 0,
        biz_data: {
          normal_wallets: [
            { currency: 'USD', balance: '10.00' },
            { currency: 'CNY', balance: '70.00' }
          ],
          bonus_wallets: [
            { currency: 'USD', balance: '2.50' },
            { currency: 'CNY', balance: '0.30' }
          ]
        }
      }
    })).toEqual([
      { currency: 'CNY', remaining: 70.3 },
      { currency: 'USD', remaining: 12.5 }
    ])
  })

  it('accepts scientific notation and rejects malformed numbers', () => {
    expect(parsePlatformSummary({
      code: 0,
      data: {
        biz_code: 0,
        biz_data: {
          normal_wallets: [
            { currency: 'USD', balance: '1e-2' },
            { currency: 'CNY', balance: 'nope' },
            { currency: 'EUR', balance: '5' },
            { currency: 'BRL', balance: -1 }
          ],
          bonus_wallets: []
        }
      }
    })).toEqual([{ currency: 'USD', remaining: 0.01 }])
  })

  it.each([
    ['missing data', { code: 0 }],
    ['bad biz code', { code: 0, data: { biz_code: 7, biz_data: {} } }],
    ['missing wallets', { code: 0, data: { biz_code: 0, biz_data: {} } }],
    ['null', null]
  ])('returns nothing for %s', (_label, payload) => {
    expect(parsePlatformSummary(payload)).toEqual([])
  })

  it('flags a rejected platform session', () => {
    expect(platformSessionRejected({ code: 40003 })).toBe(true)
    expect(platformSessionRejected({ code: 0 })).toBe(false)
    expect(platformResponseCode({ code: 12 })).toBe(12)
    expect(platformResponseCode('nope')).toBeUndefined()
  })
})

describe('platform client headers', () => {
  it('maps the platform and normalizes locale and timezone', () => {
    expect(harnessClientPlatform('win32')).toBe('desktop-win')
    expect(harnessClientPlatform('darwin')).toBe('desktop-mac')
    expect(harnessClientPlatform('linux')).toBe('web')

    expect(harnessHeaders('token', {
      platform: 'win32',
      version: '2.0.0',
      locale: 'zh_CN',
      timezoneOffsetSeconds: 3600
    })).toEqual({
      Accept: 'application/json',
      'x-dsh-auth-token': 'token',
      'x-client-bundle-id': '',
      'x-client-platform': 'desktop-win',
      'x-client-version': '2.0.0',
      'x-client-locale': 'zh_CN',
      'x-client-timezone-offset': '3600'
    })

    expect(harnessHeaders('token', { locale: 'fr_FR' })['x-client-locale']).toBe('en_US')
  })
})
