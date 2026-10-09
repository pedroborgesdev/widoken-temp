import type { ProviderSettingsSection } from '@shared/dashboard'
import type { DeepSeekCredentialStatus } from '@shared/ipc'
import type { ProviderStatus, ProviderView } from '@shared/provider'
import type { AppSettings, CredentialSource, SettingsPatch } from '@shared/settings'
import { DeepSeekCredentialSettings } from '../../components/Settings/DeepSeekCredentialSettings'
import { SettingsSection } from '../../components/Settings/SettingsControls'
import { providerLogos, providerName } from '../../utils/providerBranding'

const STATUS_LABELS: Record<ProviderStatus, string> = {
  loading: 'Loading',
  connected: 'Connected',
  disconnected: 'Signed out',
  unavailable: 'Unavailable',
  error: 'Error'
}

const STATUS_TONES: Record<ProviderStatus, string> = {
  loading: 'text-overlay-muted',
  connected: 'text-overlay-success',
  disconnected: 'text-overlay-muted',
  unavailable: 'text-overlay-muted',
  error: 'text-overlay-danger'
}

const PROVIDER_DESCRIPTIONS: Record<ProviderSettingsSection, string> = {
  claude: 'Widoken reads the Claude session that the local Claude Code CLI already stores. Sign-in is managed by the CLI, so there is nothing to configure here.',
  openai: 'Widoken reads the ChatGPT session that the local Codex CLI already stores. Sign-in is managed by the CLI, so there is nothing to configure here.',
  cursor: 'Widoken reads the Cursor session already signed in on this computer. Sign-in is managed by the Cursor app, so there is nothing to configure here.',
  antigravity: 'Widoken reads the Antigravity session already signed in on this computer. Sign-in is managed by the Antigravity app, so there is nothing to configure here.',
  copilot: 'Widoken reads the GitHub Copilot session already signed in on this computer. Sign-in is managed by GitHub Copilot, so there is nothing to configure here.',
  deepseek: 'Choose whether Widoken authenticates with the DeepSeek Harness account or a saved API key.'
}

interface ProvidersPageProps {
  section: ProviderSettingsSection
  settings: AppSettings
  providers: ProviderView[]
  deepSeekCredentials: DeepSeekCredentialStatus
  onUpdate: (patch: SettingsPatch) => void
  onSaveDeepSeekApiKey: (apiKey: string) => Promise<DeepSeekCredentialStatus>
  onClearDeepSeekApiKey: () => Promise<DeepSeekCredentialStatus>
}

function ProviderStatusSummary({ providerView, enabled }: { providerView?: ProviderView; enabled: boolean }): React.JSX.Element {
  const status = providerView?.snapshot.status ?? 'loading'
  const plan = providerView?.snapshot.plan
  const error = providerView?.snapshot.error
  if (!enabled) {
    return (
      <dl className="m-0 grid gap-1 text-[12.5px] text-overlay-text" data-testid="provider-settings-status">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-overlay-muted">Status</dt>
          <dd className="m-0 font-medium text-overlay-muted">Disabled in widget</dd>
        </div>
      </dl>
    )
  }
  return (
    <dl className="m-0 grid gap-1 text-[12.5px] text-overlay-text" data-testid="provider-settings-status">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-overlay-muted">Status</dt>
        <dd className={`m-0 font-medium ${STATUS_TONES[status]}`}>{STATUS_LABELS[status]}</dd>
      </div>
      {plan && (
        <div className="flex items-center justify-between gap-4">
          <dt className="text-overlay-muted">Plan</dt>
          <dd className="m-0 text-overlay-strong">{plan}</dd>
        </div>
      )}
      {error && status !== 'connected' && (
        <div className="flex items-start justify-between gap-4">
          <dt className="text-overlay-muted">Details</dt>
          <dd className="m-0 max-w-[60%] text-right text-overlay-muted">{error}</dd>
        </div>
      )}
    </dl>
  )
}

export function ProvidersPage({
  section,
  settings,
  providers,
  deepSeekCredentials,
  onUpdate,
  onSaveDeepSeekApiKey,
  onClearDeepSeekApiKey
}: ProvidersPageProps): React.JSX.Element {
  const name = providerName(section)
  const providerView = providers.find((provider) => provider.id === section)
  const providerSetting = settings.providers.find((provider) => provider.id === section)

  const updateProviderCredentialSource = (id: string, credentialSource: CredentialSource): void => {
    onUpdate({
      providers: settings.providers.map((provider) =>
        provider.id === id ? { ...provider, credentialSource } : provider
      )
    })
  }

  const deepSeek = settings.providers.find((provider) => provider.id === 'deepseek')

  return (
    <SettingsSection title={name} description={PROVIDER_DESCRIPTIONS[section]}>
      <div className="grid border-t border-overlay-track" data-testid="provider-settings-page" data-provider-id={section}>
        <div className="flex flex-wrap items-center gap-3 border-b border-overlay-track py-4">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-overlay-elevated" aria-hidden="true">
            <img className="block size-7 object-contain" src={providerLogos[section]} alt="" draggable={false} />
          </span>
          <strong className="text-sm font-medium text-overlay-strong">{name}</strong>
          <div className="ml-auto">
            <ProviderStatusSummary providerView={providerView} enabled={providerSetting?.enabled ?? false} />
          </div>
        </div>

        {section === 'deepseek' && deepSeek && (
          <DeepSeekCredentialSettings
            provider={deepSeek}
            providerView={providerView}
            status={deepSeekCredentials}
            onCredentialSourceChange={(source) => updateProviderCredentialSource('deepseek', source)}
            onSaveApiKey={async (apiKey) => { await onSaveDeepSeekApiKey(apiKey) }}
            onClearApiKey={async () => { await onClearDeepSeekApiKey() }}
          />
        )}
      </div>
    </SettingsSection>
  )
}
