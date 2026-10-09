import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleNotch,
  faGear,
  faKey,
  faLayerGroup,
  faPalette,
  faPuzzlePiece,
  faSliders,
  faTableCellsLarge
} from '@fortawesome/free-solid-svg-icons'
import {
  DEFAULT_PROVIDER_SECTION,
  DEFAULT_WIDGET_SECTION,
  PROVIDER_SETTINGS_SECTIONS,
  type DashboardPage,
  type DashboardRoute,
  type ProviderSettingsSection,
  type WidgetSettingsSection
} from '@shared/dashboard'
import type { DeepSeekCredentialStatus } from '@shared/ipc'
import type { ProviderView } from '@shared/provider'
import type { UsageHistory } from '@shared/usageHistory'
import type { AppSettings, SettingsPatch } from '@shared/settings'
import appIcon from '../../../resources/widoken.png'
import { providerLogos, providerName } from '../utils/providerBranding'
import { GeneralPage } from './pages/GeneralPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProvidersPage } from './pages/ProvidersPage'
import { WidgetSettingsPage } from './pages/WidgetSettingsPage'

const pageItems = [
  { id: 'dashboard', label: 'Dashboard', icon: faTableCellsLarge },
  { id: 'widget', label: 'Widget', icon: faLayerGroup },
  { id: 'providers', label: 'Providers', icon: faKey },
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

function isWidgetSection(value: unknown): value is WidgetSettingsSection {
  return typeof value === 'string' && (widgetSectionItems as ReadonlyArray<{ id: string }>).some((item) => item.id === value)
}

function isProviderSection(value: unknown): value is ProviderSettingsSection {
  return typeof value === 'string' && (PROVIDER_SETTINGS_SECTIONS as readonly string[]).includes(value)
}

interface DashboardPanelProps {
  settings: AppSettings
  providers: ProviderView[]
  history: UsageHistory
  deepSeekCredentials: DeepSeekCredentialStatus
  route: DashboardRoute
  onNavigate: (route: DashboardRoute) => void
  onUpdate: (patch: SettingsPatch) => void
  onSaveDeepSeekApiKey: (apiKey: string) => Promise<DeepSeekCredentialStatus>
  onClearDeepSeekApiKey: () => Promise<DeepSeekCredentialStatus>
  onSyncVsCodeTheme: () => Promise<string>
  onClose: () => void
  onMinimize: () => void
}

export function DashboardPanel({
  settings,
  providers,
  history,
  deepSeekCredentials,
  route,
  onNavigate,
  onUpdate,
  onSaveDeepSeekApiKey,
  onClearDeepSeekApiKey,
  onSyncVsCodeTheme,
  onClose,
  onMinimize
}: DashboardPanelProps): React.JSX.Element {
  const [lastWidgetSection, setLastWidgetSection] = useState<WidgetSettingsSection>(
    route.page === 'widget' && isWidgetSection(route.section) ? route.section : DEFAULT_WIDGET_SECTION
  )
  const [lastProviderSection, setLastProviderSection] = useState<ProviderSettingsSection>(
    route.page === 'providers' && isProviderSection(route.section) ? route.section : DEFAULT_PROVIDER_SECTION
  )

  const widgetOpen = route.page === 'widget'
  const providersOpen = route.page === 'providers'

  const widgetSection = widgetOpen && isWidgetSection(route.section) ? route.section : lastWidgetSection
  if (widgetSection !== lastWidgetSection) setLastWidgetSection(widgetSection)
  const providerSection = providersOpen && isProviderSection(route.section) ? route.section : lastProviderSection
  if (providerSection !== lastProviderSection) setLastProviderSection(providerSection)

  const openWidgetSection = (section: WidgetSettingsSection): void => onNavigate({ page: 'widget', section })
  const openProviderSection = (section: ProviderSettingsSection): void => onNavigate({ page: 'providers', section })

  const secondaryOpen = widgetOpen || providersOpen
  const providerItems = [...settings.providers]
    .sort((a, b) => a.order - b.order)
    .flatMap((provider) => (isProviderSection(provider.id) ? [provider.id] : []))

  const workspaceId = widgetOpen
    ? `dashboard-page-widget-${widgetSection}`
    : providersOpen
      ? `dashboard-page-providers-${providerSection}`
      : `dashboard-page-${route.page}`

  return (
    <aside className="settings-panel settings-panel--window relative flex h-full w-full max-h-none flex-col overflow-hidden rounded-none border-0 bg-overlay-surface text-[13px] text-overlay-text shadow-none animate-none [&_button]:[-webkit-app-region:no-drag] [&_input]:[-webkit-app-region:no-drag] [&_select]:[-webkit-app-region:no-drag]" aria-label="Dashboard">
      <header className="settings-panel__header relative z-[4] flex h-[50px] min-h-[50px] flex-[0_0_50px] items-center justify-between border-b border-overlay-track bg-overlay-thumb pr-2.5 pl-4 [-webkit-app-region:drag]">
        <div className="flex items-center gap-2.5">
          <span className="settings-panel__mark grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border-0 bg-transparent" aria-hidden="true">
            <img className="settings-panel__app-icon block size-8 object-contain" src={appIcon} alt="" />
          </span>
          <strong className="text-sm font-semibold text-overlay-strong">Widoken</strong>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 text-lg leading-none text-overlay-muted transition-[background-color,color] duration-[120ms] hover:bg-overlay-hover hover:text-overlay-strong" type="button" onClick={onMinimize} aria-label="Minimize dashboard">−</button>
          <button className="grid size-8 cursor-pointer place-items-center rounded-md border-0 text-lg leading-none text-overlay-muted transition-[background-color,color] duration-[120ms] hover:bg-[color-mix(in_srgb,var(--color-overlay-danger)_22%,transparent)] hover:text-overlay-strong" type="button" onClick={onClose} aria-label="Close dashboard">×</button>
        </div>
      </header>

      <div className={`settings-panel__content grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${secondaryOpen ? 'settings-panel__content--subnav-open grid-cols-[196px_208px_minmax(0,1fr)] max-[620px]:grid-cols-[64px_208px_minmax(0,1fr)]' : 'grid-cols-[196px_0px_minmax(0,1fr)] max-[620px]:grid-cols-[64px_0px_minmax(0,1fr)]'}`}>
        <nav className="settings-panel__sidebar flex min-h-0 flex-col border-r border-overlay-track bg-overlay-thumb px-2.5 py-4 max-[620px]:px-2" aria-label="Dashboard sections">
          <div className="grid gap-0.5">
            {pageItems.map((item) => {
              const active = route.page === item.id
              const expanded = item.id === 'widget' ? widgetOpen : item.id === 'providers' ? providersOpen : undefined
              const controls = item.id === 'widget' || item.id === 'providers'
                ? 'dashboard-secondary-sections'
                : `dashboard-page-${item.id}`
              return (
                <button
                  key={item.id}
                  className={navItemClass(active)}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  aria-expanded={expanded}
                  aria-controls={controls}
                  onClick={() => {
                    if (item.id === 'widget') openWidgetSection(widgetSection)
                    else if (item.id === 'providers') openProviderSection(providerSection)
                    else onNavigate({ page: item.id })
                  }}
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
          id="dashboard-secondary-sections"
          aria-label={providersOpen ? 'Provider settings' : 'Widget settings'}
          aria-hidden={!secondaryOpen}
          inert={!secondaryOpen}
        >
          <div className={`flex h-full w-[208px] flex-col border-r border-overlay-track bg-[color-mix(in_srgb,var(--color-overlay-thumb)_45%,var(--color-overlay-surface))] px-2.5 py-4 transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${secondaryOpen ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'}`}>
            {providersOpen ? (
              <>
                <p className="m-0 mb-2.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-overlay-muted uppercase">Providers</p>
                <div className="grid gap-0.5">
                  {providerItems.map((id) => {
                    const active = providerSection === id
                    return (
                      <button
                        key={id}
                        className={navItemClass(active)}
                        type="button"
                        data-provider-id={id}
                        aria-current={active ? 'page' : undefined}
                        aria-controls={`dashboard-page-providers-${id}`}
                        onClick={() => openProviderSection(id)}
                      >
                        <img className="size-4 shrink-0 object-contain" src={providerLogos[id]} alt="" draggable={false} />
                        <span>{providerName(id)}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </nav>

        <div
          className="settings-panel__workspace min-h-0 min-w-0 overflow-hidden p-6"
          id={workspaceId}
        >
          {widgetOpen ? (
            <WidgetSettingsPage
              section={widgetSection}
              settings={settings}
              providers={providers}
              onUpdate={onUpdate}
              onSyncVsCodeTheme={onSyncVsCodeTheme}
            />
          ) : providersOpen ? (
            <ProvidersPage
              section={providerSection}
              settings={settings}
              providers={providers}
              deepSeekCredentials={deepSeekCredentials}
              onUpdate={onUpdate}
              onSaveDeepSeekApiKey={onSaveDeepSeekApiKey}
              onClearDeepSeekApiKey={onClearDeepSeekApiKey}
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
