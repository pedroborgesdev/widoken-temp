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

const navItemClass = (active: boolean): string =>
  `settings-panel__navigation-item flex h-9 w-full cursor-pointer items-center gap-3 rounded-md border-0 bg-transparent px-3 text-left text-[13.5px] font-medium text-overlay-muted transition-[background-color,color] duration-[120ms] hover:bg-overlay-hover hover:text-overlay-text focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-overlay-blue max-[620px]:justify-center max-[620px]:px-0 max-[620px]:[&_span]:hidden [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:opacity-80 ${active ? 'bg-overlay-elevated text-overlay-strong hover:bg-overlay-elevated hover:text-overlay-strong [&_svg]:opacity-100' : ''}`

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
    <aside className="settings-panel settings-panel--window relative flex h-full w-full max-h-none flex-col overflow-hidden rounded-none border-0 bg-overlay-surface text-[13px] text-overlay-text shadow-none animate-none [&_button]:[-webkit-app-region:no-drag] [&_input]:[-webkit-app-region:no-drag] [&_select]:[-webkit-app-region:no-drag]" aria-label="Dashboard">
      <header className="settings-panel__header relative z-[4] flex h-[50px] min-h-[50px] flex-[0_0_50px] items-center justify-between border-b border-overlay-track bg-overlay-thumb pr-2.5 pl-4 [-webkit-app-region:drag]">
        <div className="flex items-center gap-2.5">
          <span className="settings-panel__mark grid size-6 shrink-0 place-items-center overflow-hidden rounded-full border-0 bg-transparent" aria-hidden="true">
            <img className="settings-panel__app-icon block size-6 object-contain" src={appIcon} alt="" />
          </span>
          <strong className="text-sm font-semibold text-overlay-strong">widoken</strong>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 text-lg leading-none text-overlay-muted transition-[background-color,color] duration-[120ms] hover:bg-overlay-hover hover:text-overlay-strong" type="button" onClick={onMinimize} aria-label="Minimize dashboard">−</button>
          <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 text-lg leading-none text-overlay-muted transition-[background-color,color] duration-[120ms] hover:bg-[color-mix(in_srgb,var(--color-overlay-danger)_22%,transparent)] hover:text-overlay-strong" type="button" onClick={onClose} aria-label="Close dashboard">×</button>
        </div>
      </header>

      <div className={`settings-panel__content grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${widgetOpen ? 'settings-panel__content--subnav-open grid-cols-[196px_208px_minmax(0,1fr)] max-[620px]:grid-cols-[64px_208px_minmax(0,1fr)]' : 'grid-cols-[196px_0px_minmax(0,1fr)] max-[620px]:grid-cols-[64px_0px_minmax(0,1fr)]'}`}>
        <nav className="settings-panel__sidebar flex min-h-0 flex-col border-r border-overlay-track bg-overlay-thumb px-2.5 py-4 max-[620px]:px-2" aria-label="Dashboard sections">
          <div className="grid gap-0.5">
            {pageItems.map((item) => {
              const active = route.page === item.id
              return (
                <button
                  key={item.id}
                  className={navItemClass(active)}
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
          className="settings-panel__subnav min-h-0 min-w-0 overflow-hidden"
          id="dashboard-widget-sections"
          aria-label="Widget settings"
          aria-hidden={!widgetOpen}
          inert={!widgetOpen}
        >
          <div className={`flex h-full w-[208px] flex-col border-r border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_45%,var(--color-overlay-surface))] px-2.5 py-4 transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${widgetOpen ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'}`}>
            <p className="m-0 mb-2.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-overlay-muted uppercase">Widget</p>
            <div className="grid gap-0.5">
              {widgetSectionItems.map((item) => {
                const active = widgetOpen && widgetSection === item.id
                return (
                  <button
                    key={item.id}
                    className={navItemClass(active)}
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
          className="settings-panel__workspace min-h-0 min-w-0 overflow-hidden p-6"
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
