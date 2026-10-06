import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type { ProviderView } from '@shared/provider'
import { useProviders } from '../hooks/useProviders'
import { desktop } from '../services/desktop'
import { initialOverlayState, overlayReducer, type OverlayAction, type OverlayState } from './overlayReducer'

interface OverlayContextValue {
  state: OverlayState
  dispatch: Dispatch<OverlayAction>
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined)

export function OverlayProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, dispatch] = useReducer(overlayReducer, initialOverlayState)
  const updateProviders = useCallback((providers: ProviderView[]) => {
    dispatch({ type: 'providers-updated', providers })
  }, [])

  useProviders(updateProviders)

  useEffect(() => {
    let active = true
    void desktop.settings.get().then((settings) => {
      if (active) dispatch({ type: 'settings-loaded', settings })
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => desktop.settings.onUpdated((settings) => {
    dispatch({ type: 'settings-updated', settings })
  }), [])

  useEffect(() => desktop.settings.onWindowState((open) => {
    dispatch({ type: 'settings-window-changed', open })
  }), [])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}

export function useOverlay(): OverlayContextValue {
  const value = useContext(OverlayContext)
  if (!value) throw new Error('useOverlay must be used inside OverlayProvider')
  return value
}
