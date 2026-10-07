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
  it('offers eleven supported themes and keeps the default valid', () => {
    expect(APP_THEMES).toHaveLength(11)
    expect(new Set(APP_THEMES).size).toBe(APP_THEMES.length)
    expect(APP_THEMES).toContain(DEFAULT_SETTINGS.widget.theme)
    expect(APP_THEMES).toContain('dark-pastel')
  })
})

describe('widget lifecycle settings', () => {
  it('starts with the widget enabled', () => {
    expect(DEFAULT_SETTINGS.widget.enabled).toBe(true)
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
