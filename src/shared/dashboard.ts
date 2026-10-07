export const DASHBOARD_PAGES = ['dashboard', 'widget', 'general'] as const
export type DashboardPage = (typeof DASHBOARD_PAGES)[number]

export const WIDGET_SETTINGS_SECTIONS = ['providers', 'usage', 'appearance', 'behavior'] as const
export type WidgetSettingsSection = (typeof WIDGET_SETTINGS_SECTIONS)[number]

export interface DashboardRoute {
  page: DashboardPage
  section?: WidgetSettingsSection
}

export const DEFAULT_DASHBOARD_ROUTE: DashboardRoute = { page: 'dashboard' }
export const DEFAULT_WIDGET_SECTION: WidgetSettingsSection = 'appearance'

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
}

export function sanitizeDashboardRoute(value: unknown): DashboardRoute {
  if (!value || typeof value !== 'object') return DEFAULT_DASHBOARD_ROUTE
  const { page, section } = value as Partial<Record<keyof DashboardRoute, unknown>>
  if (!isOneOf(DASHBOARD_PAGES, page)) return DEFAULT_DASHBOARD_ROUTE
  if (page !== 'widget') return { page }
  return { page, section: isOneOf(WIDGET_SETTINGS_SECTIONS, section) ? section : DEFAULT_WIDGET_SECTION }
}

export function dashboardRouteQuery(route: DashboardRoute): Record<string, string> {
  return route.section ? { page: route.page, section: route.section } : { page: route.page }
}

export function dashboardRouteFromSearch(search: string): DashboardRoute {
  const params = new URLSearchParams(search)
  return sanitizeDashboardRoute({ page: params.get('page'), section: params.get('section') ?? undefined })
}
