import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let electronApp: ElectronApplication
let page: Page
let settingsPage: Page | undefined
let userDataDirectory: string

function expectGeometryClose(
  actual: Record<string, { x: number; y: number; width: number; height: number }>,
  expected: Record<string, { x: number; y: number; width: number; height: number }>
): void {
  for (const [name, rectangle] of Object.entries(expected)) {
    expect(actual[name].x).toBeCloseTo(rectangle.x, 0)
    expect(actual[name].y).toBeCloseTo(rectangle.y, 0)
    expect(actual[name].width).toBeCloseTo(rectangle.width, 0)
    expect(actual[name].height).toBeCloseTo(rectangle.height, 0)
  }
}

async function revealWidget(): Promise<void> {
  await page.locator('.widget__visual').hover()
  await expect(page.locator('.widget')).not.toHaveClass(/widget--collapsed/)
  await expect(page.locator('.widget__visual')).toHaveCSS('transform', 'none')
}

async function openSettingsWindow(): Promise<Page> {
  const existing = electronApp.windows().find((window) => !window.isClosed() && window.url().includes('dashboard.html'))
  if (existing) return existing
  await revealWidget()
  await page.locator('.gear-button').click()
  await expect.poll(() => electronApp.windows().some(
    (window) => !window.isClosed() && window.url().includes('dashboard.html')
  )).toBe(true)
  settingsPage = electronApp.windows().find(
    (window) => !window.isClosed() && window.url().includes('dashboard.html')
  )
  if (!settingsPage) throw new Error('Dashboard window did not open')
  await settingsPage.waitForLoadState('domcontentloaded')
  return settingsPage
}

async function closeSettingsWindow(): Promise<void> {
  const current = electronApp.windows().find((window) => !window.isClosed() && window.url().includes('dashboard.html'))
  if (!current) return
  await current.getByRole('button', { name: 'Close dashboard' }).click().catch((error: unknown) => {
    if (!current.isClosed()) throw error
  })
  await expect.poll(() => current.isClosed()).toBe(true)
  settingsPage = undefined
}

async function selectSettingsPage(
  settings: Page,
  name: 'Dashboard' | 'Providers' | 'Usage ring' | 'Appearance' | 'Behavior'
): Promise<void> {
  const pages = settings.getByRole('navigation', { name: 'Dashboard sections' })
  const pageButton = pages.getByRole('button', { name: name === 'Dashboard' ? 'Dashboard' : 'Widget', exact: true })
  if (await pageButton.getAttribute('aria-current') !== 'page') {
    await pageButton.click()
    await expect(pageButton).toHaveAttribute('aria-current', 'page')
  }
  if (name === 'Dashboard') return
  const button = settings.getByRole('navigation', { name: 'Widget settings' }).getByRole('button', { name, exact: true })
  if (await button.getAttribute('aria-current') === 'page') return
  await button.click()
  await expect(button).toHaveAttribute('aria-current', 'page')
}

async function selectWidgetLayout(layout: 'Vertical' | 'Horizontal'): Promise<void> {
  const settings = await openSettingsWindow()
  await selectSettingsPage(settings, 'Appearance')
  const layoutControl = settings.locator('.settings-control').filter({ hasText: 'Widget layout' })
  const trigger = layoutControl.locator('.settings-select__trigger')
  if ((await trigger.innerText()).includes(layout)) return
  await trigger.click()
  await settings.getByRole('option', { name: layout }).click()
}

test.beforeAll(async () => {
  userDataDirectory = await mkdtemp(join(tmpdir(), 'widoken-e2e-'))
  const { ELECTRON_RUN_AS_NODE: _electronRunAsNode, ...environment } = process.env
  electronApp = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDirectory}`],
    env: { ...environment, NODE_ENV: 'test', WIDOKEN_OZONE_PLATFORM: 'x11' }
  })
  page = await electronApp.firstWindow()
})

test.afterAll(async () => {
  await electronApp?.close()
  if (userDataDirectory) await rm(userDataDirectory, { recursive: true, force: true })
})

test('renders the dynamic widget and provider usage states', async () => {
  const widget = page.locator('.widget')
  await expect(widget).toBeVisible()
  await expect(page.locator('.provider-item')).toHaveCount(4)
  await expect.poll(async () => (await widget.boundingBox())?.height).toBeCloseTo(282, 1)
  await expect(page.locator('.board-app')).toBeVisible()
  await expect(page.locator('.board-app .usage-ring')).toHaveCount(0)
  await expect.poll(async () => (await page.locator('.board-app').boundingBox())?.width).toBeCloseTo(42, 1)
  await expect.poll(async () => (await page.locator('.board-app').boundingBox())?.height).toBeCloseTo(42, 1)
  await revealWidget()
  await expect.poll(async () => page.locator('.widget__board').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(54, 1)
  await expect.poll(async () => page.locator('.gear-button img').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(15, 1)
  await page.locator('.widget').evaluate(async (element) => {
    await Promise.allSettled(
      element.getAnimations({ subtree: true })
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished)
    )
  })

  const geometry = await page.evaluate(() => {
    const widget = document.querySelector<HTMLElement>('.widget')!.getBoundingClientRect()
    const relativeBox = (selector: string): { x: number; y: number; width: number; height: number } => {
      const box = document.querySelector<HTMLElement>(selector)!.getBoundingClientRect()
      return { x: box.x - widget.x, y: box.y - widget.y, width: box.width, height: box.height }
    }
    return {
      thumb: relativeBox('.widget__thumb'),
      board: relativeBox('.widget__board'),
      firstProvider: relativeBox('.provider-item'),
      gear: relativeBox('.gear-button img'),
      grab: relativeBox('.grab-handle img')
    }
  })
  expectGeometryClose(geometry, {
    thumb: { x: 12, y: 0, width: 30, height: 282 },
    board: { x: 0, y: 18, width: 54, height: 246 },
    firstProvider: { x: 6, y: 24, width: 42, height: 42 },
    gear: { x: 20, y: 3.5, width: 15, height: 15 },
    grab: { x: 16.5, y: 268, width: 21, height: 9 }
  })

  await page.locator('.provider-item').first().hover()
  await expect(page.locator('[data-node-id="9:371"]')).toBeVisible()
  await expect(page.locator('[data-provider-id="claude"] .usage-ring')).toHaveClass(/usage-ring--split/)
  await expect(page.locator('.usage-popover__side')).toHaveText(['left', 'right'])
  await expect(page.locator('.usage-popover__label').first()).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(page.locator('.usage-popover__percent')).toHaveText(['23%', '31%'])
  await expect(page.locator('.usage-popover__updated')).toContainText('Updated at')
  await expect(page.locator('.usage-popover__metadata')).toHaveCount(0)
  await expect(page.locator('.usage-popover__amount')).toHaveCount(0)
  await expect(page.locator('.usage-popover')).toHaveCSS('width', '300px')
  await expect(page.locator('.usage-popover__label').first()).toHaveCSS('font-size', '14px')
  await expect(page.locator('.usage-popover__percent').first()).toHaveCSS('font-size', '13px')
  await expect(page.locator('.usage-popover__reset').first()).toHaveCSS('font-size', '11px')
  const popover = page.locator('.usage-popover-anchor > :is(.usage-popover, .unavailable-popover)')
  const anchorGeometry = await page.locator('.usage-popover-anchor').evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {
      renderedWidth: bounds.width,
      layoutWidth: (element as HTMLElement).offsetWidth,
      transform: getComputedStyle(element).transform
    }
  })
  expect(anchorGeometry.renderedWidth).toBe(anchorGeometry.layoutWidth)
  expect(anchorGeometry.transform).toBe('none')
  const readAnimationStart = async (): Promise<number> =>
    popover.evaluate((element) => {
      const startTime = element.getAnimations()[0]?.startTime
      return typeof startTime === 'number' ? startTime : -1
    })
  let previousAnimationStart = -1
  const expectAnimationRestarted = async (): Promise<void> => {
    let currentAnimationStart = -1
    await expect.poll(async () => {
      currentAnimationStart = await readAnimationStart()
      return currentAnimationStart
    }).toBeGreaterThan(previousAnimationStart)
    previousAnimationStart = currentAnimationStart
  }
  await expectAnimationRestarted()

  await page.locator('.provider-item').nth(1).hover()
  await expect(page.locator('.usage-popover__metadata')).toContainText('Plus plan')
  await expect(page.locator('.usage-popover__percent')).toHaveText(['55%', '42%'])
  await expectAnimationRestarted()

  await page.locator('.provider-item').nth(2).hover()
  await expect(page.locator('.usage-popover__metadata')).toContainText('Pro plan')
  await expect(page.locator('.usage-popover__amount')).toHaveText('16 / 20 used')
  await expectAnimationRestarted()

  await page.locator('.provider-item').last().hover()
  await expect(page.locator('[data-node-id="9:375"]')).toBeVisible()
  await expectAnimationRestarted()
})

test('renders a spinning dashed contour while a provider request is active', async () => {
  await revealWidget()
  const providers = await page.evaluate(() =>
    (window as unknown as {
      widgetDesktop: {
        providers: {
          list: () => Promise<Array<{ id: string; activity?: 'idle' | 'active'; [key: string]: unknown }>>
        }
      }
    }).widgetDesktop.providers.list()
  )
  const activeProviders = providers.map((provider) =>
    provider.id === 'claude' ? { ...provider, activity: 'active' as const } : provider
  )

  await electronApp.evaluate(({ BrowserWindow }, payload) => {
    BrowserWindow.getAllWindows()
      .find((candidate) => candidate.getTitle() === 'widoken overlay')
      ?.webContents.send('providers:updated', payload)
  }, activeProviders)

  const ring = page.locator('[data-provider-id="claude"] .usage-ring')
  const activeRing = page.locator('[data-provider-id="claude"] .usage-ring--active')
  const activityRing = ring.locator('.usage-ring__activity')
  const usageArc = ring.locator('.usage-ring__value').first()
  await expect(activityRing).toHaveAttribute('stroke-dasharray', '3.6 2.94')
  await expect(page.locator('[data-provider-id="claude"] .usage-ring__track')).toHaveCount(1)
  await expect(activityRing).toHaveCSS('animation-name', 'usage-ring-orbit')
  await expect(activityRing).toHaveCSS('animation-duration', '2.2s')
  await expect(activityRing).toHaveCSS('animation-play-state', 'running')
  await expect(activityRing).toHaveCSS('opacity', '1')
  await expect(activityRing).toHaveCSS('fill', 'none')
  await expect(usageArc).toHaveCSS('opacity', '0')
  expect(await activityRing.evaluate((contour) => getComputedStyle(contour).stroke)).not.toBe('none')
  const initialTransform = await activityRing.evaluate((element) => getComputedStyle(element).transform)
  await page.waitForTimeout(120)
  expect(await activityRing.evaluate((element) => getComputedStyle(element).transform)).not.toBe(initialTransform)

  await electronApp.evaluate(({ BrowserWindow }, payload) => {
    BrowserWindow.getAllWindows()
      .find((candidate) => candidate.getTitle() === 'widoken overlay')
      ?.webContents.send('providers:updated', payload)
  }, providers)
  await expect(activeRing).toHaveCount(0)
  await expect(activityRing).toHaveCSS('opacity', '0')
  await expect(activityRing).toHaveCSS('animation-play-state', 'paused')
  await expect(usageArc).toHaveCSS('opacity', '1')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(usageArc).toHaveCSS('transition-property', 'stroke-dashoffset, stroke-dasharray, opacity, transform')
  await expect(usageArc).toHaveCSS('transition-duration', '0.18s, 0.18s, 0.28s, 0.28s')
  await expect(usageArc).toHaveCSS('transition-delay', '0s, 0s, 0.12s, 0.12s')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

test('covers the whole display, including the taskbar area', async () => {
  test.skip(process.platform !== 'win32', 'Windows is the platform that clamps topmost windows to the work area')
  const geometry = await electronApp.evaluate(({ BrowserWindow, screen }) => {
    const overlay = BrowserWindow.getAllWindows().find((candidate) => candidate.getTitle() === 'widoken overlay')
    if (!overlay) return undefined
    const display = screen.getDisplayMatching(overlay.getBounds())
    return { bounds: overlay.getBounds(), display: display.bounds }
  })
  expect(geometry).toBeDefined()
  expect(geometry?.bounds.x).toBeCloseTo(geometry?.display.x ?? 0, 0)
  expect(geometry?.bounds.y).toBeCloseTo(geometry?.display.y ?? 0, 0)
  expect(geometry?.bounds.width).toBeCloseTo(geometry?.display.width ?? 0, 0)
  expect(geometry?.bounds.height).toBeCloseTo(geometry?.display.height ?? 0, 0)
})

test('does not expose native resize handles on the overlay', async () => {
  const resizable = await electronApp.evaluate(({ BrowserWindow }) => {
    const overlay = BrowserWindow.getAllWindows().find((candidate) => candidate.getTitle() === 'widoken overlay')
    return overlay?.isResizable()
  })

  expect(resizable).toBe(false)
})

test('opens the dashboard in a separate native window with an isolated preload', async () => {
  const settingsWindow = await openSettingsWindow()
  const settings = settingsWindow.getByRole('complementary', { name: 'Dashboard' })
  await expect(settings).toBeVisible()
  expect(settingsWindow).not.toBe(page)
  expect(settingsWindow.url()).toContain('dashboard.html')
  expect(await page.evaluate(() => {
    const appWindow = window as unknown as { dashboardDesktop?: unknown; widgetDesktop?: unknown }
    return { dashboard: typeof appWindow.dashboardDesktop, widget: typeof appWindow.widgetDesktop }
  })).toEqual({ dashboard: 'undefined', widget: 'object' })
  expect(await settingsWindow.evaluate(() => {
    const appWindow = window as unknown as { dashboardDesktop?: unknown; widgetDesktop?: unknown }
    return { dashboard: typeof appWindow.dashboardDesktop, widget: typeof appWindow.widgetDesktop }
  })).toEqual({ dashboard: 'object', widget: 'undefined' })
  const nativeWindowState = await electronApp.evaluate(({ BrowserWindow, screen }) => {
    const window = BrowserWindow.getAllWindows().find((candidate) => candidate.getTitle() === 'widoken dashboard')
    return window
      ? {
          bounds: window.getBounds(),
          workArea: screen.getDisplayMatching(window.getBounds()).workArea,
          maximized: window.isMaximized(),
          minimizable: window.isMinimizable(),
          resizable: window.isResizable()
        }
      : undefined
  })
  expect(nativeWindowState).toBeDefined()
  expect(nativeWindowState?.maximized).toBe(false)
  expect(nativeWindowState?.minimizable).toBe(true)
  expect(nativeWindowState?.resizable).toBe(false)
  expect(nativeWindowState?.bounds.width).toBe(Math.min(1180, (nativeWindowState?.workArea.width ?? 1212) - 32))
  const expectedSettingsHeight = Math.min(760, (nativeWindowState?.workArea.height ?? 792) - 32)
  await expect.poll(async () => electronApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().find((candidate) => candidate.getTitle() === 'widoken dashboard')?.getBounds().height
  )).toBeCloseTo(expectedSettingsHeight, 0)
  await expect(page.getByRole('complementary', { name: 'Dashboard' })).toHaveCount(0)
  await expect(settings).toHaveCSS('position', 'relative')
  await expect(settings).toHaveCSS('box-shadow', 'none')
  await expect(settings).toHaveCSS('border-radius', '0px')
  await expect(settings).toHaveCSS('border-top-width', '0px')
  await expect(settings).toHaveCSS('overflow-y', 'hidden')
  const settingsContent = settingsWindow.locator('.settings-panel__content')
  await expect(settingsContent).toHaveCSS('overflow-y', 'hidden')
  await expect(settings).toHaveCSS('animation-name', 'none')
  const sectionContents = settingsWindow.locator('.settings-panel__section-content')
  await expect(sectionContents).toHaveCount(1)
  await expect(sectionContents.first()).toHaveCSS('overflow-y', 'auto')
  await expect.poll(async () => sectionContents.first().evaluate((element) => getComputedStyle(element).scrollbarColor)).not.toBe('auto')
  const navigation = settingsWindow.getByRole('navigation', { name: 'Dashboard sections' })
  await expect(navigation.getByRole('button')).toHaveCount(2)
  await expect(navigation.locator('svg')).toHaveCount(2)
  await expect(navigation.getByRole('button', { name: 'Widget' })).toHaveAttribute('aria-current', 'page')
  await expect(navigation.getByRole('button', { name: 'Widget' })).toHaveAttribute('aria-expanded', 'true')
  const widgetNavigation = settingsWindow.getByRole('navigation', { name: 'Widget settings' })
  await expect(widgetNavigation.getByRole('button')).toHaveText(['Providers', 'Usage ring', 'Appearance', 'Behavior'])
  await expect(widgetNavigation.getByRole('button', { name: 'Appearance' })).toHaveAttribute('aria-current', 'page')
  const navigationBox = await navigation.boundingBox()
  await expect.poll(async () => (await widgetNavigation.boundingBox())?.width).toBeCloseTo(208, 0)
  expect((await widgetNavigation.boundingBox())?.x).toBeCloseTo((navigationBox?.x ?? 0) + (navigationBox?.width ?? 0), 0)
  const headerBox = await settingsWindow.locator('.settings-panel__header').boundingBox()
  const contentBox = await settingsContent.boundingBox()
  expect(headerBox?.height).toBeCloseTo(50, 0)
  expect(contentBox?.y).toBeCloseTo((headerBox?.y ?? 0) + (headerBox?.height ?? 0), 0)
  const sectionBoxes = await settingsWindow.locator('.settings-panel__section').evaluateAll((sections) =>
    sections.map((section) => {
      const bounds = section.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    })
  )
  expect(sectionBoxes).toHaveLength(1)
  const workspaceBox = await settingsWindow.locator('.settings-panel__workspace').boundingBox()
  const leftMargin = sectionBoxes[0].x - (workspaceBox?.x ?? 0)
  const rightMargin = (workspaceBox?.x ?? 0) + (workspaceBox?.width ?? 0) - sectionBoxes[0].x - sectionBoxes[0].width
  const topMargin = sectionBoxes[0].y - (workspaceBox?.y ?? 0)
  const bottomMargin = (workspaceBox?.y ?? 0) + (workspaceBox?.height ?? 0) - sectionBoxes[0].y - sectionBoxes[0].height
  expect(leftMargin).toBeCloseTo(rightMargin, 0)
  expect(leftMargin).toBeCloseTo(24, 0)
  expect(topMargin).toBeCloseTo(bottomMargin, 0)
  expect(topMargin).toBeCloseTo(24, 0)
  await expect(settingsWindow.locator('.settings-panel__footer')).toHaveCount(0)
  const minimizeButton = settingsWindow.getByRole('button', { name: 'Minimize dashboard' })
  await expect(minimizeButton).toBeVisible()
  await expect(settingsWindow.locator('.settings-panel__app-icon')).toBeVisible()
  await expect(settingsWindow.locator('.settings-panel__mark')).toHaveCSS('border-top-width', '0px')
  await expect(settingsWindow.locator('.settings-window')).toHaveClass(/overlay-root--theme-dark-pastel/)
  await expect(settingsWindow.locator('.settings-window')).toHaveCSS('background-color', 'rgb(15, 15, 19)')
  await expect.poll(async () => settingsWindow.locator('.settings-window').evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--color-overlay-blue').trim()
  )).toBe('#e7e3f4')
  const switchTrack = (name: string) =>
    settingsWindow.locator('.settings-check--standalone').filter({ hasText: name }).locator('.settings-switch > span')
  const appearanceShadowSwitch = switchTrack('Enable shadows')
  await expect(appearanceShadowSwitch).toHaveCSS('background-color', 'rgb(231, 227, 244)')
  await expect.poll(async () => appearanceShadowSwitch.evaluate((element) =>
    getComputedStyle(element, '::after').backgroundColor
  )).toBe('rgb(15, 15, 19)')

  const themeControl = settingsWindow.locator('.settings-control').filter({ hasText: 'Theme' })
  await expect(settingsWindow.getByRole('button', { name: 'Sync with VS Code' })).toBeVisible()
  await settingsWindow.evaluate(async () => {
    const desktop = (window as unknown as {
      dashboardDesktop: { settings: { update: (patch: unknown) => Promise<unknown> } }
    }).dashboardDesktop
    await desktop.settings.update({
      widget: {
        themeMode: 'vscode',
        vscodeTheme: {
          colorScheme: 'dark',
          name: 'Fixture VS Code Theme',
          colors: {
            accent: '#123456',
            danger: '#ff5555',
            elevated: '#223344',
            hover: '#334455',
            muted: '#8899aa',
            onAccent: '#ffffff',
            shadow: '#000000',
            strong: '#ffffff',
            success: '#55ff55',
            surface: '#112233',
            text: '#ddeeff',
            thumb: '#0a1b2c',
            track: '#445566',
            warning: '#ffff55'
          }
        }
      }
    })
  })
  await expect(themeControl.locator('.settings-select__trigger')).toContainText('Select theme')
  await expect(page.locator('.widget__board')).toHaveCSS('background-color', 'rgb(17, 34, 51)')
  await expect(page.locator('.widget__thumb-segment').first()).toHaveCSS('background-color', 'rgb(17, 34, 51)')
  await themeControl.locator('.settings-select__trigger').click()
  await themeControl.getByRole('option', { name: 'Dark Pastel' }).click()
  await expect(page.locator('.widget__board')).toHaveCSS('background-color', 'rgb(15, 15, 19)')
  await expect(page.locator('.widget__thumb-segment').first()).toHaveCSS('background-color', 'rgb(15, 15, 19)')
  await themeControl.locator('.settings-select__trigger').click()
  await expect(themeControl.getByRole('option')).toHaveCount(11)
  await expect(themeControl.locator('.settings-select__menu')).not.toHaveCSS('box-shadow', 'none')
  const selectedOption = themeControl.locator('.settings-select__option--selected')
  const hoverOption = themeControl.locator('.settings-select__option:not(.settings-select__option--selected)').first()
  await expect(selectedOption).toHaveCSS('background-color', 'rgb(231, 227, 244)')
  await expect(selectedOption).toHaveCSS('color', 'rgb(15, 15, 19)')
  await hoverOption.hover()
  await expect(hoverOption).toHaveCSS('background-color', 'rgb(29, 30, 37)')
  await expect(hoverOption).toHaveCSS('color', 'rgb(246, 245, 249)')
  await themeControl.getByRole('option', { name: 'Dracula' }).click()
  await expect(page.locator('.overlay-root')).toHaveClass(/overlay-root--theme-dracula/)
  await expect(page.locator('.widget__board')).toHaveCSS('background-color', 'rgb(40, 42, 54)')
  await expect.poll(async () => page.evaluate(() => {
    const board = getComputedStyle(document.querySelector<HTMLElement>('.widget__board')!).backgroundColor
    const dimmed = getComputedStyle(
      document.querySelector<HTMLElement>('.provider-item--unavailable .provider-item__icon-shell')!
    ).backgroundColor
    const brightness = (value: string): number => {
      const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
      const scale = value.startsWith('color(') ? 255 : 1
      return channels.reduce((total, channel) => total + channel * scale, 0)
    }
    return brightness(dimmed) < brightness(board)
  })).toBe(true)
  await expect(settingsWindow.locator('.settings-window')).toHaveCSS('background-color', 'rgb(15, 15, 19)')
  await expect(appearanceShadowSwitch).toHaveCSS('background-color', 'rgb(231, 227, 244)')
  await expect.poll(async () => appearanceShadowSwitch.evaluate((element) =>
    getComputedStyle(element, '::after').backgroundColor
  )).toBe('rgb(15, 15, 19)')
  await themeControl.locator('.settings-select__trigger').click()
  const selectedDraculaOption = themeControl.getByRole('option', { name: 'Dracula' })
  await selectedDraculaOption.hover()
  await expect(selectedDraculaOption).toHaveCSS('background-color', 'rgb(231, 227, 244)')
  const darkPastelOption = themeControl.getByRole('option', { name: 'Dark Pastel' })
  await darkPastelOption.hover()
  await expect(darkPastelOption).toHaveCSS('background-color', 'rgb(29, 30, 37)')
  await themeControl.getByRole('option', { name: 'Dracula' }).click()

  await selectSettingsPage(settingsWindow, 'Dashboard')
  const startupCheckbox = settingsWindow.getByRole('checkbox', { name: 'Launch at startup' })
  await startupCheckbox.check()
  await expect.poll(async () => switchTrack('Launch at startup').evaluate((element) =>
    getComputedStyle(element, '::after').backgroundColor
  )).toBe('rgb(15, 15, 19)')
  const localAnalyticsCheckbox = settingsWindow.getByRole('checkbox', { name: 'Local analytics' })
  await expect(localAnalyticsCheckbox).not.toBeChecked()
  await localAnalyticsCheckbox.check()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { dashboardDesktop: { settings: { get: () => Promise<{ analytics: { localInsights: boolean } }> } } }).dashboardDesktop.settings.get()
  ).then((settings) => settings.analytics.localInsights)).toBe(true)
  await localAnalyticsCheckbox.uncheck()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { dashboardDesktop: { settings: { get: () => Promise<{ analytics: { localInsights: boolean } }> } } }).dashboardDesktop.settings.get()
  ).then((settings) => settings.analytics.localInsights)).toBe(false)

  await selectSettingsPage(settingsWindow, 'Behavior')
  const dockingGuidesCheckbox = settingsWindow.getByRole('checkbox', { name: 'Docking guides' })
  await expect(dockingGuidesCheckbox).toBeChecked()
  await dockingGuidesCheckbox.uncheck()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { dashboardDesktop: { settings: { get: () => Promise<{ widget: { showDockGuides: boolean } }> } } }).dashboardDesktop.settings.get()
  ).then((settings) => settings.widget.showDockGuides)).toBe(false)
  await dockingGuidesCheckbox.check()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { dashboardDesktop: { settings: { get: () => Promise<{ widget: { showDockGuides: boolean } }> } } }).dashboardDesktop.settings.get()
  ).then((settings) => settings.widget.showDockGuides)).toBe(true)
  const edgeTuckCheckbox = settingsWindow.getByRole('checkbox', { name: 'Tuck into screen edge' })
  await expect(edgeTuckCheckbox).toBeChecked()
  await page.mouse.move(700, 500)
  await expect(page.locator('.widget')).toHaveClass(/widget--collapsed/)
  await edgeTuckCheckbox.uncheck()
  await expect(page.locator('.widget')).not.toHaveClass(/widget--collapsed/)
  await page.waitForTimeout(600)
  await expect(page.locator('.widget')).not.toHaveClass(/widget--collapsed/)
  await expect(page.locator('.widget')).not.toHaveClass(/widget--edge-/)
  await edgeTuckCheckbox.check()
  await expect(page.locator('.widget')).toHaveClass(/widget--collapsed/)

  await selectSettingsPage(settingsWindow, 'Providers')
  await expect(settingsWindow.locator('.provider-setting__icon-shell').first()).not.toHaveCSS('background-color', 'rgb(8, 8, 8)')
  await selectSettingsPage(settingsWindow, 'Appearance')
  const shadowCheckbox = settingsWindow.getByRole('checkbox', { name: 'Enable shadows' })
  await expect(shadowCheckbox).toBeChecked()
  await expect(page.locator('.widget__board')).toHaveCSS('box-shadow', 'none')
  await expect(page.locator('.widget__thumb')).toHaveCSS('box-shadow', 'none')
  await expect(page.locator('.widget')).not.toHaveCSS('filter', 'none')
  const shadowOpacity = settingsWindow.locator('.settings-range').filter({ hasText: 'Shadow opacity' }).locator('input')
  await shadowOpacity.fill('70')
  await expect(settingsWindow.locator('.settings-window')).toHaveCSS('--shadow-opacity', '70%')
  const itemGap = settingsWindow.locator('.settings-range').filter({ hasText: 'Widget item gap' }).locator('input')
  const widgetScale = settingsWindow.locator('.settings-range').filter({ hasText: 'Widget scale' }).locator('input')
  await itemGap.fill('12')
  await expect.poll(async () => page.locator('.provider-item').evaluateAll((providers) => {
    const first = providers[0].getBoundingClientRect()
    const second = providers[1].getBoundingClientRect()
    return second.top - first.bottom
  })).toBeCloseTo(12, 0)
  await page.locator('.widget').evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })
  const widgetPositionBeforeScale = await page.locator('.widget').boundingBox()
  await widgetScale.fill('120')
  await expect.poll(async () => (await page.locator('.widget').boundingBox())?.height).toBeCloseTo(367.2, 0)
  await expect.poll(async () => (await page.locator('.widget').boundingBox())?.x).toBeCloseTo(widgetPositionBeforeScale?.x ?? 0, 0)
  await expect.poll(async () => (await page.locator('.widget').boundingBox())?.y).toBeCloseTo(widgetPositionBeforeScale?.y ?? 0, 0)
  await expect(page.locator('.widget')).toHaveCSS('transform', 'none')
  await expect.poll(async () => page.locator('.widget').evaluate((element) => getComputedStyle(element).zoom)).toBe('1.2')
  await expect.poll(async () => (await page.locator('.provider-item').first().boundingBox())?.width).toBeCloseTo(50.4, 1)
  await expect.poll(async () => (await page.locator('.usage-ring').first().boundingBox())?.width).toBeCloseTo(50.4, 1)
  await itemGap.fill('6')
  await widgetScale.fill('100')
  await expect.poll(async () => (await page.locator('.widget').boundingBox())?.height).toBeCloseTo(282, 0)
  await shadowCheckbox.uncheck()
  await expect(settingsWindow.locator('.settings-window')).toHaveClass(/overlay-root--shadows-disabled/)
  await expect(page.locator('.overlay-root')).toHaveClass(/overlay-root--shadows-disabled/)
  await expect(page.locator('.widget')).toHaveCSS('filter', 'none')
  await selectSettingsPage(settingsWindow, 'Providers')
  await expect(settingsWindow.locator('.provider-setting__drag-handle')).toHaveCount(5)
  await expect(settingsWindow.getByRole('heading', { name: 'Providers' })).toBeVisible()
  await expect(page.locator('.widget')).toHaveClass(/widget--settings-open/)
  await page.mouse.move(700, 500)
  await expect(page.locator('.widget__thumb')).toHaveCSS('opacity', '0')
  await expect(page.locator('.widget__controls')).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('.gear-button img')).toHaveCSS('opacity', '0')
  await expect(page.locator('.grab-handle img')).toHaveCSS('opacity', '0')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(async () => page.locator('.widget__thumb').evaluate((element) =>
    getComputedStyle(element).transitionDuration
  )).not.toBe('0s')
  await expect.poll(async () => page.locator('.widget__controls').evaluate((element) =>
    getComputedStyle(element).transitionDuration
  )).not.toBe('0s')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

test('keeps the horizontal widget anatomy aligned', async () => {
  await selectWidgetLayout('Horizontal')

  const widget = page.locator('.widget')
  await expect(widget).toHaveClass(/widget--horizontal/)
  await expect.poll(async () => (await widget.boundingBox())?.width).toBeCloseTo(282, 1)
  await expect.poll(async () => (await widget.boundingBox())?.height).toBeCloseTo(54, 1)
  await widget.hover()
  await expect.poll(async () => page.locator('.widget__thumb').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(282, 1)
  await expect.poll(async () => page.locator('.gear-button img').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(15, 1)
  await expect.poll(async () => page.locator('.grab-handle img').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(9, 1)
  await expect(page.locator('.widget__controls')).toHaveCSS('z-index', '0')
  await expect(page.locator('.widget__board')).toHaveCSS('z-index', '1')
  await expect(page.locator('.widget__providers')).toHaveCSS('z-index', '2')
  const topLayerAtControlOverlap = await page.evaluate(() => {
    const board = document.querySelector<HTMLElement>('.widget__board')!.getBoundingClientRect()
    const gear = document.querySelector<HTMLElement>('.gear-button')!.getBoundingClientRect()
    const overlapLeft = Math.max(board.left, gear.left)
    const overlapRight = Math.min(board.right, gear.right)
    const overlapTop = Math.max(board.top, gear.top)
    const overlapBottom = Math.min(board.bottom, gear.bottom)
    const topElement = document.elementsFromPoint(
      (overlapLeft + overlapRight) / 2,
      (overlapTop + overlapBottom) / 2
    )[0]
    return topElement instanceof HTMLElement ? topElement.className : ''
  })
  expect(topLayerAtControlOverlap).toContain('widget__board')

  const geometry = await page.evaluate(() => {
    const widgetBox = document.querySelector<HTMLElement>('.widget')!.getBoundingClientRect()
    const relativeBox = (selector: string): { x: number; y: number; width: number; height: number } => {
      const box = document.querySelector<HTMLElement>(selector)!.getBoundingClientRect()
      return {
        x: box.x - widgetBox.x,
        y: box.y - widgetBox.y,
        width: box.width,
        height: box.height
      }
    }
    return {
      thumb: relativeBox('.widget__thumb'),
      board: relativeBox('.widget__board'),
      firstProvider: relativeBox('.provider-item'),
      lastProvider: relativeBox('.provider-item:nth-last-child(2)'),
      gear: relativeBox('.gear-button img'),
      grab: relativeBox('.grab-handle img')
    }
  })

  expectGeometryClose(geometry, {
    thumb: { x: 0, y: 12, width: 282, height: 30 },
    board: { x: 18, y: 0, width: 246, height: 54 },
    firstProvider: { x: 24, y: 6, width: 42, height: 42 },
    lastProvider: { x: 168, y: 6, width: 42, height: 42 },
    gear: { x: 5, y: 19.5, width: 15, height: 15 },
    grab: { x: 268, y: 16.5, width: 9, height: 21 }
  })
})

test('disables both docking guides and magnetic capture from settings', async () => {
  const settingsWindow = await openSettingsWindow()
  await selectSettingsPage(settingsWindow, 'Behavior')
  const dockingGuidesCheckbox = settingsWindow.getByRole('checkbox', { name: 'Docking guides' })
  await dockingGuidesCheckbox.uncheck()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { dashboardDesktop: { settings: { get: () => Promise<{ widget: { docked: boolean; showDockGuides: boolean } }> } } }).dashboardDesktop.settings.get()
  ).then((settings) => settings.widget)).toMatchObject({ docked: false, showDockGuides: false })
  await closeSettingsWindow()

  const widget = page.locator('.widget')
  const handle = page.locator('.grab-handle')
  const widgetBox = await widget.boundingBox()
  const handleBox = await handle.boundingBox()
  const viewport = await page.evaluate(() => ({ width: window.innerWidth }))
  expect(widgetBox).not.toBeNull()
  expect(handleBox).not.toBeNull()

  const pointerX = handleBox!.x + handleBox!.width / 2
  const pointerY = handleBox!.y + handleBox!.height / 2
  const offsetX = pointerX - widgetBox!.x
  const offsetY = pointerY - widgetBox!.y
  await page.mouse.move(pointerX, pointerY)
  await page.mouse.down()
  await page.mouse.move(viewport.width / 2 + offsetX, 50 + offsetY, { steps: 5 })
  await expect(page.locator('.selection-grid')).toHaveCount(0)
  await expect(widget).not.toHaveClass(/widget--snapped/)
  await expect.poll(async () => (await widget.boundingBox())?.y).toBeCloseTo(50, 0)
  await page.mouse.up()

  const persisted = await page.evaluate(() =>
    (window as unknown as { widgetDesktop: { settings: { get: () => Promise<{ widget: { docked: boolean } }> } } }).widgetDesktop.settings.get()
  )
  expect(persisted.widget.docked).toBe(false)

  const reopenedSettings = await openSettingsWindow()
  await selectSettingsPage(reopenedSettings, 'Behavior')
  await reopenedSettings.getByRole('checkbox', { name: 'Docking guides' }).check()
})

test('aligns horizontal hover details to the provider above or below the widget', async () => {
  await selectWidgetLayout('Horizontal')
  await closeSettingsWindow()

  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const handle = page.locator('.grab-handle')
  const handleBox = await handle.boundingBox()
  expect(handleBox).not.toBeNull()
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(viewport.width / 2, viewport.height * 0.75, { steps: 5 })
  await page.mouse.up()
  await expect.poll(async () => {
    const box = await page.locator('.widget').boundingBox()
    return box ? box.y + box.height / 2 > viewport.height / 2 : false
  }).toBe(true)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const provider = page.locator('.provider-item').last()
  await provider.hover()
  const anchor = page.locator('.usage-popover-anchor')
  const animatedPanel = anchor.locator(':scope > :is(.usage-popover, .unavailable-popover)')
  await expect(anchor).toBeVisible()
  await expect(anchor).toHaveCSS('animation-name', 'none')
  await expect(animatedPanel).toHaveCSS('animation-name', 'info-popover-in')
  await expect(animatedPanel).toHaveCSS('animation-duration', '0.18s')
  await animatedPanel.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })

  const geometry = await page.evaluate(() => {
    const widget = document.querySelector<HTMLElement>('.widget')!.getBoundingClientRect()
    const provider = Array.from(document.querySelectorAll<HTMLElement>('.provider-item')).at(-1)!.getBoundingClientRect()
    const anchor = document.querySelector<HTMLElement>('.usage-popover-anchor')!.getBoundingClientRect()
    const panel = document.querySelector<HTMLElement>('.unavailable-popover, .usage-popover')!.getBoundingClientRect()
    return {
      placement: document.querySelector<HTMLElement>('.usage-popover-anchor')!.className,
      providerCenter: provider.x + provider.width / 2,
      panelCenter: panel.x + panel.width / 2,
      widgetTop: widget.top,
      widgetBottom: widget.bottom,
      panelTop: panel.top,
      panelBottom: panel.bottom,
      anchorTop: anchor.top
    }
  })

  expect(geometry.panelCenter).toBeCloseTo(geometry.providerCenter, 0)
  expect(geometry.placement).toContain('top')
  expect(geometry.panelBottom).toBeCloseTo(geometry.widgetTop - 6, 0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

test('drags from the grab handle and persists right-side docking', async () => {
  await selectWidgetLayout('Vertical')
  await closeSettingsWindow()
  const handle = page.locator('.grab-handle')
  await handle.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })
  await expect.poll(async () => page.evaluate(() =>
    (window as unknown as { widgetDesktop: { settings: { get: () => Promise<{ widget: { showDockGuides: boolean } }> } } }).widgetDesktop.settings.get()
  ).then((settings) => settings.widget.showDockGuides)).toBe(true)
  const revealHandle = async (): Promise<void> => {
    await revealWidget()
    await expect(page.locator('.widget__controls')).toHaveCSS('visibility', 'visible')
    await page.locator('.widget__controls').evaluate(async (element) => {
      await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))
    })
  }
  await revealHandle()
  let box = await handle.boundingBox()
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  expect(box).not.toBeNull()

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await expect(page.locator('.selection-grid')).toBeVisible()
  const laneBoxes = await page.locator('.drop-zone').evaluateAll((lanes) =>
    lanes.map((lane) => {
      const box = lane.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width, height: box.height }
    })
  )
  const expectedLaneBoxes = [
    { x: 8, y: 8, width: 54, height: viewport.height - 16 },
    { x: viewport.width - 62, y: 8, width: 54, height: viewport.height - 16 },
    { x: 8, y: 8, width: viewport.width - 16, height: 54 },
    { x: 8, y: viewport.height - 62, width: viewport.width - 16, height: 54 }
  ]
  laneBoxes.forEach((lane, index) => {
    expect(lane.x).toBeCloseTo(expectedLaneBoxes[index].x, 0)
    expect(lane.y).toBeCloseTo(expectedLaneBoxes[index].y, 0)
    expect(lane.width).toBeCloseTo(expectedLaneBoxes[index].width, 0)
    expect(lane.height).toBeCloseTo(expectedLaneBoxes[index].height, 0)
  })

  await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 5 })
  await page.mouse.up()

  let widgetBox = await page.locator('.widget').boundingBox()
  expect(widgetBox).not.toBeNull()
  expect(widgetBox!.x).toBeGreaterThan(100)
  expect(widgetBox!.x + widgetBox!.width).toBeLessThan(viewport.width - 100)
  let settings = await page.evaluate(() =>
    (window as unknown as { widgetDesktop: { settings: { get: () => Promise<{ widget: { docked: boolean; side: string } }> } } }).widgetDesktop.settings.get()
  )
  expect(settings.widget.docked).toBe(false)

  await revealHandle()
  box = await handle.boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(viewport.width / 2, 2, { steps: 5 })
  await expect(page.locator('.drop-zone--top.drop-zone--active')).toHaveCount(1)
  await expect.poll(async () => page.locator('.widget').evaluate((element) =>
    getComputedStyle(element).transitionProperty.split(',').map((property) => property.trim())
  )).toContain('top')
  await page.mouse.up()
  await expect.poll(async () => (await page.locator('.widget').boundingBox())?.y).toBeCloseTo(8, 0)
  settings = await page.evaluate(() =>
    (window as unknown as { widgetDesktop: { settings: { get: () => Promise<{ widget: { docked: boolean; side: string } }> } } }).widgetDesktop.settings.get()
  )
  expect(settings.widget.side).toBe('top')

  await revealHandle()
  box = await handle.boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(viewport.width * 0.25, viewport.height - 2, { steps: 5 })
  await expect(page.locator('.drop-zone--bottom.drop-zone--active')).toHaveCount(1)
  await page.mouse.up()
  await expect.poll(async () => {
    const box = await page.locator('.widget').boundingBox()
    return box && box.y + box.height
  }).toBeCloseTo(viewport.height - 8, 0)
  settings = await page.evaluate(() =>
    (window as unknown as { widgetDesktop: { settings: { get: () => Promise<{ widget: { docked: boolean; side: string } }> } } }).widgetDesktop.settings.get()
  )
  expect(settings.widget.side).toBe('bottom')

  await page.locator('.widget').hover({ position: { x: 27, y: 24 } })
  await expect(page.locator('.widget')).toHaveClass(/widget--grab-turn-right/)
  await page.locator('.widget__controls').evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))
  })
  box = await handle.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.locator('.widget__thumb')).toHaveCSS('opacity', '1')
  await expect.poll(async () => handle.evaluate((element) => element.matches(':hover'))).toBe(true)
  await page.mouse.down()
  await expect(page.locator('.selection-grid')).toBeVisible()
  await page.mouse.move(viewport.width - 2, viewport.height - 2, { steps: 5 })
  await expect(page.locator('.drop-zone--right.drop-zone--active')).toHaveCount(1)
  await expect(page.locator('.widget')).toHaveClass(/widget--grab-turn-left/)
  await expect.poll(async () => page.locator('.widget__thumb-segment--grab').evaluate((element) =>
    element.getAnimations().some((animation) => animation.playState === 'running')
  )).toBe(true)
  await page.mouse.up()

  await expect.poll(async () => {
    const box = await page.locator('.widget').boundingBox()
    return box && box.x + box.width
  }).toBeCloseTo(viewport.width - 8, 0)
  await expect.poll(async () => {
    const box = await page.locator('.widget').boundingBox()
    return box && box.y + box.height
  }).toBeCloseTo(viewport.height - 8, 0)
  await revealWidget()
  await expect(page.locator('.widget')).toHaveClass(/widget--grab-turn-left/)
  await page.locator('.widget__thumb').evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))
  })
  const cornerGeometry = await page.evaluate(() => {
    const widget = document.querySelector<HTMLElement>('.widget')!.getBoundingClientRect()
    const board = document.querySelector<HTMLElement>('.widget__board')!.getBoundingClientRect()
    const grabThumb = document.querySelector<HTMLElement>('.widget__thumb-segment--grab')!.getBoundingClientRect()
    const gear = document.querySelector<HTMLElement>('.gear-button')!.getBoundingClientRect()
    const grab = document.querySelector<HTMLElement>('.grab-handle')!.getBoundingClientRect()
    return {
      boardBottom: board.bottom,
      grabThumbCenterY: grabThumb.top + grabThumb.height / 2,
      gearCenter: gear.left + gear.width / 2,
      grabCenter: grab.left + grab.width / 2,
      grabThumbRight: grabThumb.right,
      widgetBottom: widget.bottom,
      widgetLeft: widget.left,
      widgetRight: widget.right
    }
  })
  expect(cornerGeometry.boardBottom).toBeCloseTo(cornerGeometry.widgetBottom, 0)
  expect(cornerGeometry.grabThumbCenterY).toBeCloseTo(cornerGeometry.boardBottom - 27, 0)
  expect(cornerGeometry.grabThumbRight - cornerGeometry.widgetLeft).toBeCloseTo(6, 0)
  expect(cornerGeometry.grabCenter).toBeLessThan(cornerGeometry.widgetLeft)
  expect(cornerGeometry.gearCenter).toBeGreaterThan(cornerGeometry.widgetLeft)
  expect(cornerGeometry.gearCenter).toBeLessThan(cornerGeometry.widgetRight)
  settings = await page.evaluate(() =>
    (window as unknown as { widgetDesktop: { settings: { get: () => Promise<{ widget: { docked: boolean; side: string } }> } } }).widgetDesktop.settings.get()
  )
  expect(settings.widget.docked).toBe(true)
  expect(settings.widget.side).toBe('right')

  await revealWidget()
  const settingsWindow = await openSettingsWindow()
  const settingsPanel = settingsWindow.getByRole('complementary', { name: 'Dashboard' })
  await expect(settingsPanel).toBeVisible()
  const expectedHeight = await settingsWindow.evaluate(() => window.innerHeight)
  await expect.poll(async () => Math.abs(((await settingsPanel.boundingBox())?.height ?? 0) - expectedHeight)).toBeLessThanOrEqual(1)
})

test('navigates the dashboard from the widoken icon and the widget gear', async () => {
  const dashboard = await openSettingsWindow()
  const pages = dashboard.getByRole('navigation', { name: 'Dashboard sections' })
  const widgetNavigation = dashboard.getByRole('navigation', { name: 'Widget settings' })
  await selectSettingsPage(dashboard, 'Behavior')

  await revealWidget()
  await page.locator('.board-app').click()
  await expect(pages.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  await expect(dashboard.getByRole('heading', { name: 'Dashboard', level: 2 })).toBeVisible()
  const collapsedWidgetNavigation = dashboard.locator('.settings-panel__subnav')
  await expect(widgetNavigation).toHaveCount(0)
  await expect(collapsedWidgetNavigation).toHaveAttribute('aria-hidden', 'true')
  await expect.poll(async () => (await collapsedWidgetNavigation.boundingBox())?.width ?? 0).toBeLessThan(1)
  await expect(dashboard.locator('.dashboard-provider-card')).not.toHaveCount(0)
  await expect(dashboard.getByRole('checkbox', { name: 'Launch at startup' })).toBeVisible()

  await pages.getByRole('button', { name: 'Widget' }).click()
  await expect(widgetNavigation.getByRole('button', { name: 'Behavior' })).toHaveAttribute('aria-current', 'page')
  await selectSettingsPage(dashboard, 'Dashboard')

  await revealWidget()
  await page.locator('.gear-button').click()
  await expect(pages.getByRole('button', { name: 'Widget' })).toHaveAttribute('aria-current', 'page')
  await expect(widgetNavigation.getByRole('button', { name: 'Appearance' })).toHaveAttribute('aria-current', 'page')
  await expect.poll(async () => (await widgetNavigation.boundingBox())?.width).toBeCloseTo(208, 0)
})

test('configures the usage ring per provider from the widget settings', async () => {
  const settingsWindow = await openSettingsWindow()
  await selectSettingsPage(settingsWindow, 'Usage ring')
  await expect(settingsWindow.locator('.provider-setting__usage-button')).toHaveCount(0)
  const openaiCard = settingsWindow.locator('.usage-ring-setting[data-provider-id="openai"]')
  const splitUsage = openaiCard.getByRole('checkbox', { name: 'Split ChatGPT usage ring' })
  await expect(splitUsage).toBeChecked()
  await expect(openaiCard.locator('.settings-control > span')).toHaveText(['Left side', 'Right side'])
  await expect(openaiCard.locator('.usage-ring')).toHaveClass(/usage-ring--split/)
  await splitUsage.uncheck()
  await expect(openaiCard.locator('.usage-ring')).not.toHaveClass(/usage-ring--split/)
  await expect(page.locator('[data-provider-id="openai"] .usage-ring')).not.toHaveClass(/usage-ring--split/)
  const ringSelect = openaiCard.locator('.settings-control').filter({ hasText: 'Usage ring' })
  await ringSelect.locator('.settings-select__trigger').click()
  await ringSelect.getByRole('option', { name: 'Secondary window' }).click()
  await expect(page.getByRole('button', { name: /ChatGPT.*Secondary window 42%/ })).toBeVisible()
  await splitUsage.check()
  await expect(page.locator('[data-provider-id="openai"] .usage-ring')).toHaveClass(/usage-ring--split/)
  const leftSelect = openaiCard.locator('.settings-control').filter({ hasText: 'Left side' })
  const rightSelect = openaiCard.locator('.settings-control').filter({ hasText: 'Right side' })
  await expect(leftSelect.locator('.settings-select__trigger')).toHaveText('Secondary window')
  await expect(rightSelect.locator('.settings-select__trigger')).toHaveText('Primary window')
  await leftSelect.locator('.settings-select__trigger').click()
  await expect(leftSelect.getByRole('option')).toHaveText(['Primary window', 'Secondary window'])
  await leftSelect.getByRole('option', { name: 'Primary window' }).click()
  await expect(rightSelect.locator('.settings-select__trigger')).toHaveText('Secondary window')
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { dashboardDesktop: { settings: { get: () => Promise<{ providers: Array<{ id: string; usageDisplay: unknown }> }> } } })
      .dashboardDesktop.settings.get()
  ).then((settings) => settings.providers.find((provider) => provider.id === 'openai')?.usageDisplay)).toEqual({
    split: true,
    primaryLimitId: 'primary',
    secondaryLimitId: 'secondary'
  })
  await expect(settingsWindow.locator('.usage-ring-setting[data-provider-id="antigravity"]')).toHaveCount(0)
})

test('reorders providers by dragging and shows newly enabled providers immediately', async () => {
  const settingsWindow = await openSettingsWindow()
  await selectSettingsPage(settingsWindow, 'Providers')
  const rows = settingsWindow.locator('.provider-setting')

  const firstName = await rows.first().locator('.provider-setting__identity strong').innerText()

  const source = await rows.first().locator('.provider-setting__drag-handle').boundingBox()
  const target = await rows.last().boundingBox()
  expect(source).not.toBeNull()
  expect(target).not.toBeNull()
  await settingsWindow.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2)
  await settingsWindow.mouse.down()
  await settingsWindow.mouse.move(target!.x + target!.width / 2, target!.y + target!.height * 0.8, { steps: 8 })
  await settingsWindow.mouse.up()
  await expect(rows.last().locator('.provider-setting__identity strong')).toHaveText(firstName)

  const copilotRow = rows.filter({ hasText: 'GitHub Copilot' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await copilotRow.locator('.settings-switch').click()
  await expect(page.locator('.provider-item')).toHaveCount(5)
  await expect.poll(async () => page.locator('.widget__visual').evaluate((element) =>
    element.getAnimations().some((animation) => animation.effect?.getTiming().duration === 480)
  )).toBe(true)
  const copilotItem = page.getByRole('button', { name: /GitHub Copilot/ })
  await expect(copilotItem).toHaveClass(/provider-item--entering/)
  await expect(copilotItem).toHaveCSS('animation-name', 'provider-item-in')
  await expect(copilotItem).toHaveCSS('animation-duration', '0.32s')
  await expect(settingsWindow.getByRole('checkbox', { name: 'Disable GitHub Copilot' })).toBeChecked()

  await copilotRow.locator('.settings-switch').click()
  await expect(page.locator('.provider-item')).toHaveCount(4)
  await expect.poll(async () => page.locator('.widget__visual').evaluate((element) =>
    element.getAnimations().some((animation) => animation.effect?.getTiming().duration === 420)
  )).toBe(true)
  await expect(settingsWindow.getByRole('checkbox', { name: 'Enable GitHub Copilot' })).not.toBeChecked()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

test('keeps the horizontal popover outside the turned thumb', async () => {
  await closeSettingsWindow()
  await page.evaluate(() =>
    (window as unknown as {
      widgetDesktop: { settings: { update: (patch: object) => Promise<unknown> } }
    }).widgetDesktop.settings.update({
      widget: { docked: true, horizontalPosition: 1, orientation: 'horizontal', side: 'right', verticalPosition: 1 }
    })
  )

  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const widget = page.locator('.widget')
  await expect(widget).toHaveClass(/widget--horizontal/)
  await expect.poll(async () => {
    const bounds = await widget.boundingBox()
    return bounds ? bounds.x + bounds.width : 0
  }).toBeCloseTo(viewport.width - 8, 0)
  await expect.poll(async () => {
    const bounds = await widget.boundingBox()
    return bounds ? bounds.y + bounds.height : 0
  }).toBeCloseTo(viewport.height - 8, 0)

  await revealWidget()
  await expect(widget).toHaveClass(/widget--grab-turn-top/)
  await page.locator('.provider-item').last().hover()
  const panel = page.locator('.usage-popover-anchor > :is(.usage-popover, .unavailable-popover)')
  await expect(panel).toBeVisible()
  await panel.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })

  const geometry = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('.usage-popover, .unavailable-popover')!.getBoundingClientRect()
    const widget = document.querySelector<HTMLElement>('.widget')!
    const thumbElement = document.querySelector<HTMLElement>('.widget__thumb-segment--grab')!
    const thumb = thumbElement.getBoundingClientRect()
    return {
      gap: thumb.left - panel.right,
      placement: document.querySelector<HTMLElement>('.usage-popover-anchor')!.className,
      thumbInset: widget.offsetWidth - thumbElement.offsetLeft - thumbElement.offsetWidth
    }
  })
  expect(geometry.placement).toContain('top')
  expect(geometry.gap).toBeCloseTo(6, 0)
  expect(geometry.thumbInset).toBe(12)
})

test('keeps the vertical popover outside the turned thumb', async () => {
  await closeSettingsWindow()
  const widget = page.locator('.widget')
  const panel = page.locator('.usage-popover-anchor > :is(.usage-popover, .unavailable-popover)')

  await page.evaluate(() =>
    (window as unknown as {
      widgetDesktop: { settings: { update: (patch: object) => Promise<unknown> } }
    }).widgetDesktop.settings.update({
      widget: { docked: true, horizontalPosition: 1, orientation: 'vertical', side: 'right', verticalPosition: 0 }
    })
  )
  await revealWidget()
  await expect(widget).toHaveClass(/widget--gear-turn-left/)
  await page.locator('.provider-item').first().hover()
  await expect(panel).toBeVisible()
  await panel.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })
  const topCorner = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.usage-popover, .unavailable-popover')!.getBoundingClientRect()
    const gear = document.querySelector<HTMLElement>('.widget__thumb-segment--gear')!.getBoundingClientRect()
    const overlaps = !(card.right <= gear.left || card.left >= gear.right || card.bottom <= gear.top || card.top >= gear.bottom)
    return { gap: card.top - gear.bottom, overlaps }
  })
  expect(topCorner.overlaps).toBe(false)
  expect(topCorner.gap).toBeGreaterThanOrEqual(5.5)

  await page.evaluate(() =>
    (window as unknown as {
      widgetDesktop: { settings: { update: (patch: object) => Promise<unknown> } }
    }).widgetDesktop.settings.update({
      widget: { docked: true, horizontalPosition: 1, orientation: 'vertical', side: 'right', verticalPosition: 1 }
    })
  )
  await revealWidget()
  await expect(widget).toHaveClass(/widget--grab-turn-left/)
  await page.locator('.provider-item').last().hover()
  await expect(panel).toBeVisible()
  await panel.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })
  const bottomCorner = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.usage-popover, .unavailable-popover')!.getBoundingClientRect()
    const grab = document.querySelector<HTMLElement>('.widget__thumb-segment--grab')!.getBoundingClientRect()
    const overlaps = !(card.right <= grab.left || card.left >= grab.right || card.bottom <= grab.top || card.top >= grab.bottom)
    return { gap: grab.top - card.bottom, overlaps }
  })
  expect(bottomCorner.overlaps).toBe(false)
  expect(bottomCorner.gap).toBeGreaterThanOrEqual(5.5)
})

test('turns the widget off and back on without closing the dashboard', async () => {
  const dashboard = await openSettingsWindow()
  await selectSettingsPage(dashboard, 'Behavior')
  const widgetEnabled = dashboard.getByRole('checkbox', { name: 'Widget enabled' })
  await expect(widgetEnabled).toBeChecked()

  const previousWidget = page
  await widgetEnabled.uncheck()
  await expect.poll(() => previousWidget.isClosed()).toBe(true)
  await expect(dashboard.getByRole('complementary', { name: 'Dashboard' })).toBeVisible()
  await expect.poll(() => electronApp.windows().some(
    (window) => !window.isClosed() && window.url().includes('widget.html')
  )).toBe(false)

  await widgetEnabled.check()
  await expect.poll(() => electronApp.windows().some(
    (window) => !window.isClosed() && window.url().includes('widget.html')
  )).toBe(true)
  const restartedWidget = electronApp.windows().find(
    (window) => !window.isClosed() && window.url().includes('widget.html')
  )
  if (!restartedWidget) throw new Error('Widget window did not restart')
  page = restartedWidget
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('.widget')).toBeVisible()
  await expect(widgetEnabled).toBeChecked()
})
