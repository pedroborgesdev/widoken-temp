import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons'
import type { WidgetSettingsSection } from '@shared/dashboard'
import type { ProviderView } from '@shared/provider'
import type { AppSettings, DockSide, ProviderUsageDisplay, SettingsPatch } from '@shared/settings'
import { ProviderSettingsList } from '../../components/Settings/ProviderSettingsList'
import { SettingsCheckbox, SettingsRange, SettingsSection } from '../../components/Settings/SettingsControls'
import { SettingsSelect } from '../../components/Settings/SettingsSelect'
import { UsageRingSettings } from '../../components/Settings/UsageRingSettings'

interface WidgetSettingsPageProps {
  section: WidgetSettingsSection
  settings: AppSettings
  providers: ProviderView[]
  onUpdate: (patch: SettingsPatch) => void
  onSyncVsCodeTheme: () => Promise<string>
}

export function WidgetSettingsPage({
  section,
  settings,
  providers,
  onUpdate,
  onSyncVsCodeTheme
}: WidgetSettingsPageProps): React.JSX.Element {
  const [themeSyncing, setThemeSyncing] = useState(false)
  const [themeSyncMessage, setThemeSyncMessage] = useState<string>()

  const syncVsCodeTheme = async (): Promise<void> => {
    setThemeSyncing(true)
    setThemeSyncMessage(undefined)
    try {
      const name = await onSyncVsCodeTheme()
      setThemeSyncMessage(`Synced: ${name}`)
    } catch (error) {
      setThemeSyncMessage(error instanceof Error ? error.message : 'Could not sync the VS Code theme.')
    } finally {
      setThemeSyncing(false)
    }
  }

  const toggleProvider = (id: string): void => {
    onUpdate({
      providers: settings.providers.map((provider) =>
        provider.id === id ? { ...provider, enabled: !provider.enabled } : provider
      )
    })
  }

  const reorderProviders = (providerIds: string[]): void => {
    const providerMap = new Map(settings.providers.map((provider) => [provider.id, provider]))
    onUpdate({
      providers: providerIds.flatMap((id, order) => {
        const provider = providerMap.get(id)
        return provider ? [{ ...provider, order }] : []
      })
    })
  }

  const updateProviderUsageDisplay = (id: string, patch: Partial<ProviderUsageDisplay>): void => {
    onUpdate({
      providers: settings.providers.map((provider) =>
        provider.id === id
          ? { ...provider, usageDisplay: { ...provider.usageDisplay, ...patch } }
          : provider
      )
    })
  }

  if (section === 'providers') {
    return <ProviderSettingsList providers={settings.providers} onToggle={toggleProvider} onReorder={reorderProviders} />
  }

  if (section === 'usage') {
    return (
      <UsageRingSettings
        providers={settings.providers}
        providerViews={providers}
        onChange={updateProviderUsageDisplay}
      />
    )
  }

  if (section === 'appearance') {
    return (
      <SettingsSection title="Appearance">
        <div className="settings-panel__grid">
          <SettingsSelect
            label="Theme"
            value={settings.widget.themeMode === 'preset' ? settings.widget.theme : ''}
            placeholder="Select theme"
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'slate', label: 'Slate' },
              { value: 'dracula', label: 'Dracula' },
              { value: 'nord', label: 'Nord' },
              { value: 'catppuccin', label: 'Catppuccin Mocha' },
              { value: 'tokyo-night', label: 'Tokyo Night' },
              { value: 'gruvbox', label: 'Gruvbox' },
              { value: 'one-dark', label: 'One Dark' },
              { value: 'solarized-dark', label: 'Solarized Dark' },
              { value: 'monokai', label: 'Monokai' },
              { value: 'dark-pastel', label: 'Dark Pastel' }
            ]}
            onChange={(value) => onUpdate({
              widget: {
                theme: value as AppSettings['widget']['theme'],
                themeMode: 'preset'
              }
            })}
          />
          <div className="settings-theme-sync">
            <div>
              <span>VS Code theme</span>
              <small className={themeSyncMessage && !themeSyncMessage.startsWith('Synced:') ? 'settings-theme-sync__error' : undefined}>
                {themeSyncMessage
                  ?? (settings.widget.themeMode === 'vscode' && settings.widget.vscodeTheme
                    ? `Synced: ${settings.widget.vscodeTheme.name}`
                    : 'Use the colors from your active VS Code theme.')}
              </small>
            </div>
            <button
              className="settings-action-button"
              type="button"
              disabled={themeSyncing}
              onClick={() => void syncVsCodeTheme()}
            >
              <FontAwesomeIcon icon={faArrowsRotate} aria-hidden="true" />
              <span>{themeSyncing ? 'Syncing…' : 'Sync with VS Code'}</span>
            </button>
          </div>
          <SettingsSelect
            label="Widget layout"
            value={settings.widget.orientation}
            options={[{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }]}
            onChange={(value) => onUpdate({ widget: { orientation: value as AppSettings['widget']['orientation'] } })}
          />
          <SettingsSelect
            label="Unavailable provider"
            value={settings.widget.unavailableStyle}
            options={[{ value: 'dim', label: 'Dim icon' }, { value: 'normal', label: 'Normal icon' }]}
            onChange={(value) => onUpdate({ widget: { unavailableStyle: value as AppSettings['widget']['unavailableStyle'] } })}
          />
          <SettingsCheckbox checked={settings.widget.shadows} label="Enable shadows" onChange={(shadows) => onUpdate({ widget: { shadows } })} />
          <SettingsRange
            label="Shadow opacity"
            value={settings.widget.shadowOpacity}
            minimum={0}
            maximum={100}
            suffix="%"
            onChange={(shadowOpacity) => onUpdate({ widget: { shadowOpacity } })}
          />
          <SettingsRange
            label="Widget item gap"
            value={settings.widget.itemGap}
            minimum={0}
            maximum={18}
            suffix=" px"
            onChange={(itemGap) => onUpdate({ widget: { itemGap } })}
          />
          <SettingsRange
            label="Widget scale"
            value={settings.widget.scale}
            minimum={70}
            maximum={150}
            suffix="%"
            onChange={(scale) => onUpdate({ widget: { scale } })}
          />
        </div>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection title="Behavior">
      <div className="settings-panel__grid">
        <SettingsCheckbox
          checked={settings.widget.enabled}
          label="Widget enabled"
          onChange={(enabled) => onUpdate({ widget: { enabled } })}
        />
        <SettingsSelect
          label="Dock side"
          value={settings.widget.side}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' }
          ]}
          onChange={(value) => {
            const side = value as DockSide
            onUpdate({
              widget: {
                docked: true,
                horizontalPosition: side === 'left' ? 0 : side === 'right' ? 1 : settings.widget.horizontalPosition,
                verticalPosition: side === 'top' ? 0 : side === 'bottom' ? 1 : settings.widget.verticalPosition,
                side
              }
            })
          }}
        />
        <SettingsCheckbox
          checked={settings.widget.showDockGuides}
          label="Docking guides"
          onChange={(showDockGuides) => onUpdate({
            widget: {
              showDockGuides,
              ...(!showDockGuides ? { docked: false } : {})
            }
          })}
        />
        <SettingsCheckbox
          checked={settings.widget.edgeTuck}
          label="Tuck into screen edge"
          onChange={(edgeTuck) => onUpdate({ widget: { edgeTuck } })}
        />
      </div>
    </SettingsSection>
  )
}
