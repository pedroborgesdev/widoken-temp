import type { ProviderView } from '@shared/provider'
import { DEFAULT_SETTINGS, type AppSettings, type DockSide } from '@shared/settings'

export type OverlayMode = 'passive' | 'provider-hover' | 'dragging' | 'settings'

export interface DragState {
  left: number
  top: number
  side: DockSide
  candidateSide?: DockSide
}

export interface OverlayState {
  mode: OverlayMode
  settings: AppSettings
  settingsReady: boolean
  settingsWindowOpen: boolean
  providers: ProviderView[]
  hoveredProviderId?: string
  drag?: DragState
}

export type OverlayAction =
  | { type: 'settings-loaded'; settings: AppSettings }
  | { type: 'settings-updated'; settings: AppSettings }
  | { type: 'providers-updated'; providers: ProviderView[] }
  | { type: 'provider-hovered'; providerId: string }
  | { type: 'provider-left' }
  | { type: 'settings-opened' }
  | { type: 'settings-closed' }
  | { type: 'settings-window-changed'; open: boolean }
  | { type: 'drag-started'; drag: DragState }
  | { type: 'drag-moved'; drag: DragState }
  | { type: 'drag-ended'; settings: AppSettings }

export const initialOverlayState: OverlayState = {
  mode: 'passive',
  settings: DEFAULT_SETTINGS,
  settingsReady: false,
  settingsWindowOpen: false,
  providers: []
}

export function overlayReducer(state: OverlayState, action: OverlayAction): OverlayState {
  switch (action.type) {
    case 'settings-loaded':
      return { ...state, settings: action.settings, settingsReady: true }
    case 'settings-updated':
      return { ...state, settings: action.settings }
    case 'providers-updated':
      return { ...state, providers: action.providers }
    case 'provider-hovered':
      return { ...state, mode: 'provider-hover', hoveredProviderId: action.providerId }
    case 'provider-left':
      return state.mode === 'provider-hover'
        ? { ...state, mode: 'passive', hoveredProviderId: undefined }
        : state
    case 'settings-opened':
      return { ...state, mode: 'settings', hoveredProviderId: undefined }
    case 'settings-closed':
      return { ...state, mode: 'passive' }
    case 'settings-window-changed':
      return { ...state, settingsWindowOpen: action.open }
    case 'drag-started':
    case 'drag-moved':
      return { ...state, mode: 'dragging', hoveredProviderId: undefined, drag: action.drag }
    case 'drag-ended':
      return { ...state, mode: 'passive', settings: action.settings, drag: undefined }
  }
}
