import type { DeepSeekCredentialStatus } from '@shared/ipc'
import { DEEPSEEK_PROVIDER_ID, type ProviderCredentialRepository } from './ProviderCredentialRepository'
import { readHarnessGrant } from '../providers/deepseekHarness'

export interface DeepSeekCredentialServiceOptions {
  env?: NodeJS.ProcessEnv
  harnessAccountAvailable?: () => Promise<boolean>
}

/**
 * Owns the non-secret DeepSeek credential state exposed to the dashboard.
 * The API key is written through the encrypted repository and never returned.
 */
export class DeepSeekCredentialService {
  private readonly env: NodeJS.ProcessEnv

  constructor(
    private readonly repository: ProviderCredentialRepository,
    private readonly options: DeepSeekCredentialServiceOptions = {}
  ) {
    this.env = options.env ?? process.env
  }

  async status(): Promise<DeepSeekCredentialStatus> {
    return {
      storedApiKeyConfigured: await this.repository.hasSecret(DEEPSEEK_PROVIDER_ID),
      environmentApiKeyAvailable: Boolean(this.env.DEEPSEEK_API_KEY?.trim()),
      harnessAccountAvailable: await this.harnessAccountAvailable()
    }
  }

  async saveApiKey(value: unknown): Promise<DeepSeekCredentialStatus> {
    await this.repository.setSecret(DEEPSEEK_PROVIDER_ID, value)
    return this.status()
  }

  async clearApiKey(): Promise<DeepSeekCredentialStatus> {
    await this.repository.clearSecret(DEEPSEEK_PROVIDER_ID)
    return this.status()
  }

  private async harnessAccountAvailable(): Promise<boolean> {
    if (this.options.harnessAccountAvailable) return this.options.harnessAccountAvailable()
    return (await readHarnessGrant({ env: this.env })) !== undefined
  }
}
