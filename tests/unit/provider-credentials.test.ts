import Database from 'better-sqlite3'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CredentialStoreUnavailableError,
  CredentialValidationError,
  DEEPSEEK_PROVIDER_ID,
  ProviderCredentialRepository,
  normalizeCredentialSecret,
  repositoryApiKeyStore,
  type CredentialCodec
} from '../../src/main/credentials/ProviderCredentialRepository'
import { DeepSeekCredentialService } from '../../src/main/credentials/DeepSeekCredentialService'
import { DEEPSEEK_ISSUER } from '../../src/main/providers/deepseekHarness'

const SECRET = 'sk-literal-secret-value-123'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function databasePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'widoken-credentials-'))
  temporaryDirectories.push(directory)
  return join(directory, 'analytics.sqlite')
}

const reversingCodec: CredentialCodec = {
  isAvailable: () => true,
  encrypt: (plaintext) => Buffer.from(`enc:${[...plaintext].reverse().join('')}`, 'utf8'),
  decrypt: (ciphertext) => {
    const value = ciphertext.toString('utf8')
    if (!value.startsWith('enc:')) throw new Error('not encrypted')
    return [...value.slice(4)].reverse().join('')
  }
}

const unavailableCodec: CredentialCodec = {
  isAvailable: () => false,
  encrypt: () => { throw new Error('should not encrypt') },
  decrypt: () => { throw new Error('should not decrypt') }
}

describe('ProviderCredentialRepository', () => {
  it('stores an encrypted secret and never persists the plaintext', async () => {
    const path = await databasePath()
    const repository = new ProviderCredentialRepository(path, { codec: reversingCodec })

    await repository.setSecret(DEEPSEEK_PROVIDER_ID, SECRET)
    expect(await repository.getSecret(DEEPSEEK_PROVIDER_ID)).toBe(SECRET)
    expect(await repository.hasSecret(DEEPSEEK_PROVIDER_ID)).toBe(true)

    const inspect = new Database(path, { readonly: true })
    const row = inspect
      .prepare('SELECT encrypted_secret FROM provider_credentials WHERE provider_id = ?')
      .get(DEEPSEEK_PROVIDER_ID) as { encrypted_secret: Buffer }
    inspect.close()

    const blob = Buffer.from(row.encrypted_secret)
    expect(blob.toString('utf8')).not.toContain(SECRET)
    expect(blob.equals(reversingCodec.encrypt(SECRET))).toBe(true)

    repository.close()
    expect((await readFile(path)).includes(Buffer.from(SECRET, 'utf8'))).toBe(false)
  })

  it('is idempotent and clears safely', async () => {
    const path = await databasePath()
    const repository = new ProviderCredentialRepository(path, { codec: reversingCodec })

    await repository.setSecret(DEEPSEEK_PROVIDER_ID, 'first-value')
    await repository.setSecret(DEEPSEEK_PROVIDER_ID, 'second-value')

    const inspect = new Database(path, { readonly: true })
    const count = inspect.prepare('SELECT COUNT(*) AS total FROM provider_credentials').get() as { total: number }
    inspect.close()
    expect(count.total).toBe(1)
    expect(await repository.getSecret(DEEPSEEK_PROVIDER_ID)).toBe('second-value')

    await repository.clearSecret(DEEPSEEK_PROVIDER_ID)
    expect(await repository.getSecret(DEEPSEEK_PROVIDER_ID)).toBeUndefined()
    expect(await repository.hasSecret(DEEPSEEK_PROVIDER_ID)).toBe(false)
    await repository.clearSecret(DEEPSEEK_PROVIDER_ID)
    repository.close()
    repository.close()
  })

  it('fails closed when the codec is unavailable', async () => {
    const path = await databasePath()
    const repository = new ProviderCredentialRepository(path, { codec: unavailableCodec })

    await expect(repository.setSecret(DEEPSEEK_PROVIDER_ID, SECRET)).rejects.toBeInstanceOf(CredentialStoreUnavailableError)
    await expect(repository.getSecret(DEEPSEEK_PROVIDER_ID)).resolves.toBeUndefined()
    expect(repository.isAvailable()).toBe(false)
    repository.close()
  })

  it('validates secrets before encryption', async () => {
    const path = await databasePath()
    const repository = new ProviderCredentialRepository(path, { codec: reversingCodec })

    await expect(repository.setSecret(DEEPSEEK_PROVIDER_ID, '   ')).rejects.toBeInstanceOf(CredentialValidationError)
    await expect(repository.setSecret(DEEPSEEK_PROVIDER_ID, 42)).rejects.toBeInstanceOf(CredentialValidationError)
    await expect(repository.setSecret(DEEPSEEK_PROVIDER_ID, 'a'.repeat(4097))).rejects.toBeInstanceOf(CredentialValidationError)
    expect(normalizeCredentialSecret('  trimmed  ')).toBe('trimmed')
    repository.close()
  })

  it('exposes an API key store for the adapter', async () => {
    const path = await databasePath()
    const repository = new ProviderCredentialRepository(path, { codec: reversingCodec })
    const store = repositoryApiKeyStore(repository)

    await repository.setSecret(DEEPSEEK_PROVIDER_ID, SECRET)
    expect(await store.getApiKey()).toBe(SECRET)
    expect(await store.hasApiKey()).toBe(true)
    repository.close()
  })
})

describe('DeepSeekCredentialService', () => {
  it('reports only non-secret status and round-trips the key', async () => {
    const path = await databasePath()
    const repository = new ProviderCredentialRepository(path, { codec: reversingCodec })
    const service = new DeepSeekCredentialService(repository, {
      env: { DEEPSEEK_API_KEY: 'environment-key' },
      harnessAccountAvailable: async () => true
    })

    expect(JSON.stringify(await service.status())).not.toContain(SECRET)
    expect(await service.status()).toEqual({
      storedApiKeyConfigured: false,
      environmentApiKeyAvailable: true,
      harnessAccountAvailable: true
    })

    const saved = await service.saveApiKey(SECRET)
    expect(saved).toEqual({
      storedApiKeyConfigured: true,
      environmentApiKeyAvailable: true,
      harnessAccountAvailable: true
    })
    expect(JSON.stringify(saved)).not.toContain(SECRET)

    const cleared = await service.clearApiKey()
    expect(cleared).toEqual({
      storedApiKeyConfigured: false,
      environmentApiKeyAvailable: true,
      harnessAccountAvailable: true
    })
    repository.close()
  })

  it('rejects invalid keys without echoing them', async () => {
    const path = await databasePath()
    const repository = new ProviderCredentialRepository(path, { codec: reversingCodec })
    const service = new DeepSeekCredentialService(repository, { env: {}, harnessAccountAvailable: async () => false })

    await expect(service.saveApiKey('   ')).rejects.toBeInstanceOf(CredentialValidationError)
    expect(JSON.stringify(await service.status())).not.toContain('undefined-key-value')
    repository.close()
  })

  it('detects the harness account from the credentials file when not injected', async () => {
    const path = await databasePath()
    const repository = new ProviderCredentialRepository(path, { codec: reversingCodec })
    const service = new DeepSeekCredentialService(repository, {
      env: { DSH_HOME: '/dsh-does-not-exist-widoken' }
    })

    expect(await service.status()).toEqual({
      storedApiKeyConfigured: false,
      environmentApiKeyAvailable: false,
      harnessAccountAvailable: false
    })
    expect(DEEPSEEK_ISSUER).toBe('https://platform.deepseek.com')
    repository.close()
  })
})
