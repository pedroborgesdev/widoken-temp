import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export const DEEPSEEK_PROVIDER_ID = 'deepseek'
export const MAX_CREDENTIAL_LENGTH = 4096

/** Encrypts/decrypts stored provider secrets. Electron's safeStorage is used at runtime. */
export interface CredentialCodec {
  isAvailable(): boolean
  encrypt(plaintext: string): Buffer
  decrypt(ciphertext: Buffer): string
}

export class CredentialValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CredentialValidationError'
  }
}

export class CredentialStoreUnavailableError extends Error {
  constructor(message = 'Secure credential storage is unavailable on this system.') {
    super(message)
    this.name = 'CredentialStoreUnavailableError'
  }
}

/** Trims and validates a secret before it is encrypted. Never logs or returns the raw value. */
export function normalizeCredentialSecret(value: unknown, maxLength = MAX_CREDENTIAL_LENGTH): string {
  if (typeof value !== 'string') throw new CredentialValidationError('API key must be a string.')
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new CredentialValidationError('API key cannot be empty.')
  if (trimmed.length > maxLength) {
    throw new CredentialValidationError(`API key cannot exceed ${maxLength} characters.`)
  }
  return trimmed
}

export interface ProviderCredentialRepositoryOptions {
  codec: CredentialCodec
  maxSecretLength?: number
}

export class ProviderCredentialRepository {
  private database?: Database.Database

  constructor(
    databasePath: string,
    private readonly options: ProviderCredentialRepositoryOptions
  ) {
    try {
      mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 })
      this.database = new Database(databasePath, { timeout: 250 })
      this.database.pragma('busy_timeout = 250')
      this.database.pragma('journal_mode = WAL')
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS provider_credentials (
          provider_id TEXT PRIMARY KEY,
          encrypted_secret BLOB NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `)
    } catch {
      this.database = undefined
    }
  }

  isAvailable(): boolean {
    return Boolean(this.database) && this.options.codec.isAvailable()
  }

  /** Decrypts only in the main process. Returns undefined when unavailable or undecryptable. */
  async getSecret(providerId: string): Promise<string | undefined> {
    if (!this.database || !this.options.codec.isAvailable()) return undefined
    try {
      const row = this.database
        .prepare('SELECT encrypted_secret FROM provider_credentials WHERE provider_id = ?')
        .get(providerId) as { encrypted_secret: Buffer } | undefined
      if (!row) return undefined
      const decrypted = this.options.codec.decrypt(Buffer.from(row.encrypted_secret))
      return decrypted.length > 0 ? decrypted : undefined
    } catch {
      return undefined
    }
  }

  /** Row presence only; used for non-secret configuration status. */
  async hasSecret(providerId: string): Promise<boolean> {
    if (!this.database) return false
    try {
      const row = this.database
        .prepare('SELECT 1 AS present FROM provider_credentials WHERE provider_id = ?')
        .get(providerId) as { present: number } | undefined
      return row !== undefined
    } catch {
      return false
    }
  }

  async setSecret(providerId: string, value: unknown): Promise<void> {
    const secret = normalizeCredentialSecret(value, this.options.maxSecretLength)
    if (!this.database) throw new CredentialStoreUnavailableError()
    if (!this.options.codec.isAvailable()) throw new CredentialStoreUnavailableError()
    const encrypted = this.options.codec.encrypt(secret)
    this.database.prepare(`
      INSERT INTO provider_credentials (provider_id, encrypted_secret, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(provider_id) DO UPDATE SET
        encrypted_secret = excluded.encrypted_secret,
        updated_at = excluded.updated_at
    `).run(providerId, encrypted, Date.now())
  }

  async clearSecret(providerId: string): Promise<void> {
    if (!this.database) return
    try {
      this.database.prepare('DELETE FROM provider_credentials WHERE provider_id = ?').run(providerId)
    } catch {
      // A missing row or closed database is already the desired state.
    }
  }

  close(): void {
    try {
      this.database?.close()
    } catch {
      // The application is already shutting down.
    }
    this.database = undefined
  }
}

export interface ApiKeyStore {
  getApiKey(): Promise<string | undefined>
  hasApiKey(): Promise<boolean>
}

export function repositoryApiKeyStore(
  repository: ProviderCredentialRepository,
  providerId = DEEPSEEK_PROVIDER_ID
): ApiKeyStore {
  return {
    getApiKey: () => repository.getSecret(providerId),
    hasApiKey: () => repository.hasSecret(providerId)
  }
}
