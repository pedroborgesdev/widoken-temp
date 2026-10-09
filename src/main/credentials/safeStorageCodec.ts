import { safeStorage } from 'electron'
import type { CredentialCodec } from './ProviderCredentialRepository'

/**
 * Runtime codec backed by Electron safeStorage. Fails closed when the platform
 * cannot encrypt (no OS keyring) or when Linux falls back to basic_text.
 */
export const safeStorageCodec: CredentialCodec = {
  isAvailable(): boolean {
    try {
      if (!safeStorage.isEncryptionAvailable()) return false
      if (
        process.platform === 'linux' &&
        typeof safeStorage.getSelectedStorageBackend === 'function' &&
        safeStorage.getSelectedStorageBackend() === 'basic_text'
      ) {
        return false
      }
      return true
    } catch {
      return false
    }
  },
  encrypt(plaintext: string): Buffer {
    return safeStorage.encryptString(plaintext)
  },
  decrypt(ciphertext: Buffer): string {
    return safeStorage.decryptString(ciphertext)
  }
}
