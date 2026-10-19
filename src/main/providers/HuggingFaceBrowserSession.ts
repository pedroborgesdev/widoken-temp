import type { ProviderBrowserSessionDefinition } from '../browserSessions/ProviderBrowserSessionManager'

const HUGGING_FACE_ORIGIN = 'https://huggingface.co'

export const huggingFaceBrowserSessionDefinition: ProviderBrowserSessionDefinition = {
  providerId: 'huggingface',
  displayName: 'Hugging Face',
  loginUrl: `${HUGGING_FACE_ORIGIN}/login`,
  allowedNavigationOrigins: [HUGGING_FACE_ORIGIN],
  allowedRequestOrigins: [HUGGING_FACE_ORIGIN],
  welcome: {
    reason: 'Hugging Face exposes billing balance and inference usage through endpoints that require an authenticated website session.',
    collectedData: [
      'Your account name, only to identify the connected session',
      'Your current USD billing balance',
      'Monthly Inference Providers request count and spend'
    ]
  },
  verify: async (client) => {
    const response = await client.fetch(`${HUGGING_FACE_ORIGIN}/api/whoami-v2`, {
      headers: { Accept: 'application/json' }
    })
    if (response.status === 401 || response.status === 403) return undefined
    if (!response.ok) throw new Error(`Could not verify the Hugging Face session (HTTP ${response.status}).`)
    const identity = await response.json() as { type?: unknown; id?: unknown; name?: unknown }
    if (identity.type !== 'user' || typeof identity.id !== 'string' || identity.id.length === 0) return undefined
    return { accountLabel: typeof identity.name === 'string' ? identity.name : undefined }
  }
}
