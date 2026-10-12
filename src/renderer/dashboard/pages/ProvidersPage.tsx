import type { ProviderSettingsSection } from '@shared/dashboard'
import type { DeepSeekCredentialStatus } from '@shared/ipc'
import type { ProviderStatus, ProviderView } from '@shared/provider'
import type { AppSettings, CredentialSource, HuggingFaceBrowser, SettingsPatch } from '@shared/settings'
import { DeepSeekCredentialSettings } from '../../components/Settings/DeepSeekCredentialSettings'
import { HuggingFaceBrowserSettings } from '../../components/Settings/HuggingFaceBrowserSettings'
import { SettingsSection, SettingsToggle } from '../../components/Settings/SettingsControls'
import { providerLogos, providerName } from '../../utils/providerBranding'

const STATUS_LABELS: Record<ProviderStatus, string> = {
  loading: 'Loading',
  connected: 'Connected',
  disconnected: 'Signed out',
  unavailable: 'Unavailable',
  error: 'Error'
}

const STATUS_STYLES: Record<ProviderStatus, { dot: string; text: string; surface: string }> = {
  loading: { dot: 'bg-overlay-muted', text: 'text-overlay-muted', surface: 'bg-overlay-hover' },
  connected: { dot: 'bg-overlay-success', text: 'text-overlay-success', surface: 'bg-[color-mix(in_srgb,var(--color-overlay-success)_10%,transparent)]' },
  disconnected: { dot: 'bg-overlay-muted', text: 'text-overlay-muted', surface: 'bg-overlay-hover' },
  unavailable: { dot: 'bg-overlay-warning', text: 'text-overlay-warning', surface: 'bg-[color-mix(in_srgb,var(--color-overlay-warning)_10%,transparent)]' },
  error: { dot: 'bg-overlay-danger', text: 'text-overlay-danger', surface: 'bg-[color-mix(in_srgb,var(--color-overlay-danger)_10%,transparent)]' }
}

const PROVIDER_DESCRIPTIONS: Record<ProviderSettingsSection, string> = {
  claude: 'Widoken reads the Claude session that the local Claude Code CLI already stores. Sign-in is managed by the CLI, so there is nothing to configure here.',
  openai: 'Widoken reads the ChatGPT session that the local Codex CLI already stores. Sign-in is managed by the CLI, so there is nothing to configure here.',
  cursor: 'Widoken reads the Cursor session already signed in on this computer. Sign-in is managed by the Cursor app, so there is nothing to configure here.',
  antigravity: 'Widoken reads the Antigravity session already signed in on this computer. Sign-in is managed by the Antigravity app, so there is nothing to configure here.',
  copilot: 'Widoken reads the GitHub Copilot session already signed in on this computer. Sign-in is managed by GitHub Copilot, so there is nothing to configure here.',
  deepseek: 'Choose whether Widoken authenticates with the DeepSeek Harness account or a saved API key.',
  huggingface: 'Widoken reads balance and inference activity from a Hugging Face session already signed in through your browser.'
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
  const lastUpdatedAt = providerView?.snapshot.lastUpdatedAt
  const activity = providerView?.activity === 'active' ? 'Working now' : 'Idle'
  const statusStyle = STATUS_STYLES[status]
  const updated = lastUpdatedAt && new Date(lastUpdatedAt).getTime() > 0
    ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(lastUpdatedAt))
    : 'Not yet'
  if (!enabled) {
    return (
      <div className="rounded-lg border border-overlay-track bg-overlay-elevated/45 px-4 py-3.5" data-testid="provider-settings-status">
        <div className="flex items-center gap-2 text-[12.5px] text-overlay-muted">
          <span className="size-1.5 rounded-full bg-overlay-muted" aria-hidden="true" />
          <strong className="font-medium">Provider disabled</strong>
        </div>
        <p className="mt-1.5 mb-0 text-[12px] leading-[1.45] text-overlay-muted">
          Enable it above to connect and collect usage for the dashboard. Widget visibility is managed separately under Widget → Providers.
        </p>
      </div>
    )
  }
  return (
    <div className="grid gap-3" data-testid="provider-settings-status">
      <dl className="m-0 grid grid-cols-3 overflow-hidden rounded-lg border border-overlay-track bg-overlay-elevated/45 max-[720px]:grid-cols-1">
        <div className="grid gap-1 border-r border-overlay-track px-4 py-3 max-[720px]:border-r-0 max-[720px]:border-b">
          <dt className="text-[10.5px] font-semibold tracking-[0.07em] text-overlay-muted uppercase">Connection</dt>
          <dd className="m-0 flex items-center gap-2 text-[12.5px] font-medium">
            <span className={`size-1.5 rounded-full ${statusStyle.dot}`} aria-hidden="true" />
            <span className={statusStyle.text}>{STATUS_LABELS[status]}</span>
          </dd>
        </div>
        <div className="grid gap-1 border-r border-overlay-track px-4 py-3 max-[720px]:border-r-0 max-[720px]:border-b">
          <dt className="text-[10.5px] font-semibold tracking-[0.07em] text-overlay-muted uppercase">Activity</dt>
          <dd className="m-0 text-[12.5px] font-medium text-overlay-strong">{activity}</dd>
        </div>
        <div className="grid gap-1 px-4 py-3">
          <dt className="text-[10.5px] font-semibold tracking-[0.07em] text-overlay-muted uppercase">Last update</dt>
          <dd className="m-0 text-[12.5px] font-medium text-overlay-strong">{updated}</dd>
        </div>
      </dl>
      {plan && <p className="m-0 text-[12px] text-overlay-muted">Current plan: <strong className="font-medium text-overlay-strong">{plan}</strong></p>}
      {error && status !== 'connected' && (
        <div className={`flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[12px] leading-[1.45] ${statusStyle.surface} ${statusStyle.text}`}>
          <span className={`mt-[5px] size-1.5 shrink-0 rounded-full ${statusStyle.dot}`} aria-hidden="true" />
          <p className="m-0">{error}</p>
        </div>
      )}
    </div>
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

  const setProviderEnabled = (enabled: boolean): void => {
    onUpdate({
      providers: settings.providers.map((provider) =>
        provider.id === section
          ? { ...provider, enabled, visibleInWidget: enabled ? provider.visibleInWidget : false }
          : provider
      )
    })
  }

  const updateProviderCredentialSource = (id: string, credentialSource: CredentialSource): void => {
    onUpdate({
      providers: settings.providers.map((provider) =>
        provider.id === id ? { ...provider, credentialSource } : provider
      )
    })
  }

  const updateHuggingFaceBrowser = (browser: HuggingFaceBrowser): void => {
    onUpdate({
      providers: settings.providers.map((provider) =>
        provider.id === 'huggingface' ? { ...provider, huggingFaceBrowser: browser } : provider
      )
    })
  }

  const deepSeek = settings.providers.find((provider) => provider.id === 'deepseek')
  const huggingFace = settings.providers.find((provider) => provider.id === 'huggingface')
  const enabled = providerSetting?.enabled ?? false
  const hasConfiguration = section === 'deepseek' || section === 'huggingface'

  return (
    <SettingsSection title="Provider settings" description="Enable or disable collection and configure how Widoken connects to this provider.">
      <div className="grid max-w-[780px] gap-4 pb-2" data-testid="provider-settings-page" data-provider-id={section}>
        <section className="overflow-hidden rounded-xl border border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_48%,var(--color-overlay-surface))]">
          <div className="flex items-start gap-4 p-5 max-[620px]:p-4">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-overlay-track bg-overlay-elevated" aria-hidden="true">
              <img className="block size-8 object-contain" src={providerLogos[section]} alt="" draggable={false} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-[17px] font-semibold tracking-[-0.01em] text-overlay-strong">{name}</h2>
              <p className="mt-1 mb-0 max-w-[590px] text-[12.5px] leading-[1.5] text-overlay-muted">
                {PROVIDER_DESCRIPTIONS[section]}
              </p>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-overlay-track bg-overlay-elevated/55 px-3 py-2 text-[12px] font-medium text-overlay-text">
              <span>{enabled ? 'Enabled' : 'Disabled'}</span>
              <SettingsToggle
                checked={enabled}
                label={`${enabled ? 'Disable' : 'Enable'} ${name}`}
                onChange={setProviderEnabled}
              />
            </label>
          </div>
          <div className="border-t border-overlay-track p-4">
            <ProviderStatusSummary providerView={providerView} enabled={enabled} />
          </div>
        </section>

        {hasConfiguration && (
          <div className="grid gap-2">
            <div className="px-1">
              <h3 className="m-0 text-[13px] font-semibold text-overlay-strong">Configuration</h3>
              <p className="mt-0.5 mb-0 text-[11.5px] text-overlay-muted">Choose how Widoken connects to this provider.</p>
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
            {section === 'huggingface' && huggingFace && (
              <HuggingFaceBrowserSettings
                provider={huggingFace}
                onBrowserChange={updateHuggingFaceBrowser}
              />
            )}
          </div>
        )}

        {!hasConfiguration && (
          <section className="flex items-start gap-3 rounded-xl border border-overlay-track bg-overlay-elevated/35 p-4">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-overlay-success)_12%,transparent)] text-[13px] text-overlay-success" aria-hidden="true">✓</span>
            <div>
              <h3 className="m-0 text-[13px] font-medium text-overlay-strong">Managed automatically</h3>
              <p className="mt-1 mb-0 text-[12px] leading-[1.5] text-overlay-muted">
                There are no credentials to configure here. Widoken uses the existing local sign-in for {name}.
              </p>
            </div>
          </section>
        )}
      </div>
    </SettingsSection>
  )
}
