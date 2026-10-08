import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SettingsRepository } from '../../src/main/settings/SettingsRepository'
import { APP_THEMES, DEFAULT_SETTINGS } from '../../src/shared/settings'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('application themes', () => {
  it('offers eleven supported themes and uses Monokai Black by default', () => {
    expect(APP_THEMES).toHaveLength(11)
    expect(new Set(APP_THEMES).size).toBe(APP_THEMES.length)
    expect(APP_THEMES).toContain(DEFAULT_SETTINGS.widget.theme)
    expect(APP_THEMES[0]).toBe('monokai-black')
    expect(DEFAULT_SETTINGS.widget.theme).toBe('monokai-black')
  })

  it('migrates a saved unsupported theme to Monokai Black', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({ widget: { theme: 'removed-theme' } }))

    const settings = await new SettingsRepository(path).get()

    expect(settings.widget.theme).toBe('monokai-black')
  })
})

describe('widget lifecycle settings', () => {
  it('starts with the widget enabled', () => {
    expect(DEFAULT_SETTINGS.widget.enabled).toBe(true)
  })

  it('remembers the display the widget was dropped on', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    const updated = await new SettingsRepository(path).update({ display: { id: 42 } })
    const reloaded = await new SettingsRepository(path).get()

    expect(updated.display).toEqual({ id: 42 })
    expect(reloaded.display).toEqual({ id: 42 })
  })
})

describe('general settings', () => {
  it('keeps the dashboard closed and on its own theme by default', () => {
    expect(DEFAULT_SETTINGS.openDashboardAtStartup).toBe(false)
    expect(DEFAULT_SETTINGS.dashboardFollowsWidgetTheme).toBe(false)
  })

  it('persists the general options and rejects non-boolean values', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    const repository = new SettingsRepository(path)

    const updated = await repository.update({ openDashboardAtStartup: true, dashboardFollowsWidgetTheme: true })
    expect(updated.openDashboardAtStartup).toBe(true)
    expect(updated.dashboardFollowsWidgetTheme).toBe(true)
    expect((await new SettingsRepository(path).get()).dashboardFollowsWidgetTheme).toBe(true)

    await writeFile(path, JSON.stringify({ openDashboardAtStartup: 'yes', dashboardFollowsWidgetTheme: 1 }))
    const sanitized = await new SettingsRepository(path).get()
    expect(sanitized.openDashboardAtStartup).toBe(false)
    expect(sanitized.dashboardFollowsWidgetTheme).toBe(false)
  })
})

describe('provider usage settings', () => {
  it('adds predefined usage displays to settings saved before split rings existed', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({
      providers: DEFAULT_SETTINGS.providers.map(({ id, enabled, order }) => ({ id, enabled, order }))
    }))

    const settings = await new SettingsRepository(path).get()

    expect(settings.providers.find(({ id }) => id === 'openai')?.usageDisplay).toEqual({
      split: true,
      primaryLimitId: 'primary',
      secondaryLimitId: 'secondary'
    })
    expect(settings.providers.find(({ id }) => id === 'cursor')?.usageDisplay).toEqual({
      split: true,
      primaryLimitId: 'auto',
      secondaryLimitId: 'api'
    })
  })
})
