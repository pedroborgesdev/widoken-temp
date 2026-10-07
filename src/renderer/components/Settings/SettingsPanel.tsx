import { forwardRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faPalette, faPuzzlePiece, faSliders } from '@fortawesome/free-solid-svg-icons'
import type { AppSettings, DockSide, SettingsPatch } from '@shared/settings'
import { ProviderSettingsList } from './ProviderSettingsList'
import { SettingsCheckbox, SettingsRange, SettingsSection } from './SettingsControls'
import { SettingsSelect } from './SettingsSelect'
import appIcon from '../../../../resources/widoken.png'

interface SettingsPanelProps {
  settings: AppSettings
  side?: DockSide
  left?: number
  top?: number
  variant?: 'overlay' | 'window'
  onUpdate: (patch: SettingsPatch) => void
  onClose: () => void
  onMinimize: () => void
}

type SettingsPage = 'providers' | 'appearance' | 'behavior' | 'general'

const navigationItems = [
  { id: 'providers', label: 'Providers', icon: faPuzzlePiece },
  { id: 'appearance', label: 'Appearance', icon: faPalette },
  { id: 'behavior', label: 'Behavior', icon: faSliders },
  { id: 'general', label: 'General', icon: faGear }
] as const

export const SettingsPanel = forwardRef<HTMLDivElement, SettingsPanelProps>(function SettingsPanel(
  { settings, side = 'left', left, top, variant = 'overlay', onUpdate, onClose, onMinimize },
  ref
) {
  const [activePage, setActivePage] = useState<SettingsPage>('appearance')

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

  return (
    <aside
      ref={ref}
      className={`settings-panel settings-panel--${side} settings-panel--${variant}`}
      style={variant === 'overlay' ? { top, left } : undefined}
      aria-label="Settings"
    >
      <header className="settings-panel__header">
        <div className="settings-panel__brand">
          <span className="settings-panel__mark" aria-hidden="true">
            <img className="settings-panel__app-icon" src={appIcon} alt="" />
          </span>
          <strong>widoken</strong>
        </div>
        <div className="settings-panel__window-actions">
          <button className="settings-panel__minimize" type="button" onClick={onMinimize} aria-label="Minimize settings">−</button>
          <button className="settings-panel__close" type="button" onClick={onClose} aria-label="Close settings">×</button>
        </div>
      </header>

      <div className="settings-panel__content">
        <nav className="settings-panel__sidebar" aria-label="Settings sections">
          <div className="settings-panel__navigation">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className={`settings-panel__navigation-item${activePage === item.id ? ' settings-panel__navigation-item--active' : ''}`}
                type="button"
                aria-current={activePage === item.id ? 'page' : undefined}
                aria-controls={`settings-page-${item.id}`}
                onClick={() => setActivePage(item.id)}
              >
                <FontAwesomeIcon icon={item.icon} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="settings-panel__workspace" id={`settings-page-${activePage}`}>
          {activePage === 'providers' && (
            <ProviderSettingsList
              providers={settings.providers}
              onToggle={toggleProvider}
              onReorder={reorderProviders}
            />
          )}

          {activePage === 'appearance' && (
          <SettingsSection title="Appearance">
            <div className="settings-panel__grid">
              <SettingsSelect
                label="Theme"
                value={settings.widget.theme}
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
                onChange={(value) => onUpdate({ widget: { theme: value as AppSettings['widget']['theme'] } })}
              />
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
          )}

          {activePage === 'behavior' && (
            <SettingsSection title="Behavior">
              <div className="settings-panel__grid">
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
                <SettingsSelect
                  label="Refresh interval"
                  value={settings.refreshIntervalSeconds}
                  options={[{ value: 30, label: '30 seconds' }, { value: 45, label: '45 seconds' }, { value: 60, label: '1 minute' }, { value: 300, label: '5 minutes' }]}
                  onChange={(value) => onUpdate({ refreshIntervalSeconds: Number(value) })}
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
          )}

          {activePage === 'general' && (
            <SettingsSection title="General">
              <div className="settings-panel__grid">
                <SettingsCheckbox checked={settings.launchAtStartup} label="Launch at startup" onChange={(checked) => onUpdate({ launchAtStartup: checked })} />
                <SettingsCheckbox
                  checked={settings.analytics.localInsights}
                  label="Local analytics"
                  onChange={(localInsights) => onUpdate({ analytics: { localInsights } })}
                />
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </aside>
  )
})
