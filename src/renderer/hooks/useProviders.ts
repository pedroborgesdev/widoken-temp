import { useEffect } from 'react'
import type { ProviderView } from '@shared/provider'
import { desktop } from '../services/desktop'

export function useProviders(onProviders: (providers: ProviderView[]) => void): void {
  useEffect(() => {
    let active = true
    void desktop.providers.list().then((providers) => {
      if (active) onProviders(providers)
    })
    const unsubscribe = desktop.providers.onUpdated((providers) => {
      if (active) onProviders(providers)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [onProviders])
}
