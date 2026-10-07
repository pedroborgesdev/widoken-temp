import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleNotch,
  faGauge,
  faGear,
  faLayerGroup,
  faPalette,
  faPuzzlePiece,
  faSliders
} from '@fortawesome/free-solid-svg-icons'
import { DEFAULT_WIDGET_SECTION, type DashboardPage, type DashboardRoute, type WidgetSettingsSection } from '@shared/dashboard'
import type { ProviderView } from '@shared/provider'
import type { UsageHistory } from '@shared/usageHistory'
import type { AppSettings, SettingsPatch } from '@shared/settings'
import appIcon from '../../../resources/widoken.png'
import { GeneralPage } from './pages/GeneralPage'
import { OverviewPage } from './pages/OverviewPage'
import { WidgetSettingsPage } from './pages/WidgetSettingsPage'

const pageItems = [
  { id: 'dashboard', label: 'Dashboard', icon: faGauge },
  { id: 'widget', label: 'Widget', icon: faLayerGroup },
  { id: 'general', label: 'General', icon: faGear }
] as const satisfies ReadonlyArray<{ id: DashboardPage; label: string; icon: unknown }>

const widgetSectionItems = [
  { id: 'providers', label: 'Providers', icon: faPuzzlePiece },
  { id: 'usage', label: 'Usage ring', icon: faCircleNotch },
  { id: 'appearance', label: 'Appearance', icon: faPalette },
  { id: 'behavior', label: 'Behavior', icon: faSliders }
] as const satisfies ReadonlyArray<{ id: WidgetSettingsSection; label: string; icon: unknown }>

interface DashboardPanelProps {
  settings: AppSettings
  providers: ProviderView[]
  history: UsageHistory
  route: DashboardRoute
  onNavigate: (route: DashboardRoute) => void
  onUpdate: (patch: SettingsPatch) => void
  onSyncVsCodeTheme: () => Promise<string>
  onClose: () => void
  onMinimize: () => void
}

export function DashboardPanel({
  settings,
  providers,
  history,
  route,
  onNavigate,
  onUpdate,
  onSyncVsCodeTheme,
  onClose,
  onMinimize
}: DashboardPanelProps): React.JSX.Element {
  const [lastWidgetSection, setLastWidgetSection] = useState<WidgetSettingsSection>(route.section ?? DEFAULT_WIDGET_SECTION)
  const widgetOpen = route.page === 'widget'
  const widgetSection = widgetOpen ? route.section ?? lastWidgetSection : lastWidgetSection
  if (widgetSection !== lastWidgetSection) setLastWidgetSection(widgetSection)

  const openWidgetSection = (section: WidgetSettingsSection): void => onNavigate({ page: 'widget', section })

  return (
    <aside className="settings-panel settings-panel--window" aria-label="Dashboard">
      <header className="settings-panel__header">
        <div className="settings-panel__brand">
          <span className="settings-panel__mark" aria-hidden="true">
            <img className="settings-panel__app-icon" src={appIcon} alt="" />
          </span>
          <strong>widoken</strong>
        </div>
        <div className="settings-panel__window-actions">
          <button className="settings-panel__minimize" type="button" onClick={onMinimize} aria-label="Minimize dashboard">−</button>
          <button className="settings-panel__close" type="button" onClick={onClose} aria-label="Close dashboard">×</button>
        </div>
      </header>

      <div className={`settings-panel__content${widgetOpen ? ' settings-panel__content--subnav-open' : ''}`}>
        <nav className="settings-panel__sidebar" aria-label="Dashboard sections">
          <div className="settings-panel__navigation">
            {pageItems.map((item) => {
              const active = route.page === item.id
              return (
                <button
                  key={item.id}
                  className={`settings-panel__navigation-item${active ? ' settings-panel__navigation-item--active' : ''}`}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  aria-expanded={item.id === 'widget' ? widgetOpen : undefined}
                  aria-controls={item.id === 'widget' ? 'dashboard-widget-sections' : `dashboard-page-${item.id}`}
                  onClick={() => item.id === 'widget' ? openWidgetSection(widgetSection) : onNavigate({ page: item.id })}
                >
                  <FontAwesomeIcon icon={item.icon} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <nav
          className="settings-panel__subnav"
          id="dashboard-widget-sections"
          aria-label="Widget settings"
          aria-hidden={!widgetOpen}
          inert={!widgetOpen}
        >
          <div className="settings-panel__subnav-inner">
            <p className="settings-panel__subnav-title">Widget</p>
            <div className="settings-panel__navigation">
              {widgetSectionItems.map((item) => {
                const active = widgetOpen && widgetSection === item.id
                return (
                  <button
                    key={item.id}
                    className={`settings-panel__navigation-item${active ? ' settings-panel__navigation-item--active' : ''}`}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    aria-controls={`dashboard-page-widget-${item.id}`}
                    onClick={() => openWidgetSection(item.id)}
                  >
                    <FontAwesomeIcon icon={item.icon} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

        <div
          className="settings-panel__workspace"
          id={widgetOpen ? `dashboard-page-widget-${widgetSection}` : `dashboard-page-${route.page}`}
        >
          {widgetOpen ? (
            <WidgetSettingsPage
              section={widgetSection}
              settings={settings}
              providers={providers}
              onUpdate={onUpdate}
              onSyncVsCodeTheme={onSyncVsCodeTheme}
            />
          ) : route.page === 'general' ? (
            <GeneralPage settings={settings} onUpdate={onUpdate} />
          ) : (
            <OverviewPage
              settings={settings}
              providers={providers}
              history={history}
              onChooseProviders={() => openWidgetSection('providers')}
            />
          )}
        </div>
      </div>
    </aside>
  )
}
