import { describe, expect, it } from 'vitest'
import {
  dashboardRouteFromSearch,
  dashboardRouteQuery,
  DEFAULT_DASHBOARD_ROUTE,
  DEFAULT_PROVIDER_SECTION,
  DEFAULT_WIDGET_SECTION,
  sanitizeDashboardRoute
} from '../../src/shared/dashboard'

describe('dashboard route', () => {
  it('falls back to the dashboard page for unknown input', () => {
    expect(sanitizeDashboardRoute(undefined)).toEqual(DEFAULT_DASHBOARD_ROUTE)
    expect(sanitizeDashboardRoute('widget')).toEqual(DEFAULT_DASHBOARD_ROUTE)
    expect(sanitizeDashboardRoute({ page: 'settings' })).toEqual(DEFAULT_DASHBOARD_ROUTE)
  })

  it('drops sections from pages without a secondary sidebar', () => {
    expect(sanitizeDashboardRoute({ page: 'dashboard', section: 'usage' })).toEqual({ page: 'dashboard' })
    expect(sanitizeDashboardRoute({ page: 'general', section: 'behavior' })).toEqual({ page: 'general' })
  })

  it('always resolves a valid widget section', () => {
    expect(sanitizeDashboardRoute({ page: 'widget', section: 'usage' })).toEqual({ page: 'widget', section: 'usage' })
    expect(sanitizeDashboardRoute({ page: 'widget', section: 'general' })).toEqual({ page: 'widget', section: DEFAULT_WIDGET_SECTION })
    expect(sanitizeDashboardRoute({ page: 'widget' })).toEqual({ page: 'widget', section: DEFAULT_WIDGET_SECTION })
  })

  it('resolves a valid provider section and rejects invalid or missing ones', () => {
    expect(sanitizeDashboardRoute({ page: 'providers', section: 'deepseek' })).toEqual({ page: 'providers', section: 'deepseek' })
    expect(sanitizeDashboardRoute({ page: 'providers', section: 'nope' })).toEqual({ page: 'providers', section: DEFAULT_PROVIDER_SECTION })
    expect(sanitizeDashboardRoute({ page: 'providers' })).toEqual({ page: 'providers', section: DEFAULT_PROVIDER_SECTION })
    expect(sanitizeDashboardRoute({ page: 'providers', section: 'usage' })).toEqual({ page: 'providers', section: DEFAULT_PROVIDER_SECTION })
  })

  it('round-trips through the window query string', () => {
    const widgetRoute = { page: 'widget', section: 'behavior' } as const
    const widgetSearch = `?${new URLSearchParams(dashboardRouteQuery(widgetRoute)).toString()}`
    expect(dashboardRouteFromSearch(widgetSearch)).toEqual(widgetRoute)

    const providerRoute = { page: 'providers', section: 'deepseek' } as const
    const providerSearch = `?${new URLSearchParams(dashboardRouteQuery(providerRoute)).toString()}`
    expect(dashboardRouteFromSearch(providerSearch)).toEqual(providerRoute)

    expect(dashboardRouteFromSearch('')).toEqual(DEFAULT_DASHBOARD_ROUTE)
  })
})
