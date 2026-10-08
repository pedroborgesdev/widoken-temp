import { describe, expect, it } from 'vitest'
import {
  antigravityProcessListingCommand,
  antigravityServerFromEnvironment,
  parseAntigravityProcessList
} from '../../src/main/providers/AntigravityDiscovery'
import { antigravityDataRoot } from '../../src/main/providers/antigravityStorage'

describe('Antigravity discovery', () => {
  it('uses native process enumeration on Windows, macOS, and Linux', () => {
    expect(antigravityProcessListingCommand('win32')).toMatchObject({
      executable: 'powershell.exe',
      args: expect.arrayContaining(['-NoProfile', '-NonInteractive'])
    })
    expect(antigravityProcessListingCommand('darwin')).toEqual({
      executable: 'ps',
      args: ['-axww', '-o', 'command=']
    })
    expect(antigravityProcessListingCommand('linux')).toEqual({
      executable: 'ps',
      args: ['-ww', '-eo', 'args=']
    })
  })

  it('parses Windows and Unix hub command lines with either flag syntax', () => {
    const output = [
      String.raw`"C:\Users\Ada\.gemini\bin\agy.exe" --hub --hub-port=5387 --csrf_token=12345678-abcd`,
      `/Applications/Antigravity.app/Contents/language_server_macos_arm --hub --hub-port 62000 --csrf_token 'token_12345678'`,
      '/usr/bin/unrelated --hub-port=9000 --csrf_token=should-not-match'
    ].join('\r\n')

    expect(parseAntigravityProcessList(output)).toEqual([
      { host: '127.0.0.1', port: 5387, csrfToken: '12345678-abcd' },
      { host: '127.0.0.1', port: 62000, csrfToken: 'token_12345678' }
    ])
  })

  it('rejects invalid ports, malformed tokens, and lookalike flags', () => {
    const output = [
      'agy --hub --hub-port=0 --csrf_token=12345678',
      'agy --hub --hub-port=70000 --csrf_token=12345678',
      'agy --hub --hub-port=5387 --csrf_token=bad/token',
      'agy --hub-port=5387 --csrf_token=12345678',
      'unrelated --hub --hub-port=5387 --csrf_token=12345678'
    ].join('\n')
    expect(parseAntigravityProcessList(output)).toEqual([])
  })

  it('prefers the official environment contract and only accepts loopback addresses', () => {
    expect(antigravityServerFromEnvironment({
      ANTIGRAVITY_LS_ADDRESS: 'localhost:5387',
      ANTIGRAVITY_CSRF_TOKEN: 'token-12345678'
    })).toEqual({ host: '127.0.0.1', port: 5387, csrfToken: 'token-12345678' })

    expect(antigravityServerFromEnvironment({
      ANTIGRAVITY_LS_ADDRESS: '[::1]:6123',
      ANTIGRAVITY_CSRF_TOKEN: 'token-12345678'
    })).toEqual({ host: '[::1]', port: 6123, csrfToken: 'token-12345678' })

    expect(antigravityServerFromEnvironment({
      ANTIGRAVITY_LS_ADDRESS: 'example.com:5387',
      ANTIGRAVITY_CSRF_TOKEN: 'token-12345678'
    })).toBeUndefined()
  })

  it('resolves the documented local data tree on every supported platform', () => {
    expect(antigravityDataRoot('win32', String.raw`C:\Users\Ada`))
      .toBe(String.raw`C:\Users\Ada\.gemini\antigravity`)
    expect(antigravityDataRoot('darwin', '/Users/ada')).toBe('/Users/ada/.gemini/antigravity')
    expect(antigravityDataRoot('linux', '/home/ada')).toBe('/home/ada/.gemini/antigravity')
  })
})
