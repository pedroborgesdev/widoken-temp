import { afterEach, describe, expect, it, vi } from 'vitest'

const safeStorageMock = vi.hoisted(() => ({
  isEncryptionAvailable: vi.fn(() => true),
  getSelectedStorageBackend: vi.fn(() => 'kwallet'),
  encryptString: vi.fn((value: string) => Buffer.from(`encrypted:${value}`, 'utf8')),
  decryptString: vi.fn((value: Buffer) => value.toString('utf8').replace('encrypted:', ''))
}))

vi.mock('electron', () => ({ safeStorage: safeStorageMock }))

const { safeStorageCodec } = await import('../../src/main/credentials/safeStorageCodec')

const originalPlatform = process.platform

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform })
  safeStorageMock.isEncryptionAvailable.mockReturnValue(true)
  safeStorageMock.getSelectedStorageBackend.mockReturnValue('kwallet')
})

function usePlatform(platform: string): void {
  Object.defineProperty(process, 'platform', { value: platform })
}

describe('safeStorage codec', () => {
  it('round-trips secrets when encryption is available', () => {
    expect(safeStorageCodec.isAvailable()).toBe(true)
    expect(safeStorageCodec.decrypt(safeStorageCodec.encrypt('secret'))).toBe('secret')
  })

  it('fails closed when the platform cannot encrypt', () => {
    safeStorageMock.isEncryptionAvailable.mockReturnValue(false)
    expect(safeStorageCodec.isAvailable()).toBe(false)
  })

  it('rejects the Linux basic_text backend', () => {
    usePlatform('linux')
    safeStorageMock.getSelectedStorageBackend.mockReturnValue('basic_text')
    expect(safeStorageCodec.isAvailable()).toBe(false)

    safeStorageMock.getSelectedStorageBackend.mockReturnValue('gnome_libsecret')
    expect(safeStorageCodec.isAvailable()).toBe(true)
  })

  it('ignores the backend check outside Linux', () => {
    usePlatform('win32')
    safeStorageMock.getSelectedStorageBackend.mockReturnValue('basic_text')
    expect(safeStorageCodec.isAvailable()).toBe(true)
  })
})
