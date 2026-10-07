import { describe, expect, it } from 'vitest'
import {
  dashboardRouteFromSearch,
  dashboardRouteQuery,
  DEFAULT_DASHBOARD_ROUTE,
  DEFAULT_WIDGET_SECTION,
  sanitizeDashboardRoute
} from '../../src/shared/dashboard'

describe('dashboard route', () => {
  it('falls back to the dashboard page for unknown input', () => {
    expect(sanitizeDashboardRoute(undefined)).toEqual(DEFAULT_DASHBOARD_ROUTE)
    expect(sanitizeDashboardRoute('widget')).toEqual(DEFAULT_DASHBOARD_ROUTE)
    expect(sanitizeDashboardRoute({ page: 'settings' })).toEqual(DEFAULT_DASHBOARD_ROUTE)
  })

  it('drops sections from the dashboard page', () => {
    expect(sanitizeDashboardRoute({ page: 'dashboard', section: 'usage' })).toEqual({ page: 'dashboard' })
  })

  it('always resolves a valid widget section', () => {
    expect(sanitizeDashboardRoute({ page: 'widget', section: 'usage' })).toEqual({ page: 'widget', section: 'usage' })
    expect(sanitizeDashboardRoute({ page: 'widget', section: 'general' })).toEqual({ page: 'widget', section: DEFAULT_WIDGET_SECTION })
    expect(sanitizeDashboardRoute({ page: 'widget' })).toEqual({ page: 'widget', section: DEFAULT_WIDGET_SECTION })
  })

  it('round-trips through the window query string', () => {
    const route = { page: 'widget', section: 'behavior' } as const
    const search = `?${new URLSearchParams(dashboardRouteQuery(route)).toString()}`
    expect(dashboardRouteFromSearch(search)).toEqual(route)
    expect(dashboardRouteFromSearch('')).toEqual(DEFAULT_DASHBOARD_ROUTE)
  })
})
