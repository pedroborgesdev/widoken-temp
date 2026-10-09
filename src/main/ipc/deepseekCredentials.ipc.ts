import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type { DeepSeekCredentialService } from '../credentials/DeepSeekCredentialService'
import type { ProviderManager } from '../providers/ProviderManager'

/**
 * Dashboard-only DeepSeek credential IPC. Handlers return non-secret status only
 * and re-validate every value in the main process before it reaches storage.
 */
export function registerDeepSeekCredentialsIpc(
  service: DeepSeekCredentialService,
  providers: ProviderManager
): void {
  ipcMain.handle(IPC.deepseekCredentialStatus, () => service.status())
  ipcMain.handle(IPC.deepseekSaveApiKey, async (_event, apiKey: unknown) => {
    const status = await service.saveApiKey(apiKey)
    void providers.refresh('deepseek')
    return status
  })
  ipcMain.handle(IPC.deepseekClearApiKey, async () => {
    const status = await service.clearApiKey()
    void providers.refresh('deepseek')
    return status
  })
}
