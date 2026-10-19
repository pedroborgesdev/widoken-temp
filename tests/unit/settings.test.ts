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

  it('dims unavailable icons and enables edge tuck by default', () => {
    expect(DEFAULT_SETTINGS.widget.unavailableStyle).toBe('dim')
    expect(DEFAULT_SETTINGS.widget.edgeTuck).toBe(true)
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

  it('keeps the default position when older settings omit position fields', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({ widget: { theme: 'dark' } }))

    const settings = await new SettingsRepository(path).get()

    expect(settings.widget.horizontalPosition).toBe(DEFAULT_SETTINGS.widget.horizontalPosition)
    expect(settings.widget.verticalPosition).toBe(DEFAULT_SETTINGS.widget.verticalPosition)
  })

  it('uses defaults instead of coercing null numeric settings to zero', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({
      widget: {
        horizontalPosition: null,
        verticalPosition: null,
        itemGap: null,
        scale: null,
        shadowOpacity: null
      }
    }))

    const settings = await new SettingsRepository(path).get()

    expect(settings.widget.horizontalPosition).toBe(DEFAULT_SETTINGS.widget.horizontalPosition)
    expect(settings.widget.verticalPosition).toBe(DEFAULT_SETTINGS.widget.verticalPosition)
    expect(settings.widget.itemGap).toBe(DEFAULT_SETTINGS.widget.itemGap)
    expect(settings.widget.scale).toBe(DEFAULT_SETTINGS.widget.scale)
    expect(settings.widget.shadowOpacity).toBe(DEFAULT_SETTINGS.widget.shadowOpacity)
  })
})

describe('general settings', () => {
  it('launches at startup and keeps the dashboard on its own theme by default', () => {
    expect(DEFAULT_SETTINGS.launchAtStartup).toBe(true)
    expect(DEFAULT_SETTINGS.dashboardFollowsWidgetTheme).toBe(false)
  })

  it('persists the general options and rejects non-boolean values', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    const repository = new SettingsRepository(path)

    const updated = await repository.update({ launchAtStartup: false, dashboardFollowsWidgetTheme: true })
    expect(updated.launchAtStartup).toBe(false)
    expect(updated.dashboardFollowsWidgetTheme).toBe(true)
    expect((await new SettingsRepository(path).get()).dashboardFollowsWidgetTheme).toBe(true)

    await writeFile(path, JSON.stringify({ launchAtStartup: 'yes', dashboardFollowsWidgetTheme: 1 }))
    const sanitized = await new SettingsRepository(path).get()
    expect(sanitized.launchAtStartup).toBe(true)
    expect(sanitized.dashboardFollowsWidgetTheme).toBe(false)
  })

  it('serializes concurrent updates without losing unrelated fields', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    const repository = new SettingsRepository(path)
    await repository.get()

    await Promise.all([
      repository.update({ widget: { theme: 'dracula' } }),
      repository.update({ widget: { itemGap: 14 } }),
      repository.update({ launchAtStartup: false })
    ])

    const settings = await new SettingsRepository(path).get()
    expect(settings.widget.theme).toBe('dracula')
    expect(settings.widget.itemGap).toBe(14)
    expect(settings.launchAtStartup).toBe(false)
  })

  it('drops the retired configurable refresh interval from older settings', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({ refreshIntervalSeconds: 300 }))

    const settings = await new SettingsRepository(path).get()

    expect(settings).not.toHaveProperty('refreshIntervalSeconds')
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

  it('adds DeepSeek globally enabled but widget-hidden to older settings', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({
      providers: DEFAULT_SETTINGS.providers
        .filter(({ id }) => id !== 'deepseek')
        .map(({ id, enabled, order, usageDisplay }) => ({ id, enabled, order, usageDisplay }))
    }))

    const settings = await new SettingsRepository(path).get()

    expect(settings.providers.find(({ id }) => id === 'deepseek')).toEqual({
      id: 'deepseek',
      enabled: true,
      visibleInWidget: false,
      order: 5,
      usageDisplay: { split: true, primaryLimitId: 'balance-usd', secondaryLimitId: 'balance-cny' },
      credentialSource: 'auto'
    })
  })

  it('adds Hugging Face globally enabled but widget-hidden to older settings', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({
      providers: DEFAULT_SETTINGS.providers
        .filter(({ id }) => id !== 'huggingface')
        .map(({ id, enabled, order, usageDisplay }) => ({ id, enabled, order, usageDisplay }))
    }))

    const settings = await new SettingsRepository(path).get()

    expect(settings.providers.at(-1)).toEqual({
      id: 'huggingface',
      enabled: true,
      visibleInWidget: false,
      order: 6,
      usageDisplay: { split: false, primaryLimitId: 'balance-usd' }
    })
  })

  it('migrates legacy provider enabled state to widget visibility', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({
      providers: DEFAULT_SETTINGS.providers.map(({ id, enabled, order, usageDisplay }) => ({
        id,
        enabled: id === 'deepseek' ? false : enabled,
        order,
        usageDisplay
      }))
    }))

    const settings = await new SettingsRepository(path).get()

    expect(settings.providers.find(({ id }) => id === 'openai')).toMatchObject({
      enabled: true,
      visibleInWidget: true
    })
    expect(settings.providers.find(({ id }) => id === 'deepseek')).toMatchObject({
      enabled: false,
      visibleInWidget: false
    })
  })

  it('forces widget visibility off when a provider is globally disabled', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({
      providers: DEFAULT_SETTINGS.providers.map((provider) =>
        provider.id === 'openai'
          ? { ...provider, enabled: false, visibleInWidget: true }
          : provider
      )
    }))

    const settings = await new SettingsRepository(path).get()

    expect(settings.providers.find(({ id }) => id === 'openai')).toMatchObject({
      enabled: false,
      visibleInWidget: false
    })
  })

  it('drops the legacy external-browser selection from Hugging Face settings', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    const withBrowser = (huggingFaceBrowser: string) => ({
      providers: DEFAULT_SETTINGS.providers.map((provider) =>
        provider.id === 'huggingface' ? { ...provider, huggingFaceBrowser } : provider
      )
    })
    await writeFile(path, JSON.stringify(withBrowser('firefox')))
    const huggingFace = (await new SettingsRepository(path).get()).providers.find(({ id }) => id === 'huggingface')
    expect(huggingFace).toBeDefined()
    expect(huggingFace).not.toHaveProperty('huggingFaceBrowser')
  })

  it('defaults the DeepSeek credential source to auto and sanitizes invalid values', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({
      providers: DEFAULT_SETTINGS.providers.map((provider) => (
        provider.id === 'deepseek'
          ? { ...provider, credentialSource: 'api-key' }
          : provider
      ))
    }))

    const explicit = await new SettingsRepository(path).get()
    expect(explicit.providers.find(({ id }) => id === 'deepseek')?.credentialSource).toBe('api-key')

    await writeFile(path, JSON.stringify({
      providers: DEFAULT_SETTINGS.providers.map((provider) => (
        provider.id === 'deepseek'
          ? { ...provider, credentialSource: 'carrier-pigeon' }
          : { ...provider, credentialSource: 'api-key' }
      ))
    }))
    const sanitized = await new SettingsRepository(path).get()
    expect(sanitized.providers.find(({ id }) => id === 'deepseek')?.credentialSource).toBe('auto')
    expect(sanitized.providers.find(({ id }) => id === 'claude')).not.toHaveProperty('credentialSource')
  })

  it('ships every provider globally enabled by default', () => {
    expect(DEFAULT_SETTINGS.providers.every(({ enabled }) => enabled)).toBe(true)
    expect(DEFAULT_SETTINGS.providers.find(({ id }) => id === 'deepseek')).toMatchObject({ order: 5 })
  })

  it('runs widget discovery only for a genuinely new installation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    const fresh = await new SettingsRepository(path).get()
    expect(fresh.widgetProviderDiscoveryCompleted).toBe(false)

    await writeFile(path, JSON.stringify({ providers: [] }))
    const existing = await new SettingsRepository(path).get()
    expect(existing.widgetProviderDiscoveryCompleted).toBe(true)
  })

  it('preserves an explicitly enabled DeepSeek setting', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    await writeFile(path, JSON.stringify({
      providers: DEFAULT_SETTINGS.providers.map((provider) => (
        provider.id === 'deepseek' ? { ...provider, enabled: true } : provider
      ))
    }))

    const settings = await new SettingsRepository(path).get()

    expect(settings.providers.find(({ id }) => id === 'deepseek')?.enabled).toBe(true)
  })
})

describe('resetting settings', () => {
  const changedSettings = {
    widget: {
      theme: 'dracula',
      itemGap: 12,
      scale: 130,
      orientation: 'horizontal',
      side: 'right',
      docked: false,
      edgeTuck: false,
      shadows: false,
      enabled: false
    },
    display: { id: 7 },
    providers: DEFAULT_SETTINGS.providers.map((provider) => ({ ...provider, visibleInWidget: false })),
    launchAtStartup: false,
    dashboardFollowsWidgetTheme: true
  } as const

  it('restores every default value and persists it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')
    // A settings file without the discovery field marks an existing installation.
    await writeFile(path, JSON.stringify({ widget: { theme: 'dark' } }))
    const repository = new SettingsRepository(path)
    await repository.update(changedSettings)

    const reset = await repository.reset()
    const reloaded = await new SettingsRepository(path).get()

    expect(reset).toEqual({ ...DEFAULT_SETTINGS, widgetProviderDiscoveryCompleted: true })
    expect(reloaded).toEqual(reset)
  })

  it('leaves first-run discovery pending for a brand new installation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'widoken-settings-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'settings.json')

    const reset = await new SettingsRepository(path).reset()

    expect(reset).toEqual(DEFAULT_SETTINGS)
    expect(reset.widgetProviderDiscoveryCompleted).toBe(false)
  })
})
