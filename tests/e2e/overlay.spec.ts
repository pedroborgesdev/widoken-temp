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

async function openSettingsWindow(): Promise<Page> {
  const existing = electronApp.windows().find((window) => !window.isClosed() && window.url().includes('window=settings'))
  if (existing) return existing
  const windowOpened = electronApp.waitForEvent('window')
  await page.locator('.widget').hover()
  await page.locator('.gear-button').click()
  settingsPage = await windowOpened
  await settingsPage.waitForLoadState('domcontentloaded')
  return settingsPage
}

async function closeSettingsWindow(): Promise<void> {
  const current = electronApp.windows().find((window) => !window.isClosed() && window.url().includes('window=settings'))
  if (!current) return
  await current.getByRole('button', { name: 'Close settings' }).click().catch((error: unknown) => {
    if (!current.isClosed()) throw error
  })
  await expect.poll(() => current.isClosed()).toBe(true)
  settingsPage = undefined
}

async function selectSettingsPage(
  settings: Page,
  name: 'Providers' | 'Appearance' | 'Behavior' | 'General'
): Promise<void> {
  const navigation = settings.getByRole('navigation', { name: 'Settings sections' })
  const button = navigation.getByRole('button', { name, exact: true })
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
  await expect.poll(async () => (await widget.boundingBox())?.height).toBeCloseTo(234, 1)
  await widget.hover()
  await expect.poll(async () => page.locator('.widget__board').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(54, 1)
  await expect.poll(async () => page.locator('.gear-button img').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(15, 1)

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
    thumb: { x: 12, y: 0, width: 30, height: 234 },
    board: { x: 0, y: 18, width: 54, height: 198 },
    firstProvider: { x: 6, y: 24, width: 42, height: 42 },
    gear: { x: 20, y: 3.5, width: 15, height: 15 },
    grab: { x: 16.5, y: 220, width: 21, height: 9 }
  })

  await page.locator('.provider-item').first().hover()
  await expect(page.locator('[data-node-id="9:371"]')).toBeVisible()
  await expect(page.locator('.usage-popover__label').first()).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(page.locator('.usage-popover__percent')).toHaveText(['23%', '31%'])
  await expect(page.locator('.usage-popover__updated')).toContainText('Updated at')
  await expect(page.locator('.usage-popover__metadata')).toHaveCount(0)
  await expect(page.locator('.usage-popover__amount')).toHaveCount(0)
  const popover = page.locator('.usage-popover-anchor')
  let firstAnimationStart = -1
  await expect.poll(async () => {
    firstAnimationStart = await popover.evaluate((element) => {
      const startTime = element.getAnimations()[0]?.startTime
      return typeof startTime === 'number' ? startTime : -1
    })
    return firstAnimationStart
  }).toBeGreaterThanOrEqual(0)

  await page.locator('.provider-item').nth(1).hover()
  await expect(page.locator('.usage-popover__metadata')).toContainText('Plus plan')
  await expect(page.locator('.usage-popover__percent')).toHaveText(['55%', '42%'])

  await page.locator('.provider-item').nth(2).hover()
  await expect(page.locator('.usage-popover__metadata')).toContainText('Pro plan')
  await expect(page.locator('.usage-popover__amount')).toHaveText('16 / 20 used')

  await page.locator('.provider-item').last().hover()
  await expect(page.locator('[data-node-id="9:375"]')).toBeVisible()
  await expect.poll(async () => popover.evaluate((element, previousStart) => {
    const startTime = element.getAnimations()[0]?.startTime
    return typeof startTime === 'number' && startTime > previousStart
  }, firstAnimationStart)).toBe(true)
})

test('opens settings in a separate native window', async () => {
  const settingsWindow = await openSettingsWindow()
  const settings = settingsWindow.getByRole('complementary', { name: 'Settings' })
  await expect(settings).toBeVisible()
  expect(settingsWindow).not.toBe(page)
  expect(settingsWindow.url()).toContain('window=settings')
  const nativeWindowState = await electronApp.evaluate(({ BrowserWindow, screen }) => {
    const window = BrowserWindow.getAllWindows().find((candidate) => candidate.getTitle() === 'widoken settings')
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
  expect(nativeWindowState?.bounds.width).toBe(880)
  const expectedSettingsHeight = Math.min(590, (nativeWindowState?.workArea.height ?? 622) - 32)
  await expect.poll(async () => electronApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().find((candidate) => candidate.getTitle() === 'widoken settings')?.getBounds().height
  )).toBeCloseTo(expectedSettingsHeight, 0)
  await expect(page.getByRole('complementary', { name: 'Settings' })).toHaveCount(0)
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
  const navigation = settingsWindow.getByRole('navigation', { name: 'Settings sections' })
  await expect(navigation.getByRole('button')).toHaveCount(4)
  await expect(navigation.locator('svg')).toHaveCount(4)
  await expect(navigation.getByRole('button', { name: 'Appearance' })).toHaveAttribute('aria-current', 'page')
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
  const minimizeButton = settingsWindow.getByRole('button', { name: 'Minimize settings' })
  await expect(minimizeButton).toBeVisible()
  await expect(settingsWindow.locator('.settings-panel__app-icon')).toBeVisible()
  await expect(settingsWindow.locator('.settings-panel__mark')).toHaveCSS('border-top-width', '0px')
  await expect(settingsWindow.locator('.settings-window')).toHaveClass(/overlay-root--theme-dark-pastel/)
  await expect(settingsWindow.locator('.settings-window')).toHaveCSS('background-color', 'rgb(25, 26, 34)')
  await expect.poll(async () => settingsWindow.locator('.settings-window').evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--color-overlay-blue').trim()
  )).toBe('#e7e3f4')
  const appearanceShadowCheckbox = settingsWindow.getByRole('checkbox', { name: 'Enable shadows' })
  await expect(appearanceShadowCheckbox).toHaveCSS('background-color', 'rgb(231, 227, 244)')
  await expect.poll(async () => appearanceShadowCheckbox.evaluate((element) =>
    getComputedStyle(element, '::after').borderRightColor
  )).toBe('rgb(25, 26, 34)')

  const themeControl = settingsWindow.locator('.settings-control').filter({ hasText: 'Theme' })
  await themeControl.locator('.settings-select__trigger').click()
  await expect(themeControl.getByRole('option')).toHaveCount(11)
  await expect(themeControl.locator('.settings-select__menu')).not.toHaveCSS('box-shadow', 'none')
  const selectedOption = themeControl.locator('.settings-select__option--selected')
  const hoverOption = themeControl.locator('.settings-select__option:not(.settings-select__option--selected)').first()
  await expect(selectedOption).toHaveCSS('background-color', 'rgb(231, 227, 244)')
  await expect(selectedOption).toHaveCSS('color', 'rgb(25, 26, 34)')
  await hoverOption.hover()
  await expect(hoverOption).toHaveCSS('background-color', 'rgb(50, 52, 67)')
  await expect(hoverOption).toHaveCSS('color', 'rgb(244, 242, 248)')
  await themeControl.getByRole('option', { name: 'Dracula' }).click()
  await expect(page.locator('.overlay-root')).toHaveClass(/overlay-root--theme-dracula/)
  await expect(page.locator('.widget__board')).toHaveCSS('background-color', 'rgb(40, 42, 54)')
  await expect(settingsWindow.locator('.settings-window')).toHaveCSS('background-color', 'rgb(25, 26, 34)')
  await expect(appearanceShadowCheckbox).toHaveCSS('background-color', 'rgb(231, 227, 244)')
  await expect.poll(async () => appearanceShadowCheckbox.evaluate((element) =>
    getComputedStyle(element, '::after').borderRightColor
  )).toBe('rgb(25, 26, 34)')
  await themeControl.locator('.settings-select__trigger').click()
  const selectedDraculaOption = themeControl.getByRole('option', { name: 'Dracula' })
  await selectedDraculaOption.hover()
  await expect(selectedDraculaOption).toHaveCSS('background-color', 'rgb(231, 227, 244)')
  const darkPastelOption = themeControl.getByRole('option', { name: 'Dark Pastel' })
  await darkPastelOption.hover()
  await expect(darkPastelOption).toHaveCSS('background-color', 'rgb(50, 52, 67)')
  await themeControl.getByRole('option', { name: 'Dracula' }).click()

  await selectSettingsPage(settingsWindow, 'General')
  const startupCheckbox = settingsWindow.getByRole('checkbox', { name: 'Launch at startup' })
  await startupCheckbox.check()
  await expect.poll(async () => startupCheckbox.evaluate((element) =>
    getComputedStyle(element, '::after').borderRightColor
  )).toBe('rgb(25, 26, 34)')
  const localAnalyticsCheckbox = settingsWindow.getByRole('checkbox', { name: 'Local analytics' })
  await expect(localAnalyticsCheckbox).not.toBeChecked()
  await localAnalyticsCheckbox.check()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { desktop: { settings: { get: () => Promise<{ analytics: { localInsights: boolean } }> } } }).desktop.settings.get()
  ).then((settings) => settings.analytics.localInsights)).toBe(true)
  await localAnalyticsCheckbox.uncheck()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { desktop: { settings: { get: () => Promise<{ analytics: { localInsights: boolean } }> } } }).desktop.settings.get()
  ).then((settings) => settings.analytics.localInsights)).toBe(false)

  await selectSettingsPage(settingsWindow, 'Behavior')
  const dockingGuidesCheckbox = settingsWindow.getByRole('checkbox', { name: 'Docking guides' })
  await expect(dockingGuidesCheckbox).toBeChecked()
  await dockingGuidesCheckbox.uncheck()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { desktop: { settings: { get: () => Promise<{ widget: { showDockGuides: boolean } }> } } }).desktop.settings.get()
  ).then((settings) => settings.widget.showDockGuides)).toBe(false)
  await dockingGuidesCheckbox.check()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { desktop: { settings: { get: () => Promise<{ widget: { showDockGuides: boolean } }> } } }).desktop.settings.get()
  ).then((settings) => settings.widget.showDockGuides)).toBe(true)

  await selectSettingsPage(settingsWindow, 'Providers')
  await expect(settingsWindow.locator('.provider-setting__icon-shell').first()).not.toHaveCSS('background-color', 'rgb(8, 8, 8)')
  await selectSettingsPage(settingsWindow, 'Appearance')
  const shadowCheckbox = settingsWindow.getByRole('checkbox', { name: 'Enable shadows' })
  await expect(shadowCheckbox).toBeChecked()
  await expect(settingsWindow.locator('.settings-panel__section').first()).not.toHaveCSS('box-shadow', 'none')
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
  await expect.poll(async () => (await page.locator('.widget').boundingBox())?.height).toBeCloseTo(302.4, 0)
  await expect.poll(async () => (await page.locator('.widget').boundingBox())?.x).toBeCloseTo(widgetPositionBeforeScale?.x ?? 0, 0)
  await expect.poll(async () => (await page.locator('.widget').boundingBox())?.y).toBeCloseTo(widgetPositionBeforeScale?.y ?? 0, 0)
  await expect(page.locator('.widget')).toHaveCSS('transform', 'none')
  await expect.poll(async () => page.locator('.widget').evaluate((element) => getComputedStyle(element).zoom)).toBe('1.2')
  await expect.poll(async () => (await page.locator('.provider-item').first().boundingBox())?.width).toBeCloseTo(50.4, 1)
  await expect.poll(async () => (await page.locator('.usage-ring').first().boundingBox())?.width).toBeCloseTo(50.4, 1)
  await itemGap.fill('6')
  await widgetScale.fill('100')
  await expect.poll(async () => (await page.locator('.widget').boundingBox())?.height).toBeCloseTo(234, 0)
  await shadowCheckbox.uncheck()
  await expect(settingsWindow.locator('.settings-window')).toHaveClass(/overlay-root--shadows-disabled/)
  await expect(page.locator('.overlay-root')).toHaveClass(/overlay-root--shadows-disabled/)
  await expect(settingsWindow.locator('.settings-panel__section').first()).toHaveCSS('box-shadow', 'none')
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
  await expect.poll(async () => (await widget.boundingBox())?.width).toBeCloseTo(234, 1)
  await expect.poll(async () => (await widget.boundingBox())?.height).toBeCloseTo(54, 1)
  await widget.hover()
  await expect.poll(async () => page.locator('.widget__thumb').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(234, 1)
  await expect.poll(async () => page.locator('.gear-button img').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(15, 1)
  await expect.poll(async () => page.locator('.grab-handle img').evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(9, 1)

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
      lastProvider: relativeBox('.provider-item:last-child'),
      gear: relativeBox('.gear-button img'),
      grab: relativeBox('.grab-handle img')
    }
  })

  expectGeometryClose(geometry, {
    thumb: { x: 0, y: 12, width: 234, height: 30 },
    board: { x: 18, y: 0, width: 198, height: 54 },
    firstProvider: { x: 24, y: 6, width: 42, height: 42 },
    lastProvider: { x: 168, y: 6, width: 42, height: 42 },
    gear: { x: 5, y: 19.5, width: 15, height: 15 },
    grab: { x: 220, y: 16.5, width: 9, height: 21 }
  })
})

test('disables both docking guides and magnetic capture from settings', async () => {
  const settingsWindow = await openSettingsWindow()
  await selectSettingsPage(settingsWindow, 'Behavior')
  const dockingGuidesCheckbox = settingsWindow.getByRole('checkbox', { name: 'Docking guides' })
  await dockingGuidesCheckbox.uncheck()
  await expect.poll(async () => settingsWindow.evaluate(() =>
    (window as unknown as { desktop: { settings: { get: () => Promise<{ widget: { docked: boolean; showDockGuides: boolean } }> } } }).desktop.settings.get()
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
    (window as unknown as { desktop: { settings: { get: () => Promise<{ widget: { docked: boolean } }> } } }).desktop.settings.get()
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
  await expect(anchor).toBeVisible()
  await expect(anchor).toHaveCSS('animation-name', 'info-popover-in')
  await expect(anchor).toHaveCSS('animation-duration', '0.18s')
  await anchor.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })

  const geometry = await page.evaluate(() => {
    const widget = document.querySelector<HTMLElement>('.widget')!.getBoundingClientRect()
    const provider = document.querySelector<HTMLElement>('.provider-item:last-child')!.getBoundingClientRect()
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
    (window as unknown as { desktop: { settings: { get: () => Promise<{ widget: { showDockGuides: boolean } }> } } }).desktop.settings.get()
  ).then((settings) => settings.widget.showDockGuides)).toBe(true)
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
    (window as unknown as { desktop: { settings: { get: () => Promise<{ widget: { docked: boolean; side: string } }> } } }).desktop.settings.get()
  )
  expect(settings.widget.docked).toBe(false)

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
    (window as unknown as { desktop: { settings: { get: () => Promise<{ widget: { docked: boolean; side: string } }> } } }).desktop.settings.get()
  )
  expect(settings.widget.side).toBe('top')

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
    (window as unknown as { desktop: { settings: { get: () => Promise<{ widget: { docked: boolean; side: string } }> } } }).desktop.settings.get()
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
  await expect(page.locator('.widget')).toHaveClass(/widget--grab-turn-left/)
  await page.locator('.widget').hover({ position: { x: 27, y: 18 } })
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
    (window as unknown as { desktop: { settings: { get: () => Promise<{ widget: { docked: boolean; side: string } }> } } }).desktop.settings.get()
  )
  expect(settings.widget.docked).toBe(true)
  expect(settings.widget.side).toBe('right')

  await page.locator('.widget').hover()
  const settingsWindow = await openSettingsWindow()
  const settingsPanel = settingsWindow.getByRole('complementary', { name: 'Settings' })
  await expect(settingsPanel).toBeVisible()
  const expectedHeight = await settingsWindow.evaluate(() => window.innerHeight)
  await expect.poll(async () => Math.abs(((await settingsPanel.boundingBox())?.height ?? 0) - expectedHeight)).toBeLessThanOrEqual(1)
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
