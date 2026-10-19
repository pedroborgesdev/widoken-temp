import { BrowserWindow, session, WebContentsView, type Session } from 'electron'
import { join } from 'node:path'
import {
  BROWSER_SESSION_TITLEBAR_HEIGHT,
  browserSessionWelcomeQuery,
  browserSessionWindowChrome,
  type BrowserSessionAppearance
} from '@shared/browserSession'
import { IPC, type BrowserSessionConnectedStatus, type BrowserSessionStatus } from '@shared/ipc'
import { appIconPath } from '../window/appIcon'

export interface ProviderBrowserSessionClient {
  fetch(url: string, init?: RequestInit): Promise<Response>
}

export interface BrowserSessionIdentity {
  accountLabel?: string
}

export interface ProviderBrowserSessionDefinition {
  providerId: string
  displayName: string
  loginUrl: string
  allowedNavigationOrigins: readonly string[]
  allowedRequestOrigins: readonly string[]
  welcome: {
    reason: string
    collectedData: readonly string[]
  }
  verify(client: ProviderBrowserSessionClient): Promise<BrowserSessionIdentity | undefined>
}

export interface ProviderBrowserSessionManagerOptions {
  getWelcomeAppearance?(): BrowserSessionAppearance | Promise<BrowserSessionAppearance>
}

interface OpenLoginWindow {
  window: BrowserWindow
  result: Promise<BrowserSessionStatus>
}

const REQUEST_TIMEOUT_MS = 20_000
const CONNECTED_WINDOW_AUTO_CLOSE_MS = 15_000

function parseHttpsOrigin(value: string): string | undefined {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.origin : undefined
  } catch {
    return undefined
  }
}

function partitionName(providerId: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(providerId)) {
    throw new Error(`Invalid browser-session provider id: ${providerId}`)
  }
  return `persist:widoken-provider-${providerId}`
}

export class ProviderBrowserSessionManager {
  private readonly definitions: Map<string, ProviderBrowserSessionDefinition>
  private readonly sessions = new Map<string, Session>()
  private readonly loginWindows = new Map<string, OpenLoginWindow>()

  constructor(
    definitions: readonly ProviderBrowserSessionDefinition[],
    private readonly options: ProviderBrowserSessionManagerOptions = {}
  ) {
    this.definitions = new Map()
    for (const definition of definitions) {
      partitionName(definition.providerId)
      if (this.definitions.has(definition.providerId)) {
        throw new Error(`Duplicate browser-session provider: ${definition.providerId}`)
      }
      if (!parseHttpsOrigin(definition.loginUrl)) {
        throw new Error(`Browser-session login URL must use HTTPS: ${definition.providerId}`)
      }
      for (const origin of [...definition.allowedNavigationOrigins, ...definition.allowedRequestOrigins]) {
        if (parseHttpsOrigin(origin) !== origin) {
          throw new Error(`Browser-session allowlists must contain canonical HTTPS origins: ${definition.providerId}`)
        }
      }
      if (!definition.allowedNavigationOrigins.includes(new URL(definition.loginUrl).origin)) {
        throw new Error(`Browser-session login origin is not allowed: ${definition.providerId}`)
      }
      this.definitions.set(definition.providerId, definition)
    }
  }

  client(providerId: string): ProviderBrowserSessionClient {
    const definition = this.definition(providerId)
    return {
      fetch: async (url, init) => {
        const origin = parseHttpsOrigin(url)
        if (!origin || !definition.allowedRequestOrigins.includes(origin)) {
          throw new Error(`Blocked browser-session request for ${providerId}.`)
        }
        const controller = new AbortController()
        const sourceSignal = init?.signal
        const abort = (): void => controller.abort()
        if (sourceSignal?.aborted) abort()
        else sourceSignal?.addEventListener('abort', abort, { once: true })
        let timedOut = false
        const timer = setTimeout(() => {
          timedOut = true
          controller.abort()
        }, REQUEST_TIMEOUT_MS)
        try {
          return await this.providerSession(providerId).fetch(url, {
            ...init,
            credentials: 'include',
            redirect: 'error',
            signal: controller.signal
          })
        } catch (error) {
          if (timedOut) throw new Error(`${definition.displayName} browser-session request timed out.`)
          throw error
        } finally {
          clearTimeout(timer)
          sourceSignal?.removeEventListener('abort', abort)
        }
      }
    }
  }

  async list(): Promise<BrowserSessionStatus[]> {
    return Promise.all([...this.definitions.keys()].map((providerId) => this.status(providerId)))
  }

  async status(providerId: string): Promise<BrowserSessionStatus> {
    const definition = this.definition(providerId)
    try {
      const identity = await definition.verify(this.client(providerId))
      return {
        providerId,
        displayName: definition.displayName,
        authenticated: identity !== undefined,
        accountLabel: identity?.accountLabel
      }
    } catch (error) {
      return {
        providerId,
        displayName: definition.displayName,
        authenticated: false,
        error: error instanceof Error ? error.message : 'Could not verify the browser session.'
      }
    }
  }

  async login(providerId: string): Promise<BrowserSessionStatus> {
    const existing = this.loginWindows.get(providerId)
    if (existing && !existing.window.isDestroyed()) {
      existing.window.show()
      existing.window.focus()
      return existing.result
    }

    const definition = this.definition(providerId)
    const providerSession = this.providerSession(providerId)
    const appearance = await this.welcomeAppearance()
    const chrome = browserSessionWindowChrome(appearance.theme)
    const window = new BrowserWindow({
      width: 960,
      height: 720,
      minWidth: 720,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      frame: false,
      transparent: false,
      maximizable: false,
      minimizable: true,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: appearance.syncedTheme?.colors.surface ?? chrome.background,
      title: `Widoken — ${definition.displayName} sign in`,
      icon: appIconPath(),
      webPreferences: {
        preload: join(__dirname, '../preload/browserSession.cjs'),
        session: providerSession,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: false
      }
    })

    let resolveResult!: (status: BrowserSessionStatus) => void
    const result = new Promise<BrowserSessionStatus>((resolve) => { resolveResult = resolve })
    this.loginWindows.set(providerId, { window, result })

    let providerView: WebContentsView | undefined
    let autoCloseTimer: ReturnType<typeof setTimeout> | undefined
    let resultResolved = false
    let checking = false
    const settleResult = (status: BrowserSessionStatus): void => {
      if (resultResolved) return
      resultResolved = true
      resolveResult(status)
    }
    const closeProviderView = (): void => {
      const currentView = providerView
      providerView = undefined
      if (!currentView) return
      if (!window.isDestroyed()) window.contentView.removeChildView(currentView)
      if (!currentView.webContents.isDestroyed()) currentView.webContents.close()
    }
    const showConnected = (status: BrowserSessionStatus): void => {
      if (autoCloseTimer || window.isDestroyed()) return
      closeProviderView()
      const connected: BrowserSessionConnectedStatus = {
        providerId: status.providerId,
        displayName: status.displayName,
        accountLabel: status.accountLabel
      }
      window.webContents.send(IPC.browserSessionWindowConnected, connected)
      autoCloseTimer = setTimeout(() => {
        if (!window.isDestroyed()) window.close()
      }, CONNECTED_WINDOW_AUTO_CLOSE_MS)
      settleResult(status)
    }
    const checkAuthentication = async (): Promise<void> => {
      if (checking || window.isDestroyed()) return
      checking = true
      const current = await this.status(providerId)
      checking = false
      if (current.authenticated) showConnected(current)
    }

    const navigationAllowed = (url: string): boolean => {
      const origin = parseHttpsOrigin(url)
      return origin !== undefined && definition.allowedNavigationOrigins.includes(origin)
    }
    const resizeProviderView = (): void => {
      if (!providerView || window.isDestroyed()) return
      const [width, height] = window.getContentSize()
      providerView.setBounds({
        x: 0,
        y: BROWSER_SESSION_TITLEBAR_HEIGHT,
        width,
        height: Math.max(0, height - BROWSER_SESSION_TITLEBAR_HEIGHT)
      })
    }
    const openProviderPage = async (url: string): Promise<void> => {
      if (!navigationAllowed(url) || window.isDestroyed()) return
      if (!providerView) {
        providerView = new WebContentsView({
          webPreferences: {
            session: providerSession,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            devTools: false
          }
        })
        const providerContents = providerView.webContents
        providerContents.on('will-navigate', (event, targetUrl) => {
          if (!navigationAllowed(targetUrl)) event.preventDefault()
        })
        providerContents.on('will-redirect', (event, targetUrl) => {
          if (!navigationAllowed(targetUrl)) event.preventDefault()
        })
        providerContents.setWindowOpenHandler(({ url: targetUrl }) => {
          if (navigationAllowed(targetUrl)) void providerContents.loadURL(targetUrl).catch(() => undefined)
          return { action: 'deny' }
        })
        providerContents.on('did-stop-loading', () => { void checkAuthentication() })
        window.contentView.addChildView(providerView)
        resizeProviderView()
      }
      await providerView.webContents.loadURL(url)
      providerView.webContents.focus()
    }
    window.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      if (navigationAllowed(url)) void openProviderPage(url).catch(() => undefined)
    })
    window.webContents.on('will-redirect', (event) => event.preventDefault())
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (navigationAllowed(url)) void openProviderPage(url).catch(() => undefined)
      return { action: 'deny' }
    })
    window.on('page-title-updated', (event) => event.preventDefault())
    window.on('resize', resizeProviderView)
    window.once('ready-to-show', () => window.show())
    window.once('closed', () => {
      this.loginWindows.delete(providerId)
      if (autoCloseTimer) clearTimeout(autoCloseTimer)
      closeProviderView()
      if (!resultResolved) void this.status(providerId).then(settleResult)
    })

    try {
      await this.loadWelcome(window, definition, appearance)
    } catch (error) {
      if (!window.isDestroyed()) window.close()
      throw error
    }
    return result
  }

  async logout(providerId: string): Promise<BrowserSessionStatus> {
    this.definition(providerId)
    const open = this.loginWindows.get(providerId)
    if (open && !open.window.isDestroyed()) open.window.close()
    await this.providerSession(providerId).clearData({
      dataTypes: ['cookies', 'localStorage', 'indexedDB', 'serviceWorkers']
    })
    return this.status(providerId)
  }

  closeLoginWindow(webContentsId: number): void {
    const loginWindow = this.loginWindowForWebContents(webContentsId)
    if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close()
  }

  minimizeLoginWindow(webContentsId: number): void {
    const loginWindow = this.loginWindowForWebContents(webContentsId)
    if (loginWindow && !loginWindow.isDestroyed()) loginWindow.minimize()
  }

  dispose(): void {
    for (const { window } of this.loginWindows.values()) {
      if (!window.isDestroyed()) window.destroy()
    }
    this.loginWindows.clear()
  }

  private definition(providerId: string): ProviderBrowserSessionDefinition {
    const definition = this.definitions.get(providerId)
    if (!definition) throw new Error('Unknown browser-session provider.')
    return definition
  }

  private loginWindowForWebContents(webContentsId: number): BrowserWindow | undefined {
    for (const { window } of this.loginWindows.values()) {
      if (window.webContents.id === webContentsId) return window
    }
    return undefined
  }

  private async welcomeAppearance(): Promise<BrowserSessionAppearance> {
    let appearance: BrowserSessionAppearance = { theme: 'monokai-black' }
    try {
      appearance = await this.options.getWelcomeAppearance?.() ?? appearance
    } catch {
      // A settings read failure must not block provider sign-in.
    }
    return appearance
  }

  private async loadWelcome(
    window: BrowserWindow,
    definition: ProviderBrowserSessionDefinition,
    appearance: BrowserSessionAppearance
  ): Promise<void> {
    const query = browserSessionWelcomeQuery({
      providerId: definition.providerId,
      displayName: definition.displayName,
      loginUrl: definition.loginUrl,
      reason: definition.welcome.reason,
      collectedData: [...definition.welcome.collectedData],
      ...appearance
    })
    if (process.env.ELECTRON_RENDERER_URL) {
      const url = new URL(process.env.ELECTRON_RENDERER_URL)
      url.pathname = '/browser-session.html'
      url.search = new URLSearchParams(query).toString()
      await window.loadURL(url.toString())
      return
    }
    await window.loadFile(join(__dirname, '../renderer/browser-session.html'), { query })
  }

  private providerSession(providerId: string): Session {
    const existing = this.sessions.get(providerId)
    if (existing) return existing
    const providerSession = session.fromPartition(partitionName(providerId))
    providerSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
    providerSession.on('will-download', (event) => event.preventDefault())
    this.sessions.set(providerId, providerSession)
    return providerSession
  }
}
