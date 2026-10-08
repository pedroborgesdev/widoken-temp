import type { ProviderView, UsageLimit } from '@shared/provider'
import { displayedUsageLimits, PROVIDER_USAGE_LIMITS, type UsageLimitOption } from '@shared/providerUsage'
import type { ProviderSetting, ProviderUsageDisplay } from '@shared/settings'
import { providerLogos, providerName } from '../../utils/providerBranding'
import { UsageRing } from '../Widget/UsageRing'
import { SettingsSection, SettingsToggle } from './SettingsControls'
import { SettingsSelect } from './SettingsSelect'

const PREVIEW_PERCENTS = [64, 32, 48, 20]

interface UsageRingSettingsProps {
  providers: ProviderSetting[]
  providerViews: ProviderView[]
  onChange: (id: string, patch: Partial<ProviderUsageDisplay>) => void
}

function previewLimits(options: UsageLimitOption[], view?: ProviderView): UsageLimit[] {
  if (view?.snapshot.status === 'connected' && view.snapshot.limits.some((limit) => !limit.unlimited)) {
    return view.snapshot.limits
  }
  return options.map((option, index) => ({
    id: option.id,
    label: option.label,
    percent: PREVIEW_PERCENTS[index % PREVIEW_PERCENTS.length]
  }))
}

function UsageRingPreview({
  provider,
  options,
  view
}: {
  provider: ProviderSetting
  options: UsageLimitOption[]
  view?: ProviderView
}): React.JSX.Element {
  const usages = displayedUsageLimits(provider.id, previewLimits(options, view), provider.usageDisplay)
  return (
    <span className="relative grid size-[42px] shrink-0 place-items-center" aria-hidden="true">
      <UsageRing usages={usages} status="connected" />
      <span className="provider-item__icon-shell">
        <img
          className={`provider-item__logo provider-item__logo--${provider.id}`}
          src={providerLogos[provider.id]}
          alt=""
          draggable={false}
        />
      </span>
    </span>
  )
}

function optionLabel(options: UsageLimitOption[], id?: string): string | undefined {
  return options.find((option) => option.id === id)?.label
}

export function UsageRingSettings({ providers, providerViews, onChange }: UsageRingSettingsProps): React.JSX.Element {
  const configurable = [...providers]
    .sort((a, b) => a.order - b.order)
    .filter((provider) => (PROVIDER_USAGE_LIMITS[provider.id] ?? []).length > 0)

  return (
    <SettingsSection
      title="Usage ring"
      description="Choose which limits each provider shows around its icon. A split ring shows one limit on each half."
    >
      <div className="grid gap-2.5">
        {configurable.map((provider) => {
          const name = providerName(provider.id)
          const options = PROVIDER_USAGE_LIMITS[provider.id] ?? []
          const canSplit = options.length > 1
          const split = canSplit && provider.usageDisplay.split
          const primaryId = provider.usageDisplay.primaryLimitId ?? options[0]?.id
          const secondaryId = provider.usageDisplay.secondaryLimitId ?? options.find((option) => option.id !== primaryId)?.id
          const summary = split
            ? `${optionLabel(options, primaryId)} · ${optionLabel(options, secondaryId)}`
            : optionLabel(options, primaryId)
          const selectOptions = options.map((option) => ({ value: option.id, label: option.label }))
          const selectPrimary = (primaryLimitId: string): void => onChange(provider.id, split && primaryLimitId === secondaryId
            ? { primaryLimitId, secondaryLimitId: primaryId }
            : { primaryLimitId })
          const selectSecondary = (secondaryLimitId: string): void => onChange(provider.id, secondaryLimitId === primaryId
            ? { primaryLimitId: secondaryId, secondaryLimitId }
            : { secondaryLimitId })

          return (
            <div className="grid gap-3 rounded-[10px] border border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_55%,var(--color-overlay-surface))] px-4 py-3.5" key={provider.id} data-provider-id={provider.id}>
              <div className="flex items-center gap-3.5">
                <UsageRingPreview
                  provider={provider}
                  options={options}
                  view={providerViews.find((view) => view.id === provider.id)}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong className="truncate text-sm font-medium text-overlay-strong">{name}</strong>
                  <span className="text-[12.5px] text-overlay-muted">{summary}</span>
                </span>
                {canSplit && (
                  <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-overlay-muted">
                    <span>Split ring</span>
                    <SettingsToggle
                      checked={split}
                      label={`Split ${name} usage ring`}
                      onChange={(next) => onChange(provider.id, { split: next })}
                    />
                  </label>
                )}
              </div>
              <div className={`grid gap-3 pl-14 ${split ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <SettingsSelect
                  stacked
                  label={split ? 'Left side' : 'Usage ring'}
                  value={primaryId ?? ''}
                  options={selectOptions}
                  onChange={selectPrimary}
                />
                {split && (
                  <SettingsSelect
                    stacked
                    label="Right side"
                    value={secondaryId ?? ''}
                    options={selectOptions}
                    onChange={selectSecondary}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </SettingsSection>
  )
}
