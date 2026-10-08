import type { ProviderView } from '@shared/provider'
import { DEFAULT_SETTINGS, type AppSettings, type DockSide } from '@shared/settings'

export type WidgetMode = 'passive' | 'provider-hover' | 'dragging'

export interface DragState {
  left: number
  top: number
  side: DockSide
  candidateSide?: DockSide
}

export interface WidgetState {
  mode: WidgetMode
  settings: AppSettings
  settingsReady: boolean
  providersReady: boolean
  dashboardWindowOpen: boolean
  providers: ProviderView[]
  hoveredProviderId?: string
  drag?: DragState
}

export type WidgetAction =
  | { type: 'settings-loaded'; settings: AppSettings }
  | { type: 'settings-updated'; settings: AppSettings }
  | { type: 'providers-updated'; providers: ProviderView[] }
  | { type: 'provider-hovered'; providerId: string }
  | { type: 'provider-left' }
  | { type: 'dashboard-window-changed'; open: boolean }
  | { type: 'drag-started'; drag: DragState }
  | { type: 'drag-moved'; drag: DragState }
  | { type: 'drag-ended'; settings: AppSettings }

export const initialWidgetState: WidgetState = {
  mode: 'passive',
  settings: DEFAULT_SETTINGS,
  settingsReady: false,
  providersReady: false,
  dashboardWindowOpen: false,
  providers: []
}

export function widgetReducer(state: WidgetState, action: WidgetAction): WidgetState {
  switch (action.type) {
    case 'settings-loaded':
      return { ...state, settings: action.settings, settingsReady: true }
    case 'settings-updated':
      return { ...state, settings: action.settings }
    case 'providers-updated':
      return {
        ...state,
        providers: action.providers,
        providersReady: state.providersReady || action.providers.every(
          (provider) => provider.snapshot.status !== 'loading'
        )
      }
    case 'provider-hovered':
      return { ...state, mode: 'provider-hover', hoveredProviderId: action.providerId }
    case 'provider-left':
      return state.mode === 'provider-hover'
        ? { ...state, mode: 'passive', hoveredProviderId: undefined }
        : state
    case 'dashboard-window-changed':
      return { ...state, dashboardWindowOpen: action.open }
    case 'drag-started':
    case 'drag-moved':
      return { ...state, mode: 'dragging', hoveredProviderId: undefined, drag: action.drag }
    case 'drag-ended':
      return { ...state, mode: 'passive', settings: action.settings, drag: undefined }
  }
}
