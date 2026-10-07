import { promises as fs } from 'node:fs'
import type { Dirent } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, posix, resolve, win32 } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SyncedThemeColors, SyncedVsCodeTheme } from '@shared/settings'

type JsonObject = Record<string, unknown>

interface ThemeContribution {
  id?: string
  label?: string
  path?: string
  uiTheme?: string
}

interface ThemeCandidate {
  contribution: ThemeContribution
  extensionPath: string
}

export interface VsCodeThemeSyncOptions {
  configurationRoots?: string[]
  extensionRoots?: string[]
  environment?: NodeJS.ProcessEnv
  homeDirectory?: string
  platform?: NodeJS.Platform
  preferredColorScheme?: 'dark' | 'light'
}

const PRODUCT_DIRECTORIES = ['Code', 'Code - Insiders', 'VSCodium'] as const
const EXTENSION_DIRECTORIES = ['.vscode/extensions', '.vscode-insiders/extensions', '.vscode-oss/extensions'] as const
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stripJsonComments(source: string): string {
  let result = ''
  let inString = false
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    const next = source[index + 1]

    if (lineComment) {
      if (character === '\n') {
        lineComment = false
        result += character
      } else {
        result += ' '
      }
      continue
    }

    if (blockComment) {
      if (character === '*' && next === '/') {
        result += '  '
        blockComment = false
        index += 1
      } else {
        result += character === '\n' ? '\n' : ' '
      }
      continue
    }

    if (inString) {
      result += character
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }

    if (character === '"') {
      inString = true
      result += character
    } else if (character === '/' && next === '/') {
      lineComment = true
      result += '  '
      index += 1
    } else if (character === '/' && next === '*') {
      blockComment = true
      result += '  '
      index += 1
    } else {
      result += character
    }
  }

  let withoutTrailingCommas = ''
  inString = false
  escaped = false
  for (let index = 0; index < result.length; index += 1) {
    const character = result[index]
    if (inString) {
      withoutTrailingCommas += character
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }
    if (character === '"') {
      inString = true
      withoutTrailingCommas += character
      continue
    }
    if (character === ',') {
      let nextIndex = index + 1
      while (/\s/.test(result[nextIndex] ?? '')) nextIndex += 1
      if (result[nextIndex] === '}' || result[nextIndex] === ']') continue
    }
    withoutTrailingCommas += character
  }
  return withoutTrailingCommas
}

async function readJsonObject(path: string): Promise<JsonObject | undefined> {
  try {
    const value: unknown = JSON.parse(stripJsonComments(await fs.readFile(path, 'utf8')))
    return isObject(value) ? value : undefined
  } catch {
    return undefined
  }
}

function unique(paths: Array<string | undefined>): string[] {
  return [...new Set(paths.filter((path): path is string => Boolean(path)))]
}

export function vscodeConfigurationRoots(
  platform: NodeJS.Platform,
  homeDirectory: string,
  environment: NodeJS.ProcessEnv
): string[] {
  const platformJoin = platform === 'win32' ? win32.join : posix.join
  const portable = environment.VSCODE_PORTABLE
    ? platformJoin(environment.VSCODE_PORTABLE, 'data', 'user-data')
    : undefined
  if (platform === 'win32') {
    const appData = environment.APPDATA ?? platformJoin(homeDirectory, 'AppData', 'Roaming')
    return unique([portable, ...PRODUCT_DIRECTORIES.map((product) => platformJoin(appData, product))])
  }
  if (platform === 'darwin') {
    const applicationSupport = platformJoin(homeDirectory, 'Library', 'Application Support')
    return unique([portable, ...PRODUCT_DIRECTORIES.map((product) => platformJoin(applicationSupport, product))])
  }
  const config = environment.XDG_CONFIG_HOME ?? platformJoin(homeDirectory, '.config')
  return unique([portable, ...PRODUCT_DIRECTORIES.map((product) => platformJoin(config, product))])
}

export function vscodeExtensionRoots(
  platform: NodeJS.Platform,
  homeDirectory: string,
  environment: NodeJS.ProcessEnv
): string[] {
  const platformJoin = platform === 'win32' ? win32.join : posix.join
  const userExtensions = EXTENSION_DIRECTORIES.map((path) => platformJoin(homeDirectory, path))
  const portableExtensions = environment.VSCODE_PORTABLE
    ? platformJoin(environment.VSCODE_PORTABLE, 'data', 'extensions')
    : undefined
  if (platform === 'win32') {
    const local = environment.LOCALAPPDATA ?? platformJoin(homeDirectory, 'AppData', 'Local')
    const programFiles = environment.ProgramFiles
    return unique([
      portableExtensions,
      ...userExtensions,
      platformJoin(local, 'Programs', 'Microsoft VS Code', 'resources', 'app', 'extensions'),
      platformJoin(local, 'Programs', 'Microsoft VS Code Insiders', 'resources', 'app', 'extensions'),
      platformJoin(local, 'Programs', 'VSCodium', 'resources', 'app', 'extensions'),
      programFiles ? platformJoin(programFiles, 'Microsoft VS Code', 'resources', 'app', 'extensions') : undefined
    ])
  }
  if (platform === 'darwin') {
    return unique([
      portableExtensions,
      ...userExtensions,
      '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions',
      '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/extensions',
      '/Applications/VSCodium.app/Contents/Resources/app/extensions',
      platformJoin(homeDirectory, 'Applications', 'Visual Studio Code.app', 'Contents', 'Resources', 'app', 'extensions')
    ])
  }
  return unique([
    portableExtensions,
    ...userExtensions,
    '/usr/share/code/resources/app/extensions',
    '/usr/share/code-insiders/resources/app/extensions',
    '/usr/share/codium/resources/app/extensions',
    '/usr/lib/code/resources/app/extensions',
    '/opt/visual-studio-code/resources/app/extensions',
    '/snap/code/current/usr/share/code/resources/app/extensions'
  ])
}

async function configurationFiles(roots: string[]): Promise<string[]> {
  const files: string[] = []
  for (const root of roots) {
    const userDirectory = join(root, 'User')
    files.push(join(userDirectory, 'settings.json'))
    try {
      const profiles = await fs.readdir(join(userDirectory, 'profiles'), { withFileTypes: true })
      for (const profile of profiles) {
        if (profile.isDirectory()) files.push(join(userDirectory, 'profiles', profile.name, 'settings.json'))
      }
    } catch {
      // This VS Code product has no profiles yet.
    }
  }
  return files
}

function activeWorkspaceUri(storage: JsonObject): string | undefined {
  const windowsState = isObject(storage.windowsState) ? storage.windowsState : undefined
  const lastWindow = isObject(windowsState?.lastActiveWindow) ? windowsState.lastActiveWindow : undefined
  if (typeof lastWindow?.folder === 'string') return lastWindow.folder
  if (typeof lastWindow?.workspace === 'string') return lastWindow.workspace
  if (isObject(lastWindow?.workspace) && typeof lastWindow.workspace.configPath === 'string') {
    return lastWindow.workspace.configPath
  }
  return undefined
}

function activeProfileId(storage: JsonObject, workspaceUri: string | undefined): string | undefined {
  if (!workspaceUri) return undefined
  const associations = isObject(storage.profileAssociations) ? storage.profileAssociations : undefined
  const workspaces = isObject(associations?.workspaces) ? associations.workspaces : undefined
  const profile = workspaces?.[workspaceUri]
  return typeof profile === 'string' && profile !== '__default__profile__' ? profile : undefined
}

async function workspaceSettings(workspaceUri: string | undefined): Promise<JsonObject> {
  if (!workspaceUri?.startsWith('file:')) return {}
  try {
    const path = fileURLToPath(workspaceUri)
    if (path.endsWith('.code-workspace')) {
      const workspace = await readJsonObject(path)
      return isObject(workspace?.settings) ? workspace.settings : {}
    }
    return await readJsonObject(join(path, '.vscode', 'settings.json')) ?? {}
  } catch {
    return {}
  }
}

async function modifiedAt(paths: string[]): Promise<number> {
  const values = await Promise.all(paths.map(async (path) => {
    try {
      return (await fs.stat(path)).mtimeMs
    } catch {
      return 0
    }
  }))
  return Math.max(0, ...values)
}

async function rootConfiguration(
  root: string,
  preferredColorScheme?: 'dark' | 'light'
): Promise<{ modifiedAt: number, name: string, path: string, settings: JsonObject } | undefined> {
  const userDirectory = join(root, 'User')
  const userSettingsPath = join(userDirectory, 'settings.json')
  const storagePath = join(userDirectory, 'globalStorage', 'storage.json')
  const storage = await readJsonObject(storagePath) ?? {}
  const workspaceUri = activeWorkspaceUri(storage)
  const profileId = activeProfileId(storage, workspaceUri)
  const profileSettingsPath = profileId ? join(userDirectory, 'profiles', profileId, 'settings.json') : undefined
  const settings = {
    ...(await readJsonObject(userSettingsPath) ?? {}),
    ...(profileSettingsPath ? await readJsonObject(profileSettingsPath) ?? {} : {}),
    ...(await workspaceSettings(workspaceUri))
  }
  const name = configuredThemeName(settings, preferredColorScheme)
  if (!name) return undefined
  return {
    modifiedAt: await modifiedAt([storagePath, userSettingsPath, ...(profileSettingsPath ? [profileSettingsPath] : [])]),
    name,
    path: profileSettingsPath ?? userSettingsPath,
    settings
  }
}

function configuredThemeName(settings: JsonObject, preferredColorScheme?: 'dark' | 'light'): string | undefined {
  if (settings['window.autoDetectColorScheme'] === true && preferredColorScheme) {
    const preferred = settings[
      preferredColorScheme === 'dark' ? 'workbench.preferredDarkColorTheme' : 'workbench.preferredLightColorTheme'
    ]
    if (typeof preferred === 'string' && preferred.trim()) return preferred.trim()
  }
  const selected = settings['workbench.colorTheme']
  return typeof selected === 'string' && selected.trim() ? selected.trim() : undefined
}

async function activeConfiguration(
  roots: string[],
  preferredColorScheme?: 'dark' | 'light'
): Promise<{ name: string, path: string, settings: JsonObject }> {
  const activeRoots = (await Promise.all(roots.map((root) => rootConfiguration(root, preferredColorScheme))))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
  if (activeRoots[0]) return activeRoots[0]

  // Older VS Code builds may have profile settings without the active-window
  // metadata. In that case, the most recently edited profile is the best
  // available local signal.
  const candidates = await Promise.all((await configurationFiles(roots)).map(async (path) => {
    const settings = await readJsonObject(path)
    if (!settings) return undefined
    const name = configuredThemeName(settings, preferredColorScheme)
    if (!name) return undefined
    try {
      return { modifiedAt: (await fs.stat(path)).mtimeMs, name, path, settings }
    } catch {
      return undefined
    }
  }))
  const selected = candidates
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0]
  if (!selected) throw new Error('No VS Code color theme was found in user or profile settings.')
  return selected
}

async function themeCandidates(extensionRoots: string[]): Promise<ThemeCandidate[]> {
  const candidates: ThemeCandidate[] = []
  for (const root of extensionRoots) {
    let directories: Dirent<string>[]
    try {
      directories = await fs.readdir(root, { withFileTypes: true })
    } catch {
      continue
    }
    for (const directory of directories) {
      if (!directory.isDirectory()) continue
      const extensionPath = join(root, directory.name)
      const manifest = await readJsonObject(join(extensionPath, 'package.json'))
      const contributes = isObject(manifest?.contributes) ? manifest.contributes : undefined
      if (!Array.isArray(contributes?.themes)) continue
      for (const contribution of contributes.themes) {
        if (isObject(contribution) && typeof contribution.path === 'string') {
          candidates.push({ contribution: contribution as ThemeContribution, extensionPath })
        }
      }
    }
  }
  return candidates
}

function contributionMatches(contribution: ThemeContribution, selectedTheme: string): boolean {
  const normalized = selectedTheme.trim().toLocaleLowerCase()
  return [contribution.label, contribution.id]
    .filter((value): value is string => typeof value === 'string')
    .some((value) => value.trim().toLocaleLowerCase() === normalized)
}

async function loadThemeFile(path: string, visited = new Set<string>()): Promise<JsonObject> {
  const absolutePath = resolve(path)
  if (visited.has(absolutePath)) return {}
  visited.add(absolutePath)
  const theme = await readJsonObject(absolutePath)
  if (!theme) throw new Error(`The VS Code theme file could not be read: ${absolutePath}`)
  const inherited = typeof theme.include === 'string'
    ? await loadThemeFile(resolve(dirname(absolutePath), theme.include), visited)
    : {}
  return {
    ...inherited,
    ...theme,
    colors: {
      ...(isObject(inherited.colors) ? inherited.colors : {}),
      ...(isObject(theme.colors) ? theme.colors : {})
    }
  }
}

function scopedCustomizations(value: unknown, themeName: string): JsonObject {
  if (!isObject(value)) return {}
  const colors: JsonObject = {}
  for (const [key, color] of Object.entries(value)) {
    if (!key.startsWith('[')) colors[key] = color
  }
  for (const [key, customization] of Object.entries(value)) {
    const names = [...key.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1])
    if (names.some((name) => name.toLocaleLowerCase() === themeName.toLocaleLowerCase()) && isObject(customization)) {
      Object.assign(colors, customization)
    }
  }
  return colors
}

function color(colors: JsonObject, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = colors[key]
    if (typeof value === 'string' && HEX_COLOR.test(value)) return value
  }
  return fallback
}

function toPalette(colors: JsonObject, dark: boolean): SyncedThemeColors {
  const background = color(colors, ['editor.background'], dark ? '#1e1e1e' : '#ffffff')
  const surface = color(colors, ['sideBar.background', 'panel.background'], background)
  const text = color(colors, ['foreground', 'editor.foreground'], dark ? '#cccccc' : '#333333')
  const strong = color(colors, ['editor.foreground', 'foreground'], text)
  const accent = color(colors, ['focusBorder', 'button.background', 'activityBarBadge.background'], '#007acc')
  return {
    accent,
    danger: color(colors, ['errorForeground', 'terminal.ansiRed', 'editorError.foreground'], '#f14c4c'),
    elevated: color(colors, ['dropdown.background', 'input.background', 'quickInput.background'], surface),
    hover: color(colors, ['list.hoverBackground', 'toolbar.hoverBackground'], dark ? '#2a2d2e' : '#e8e8e8'),
    muted: color(colors, ['descriptionForeground', 'disabledForeground'], dark ? '#8c8c8c' : '#717171'),
    onAccent: color(colors, ['button.foreground', 'activityBarBadge.foreground'], '#ffffff'),
    shadow: color(colors, ['widget.shadow'], '#000000'),
    strong,
    success: color(colors, ['terminal.ansiGreen', 'testing.iconPassed'], '#73c991'),
    surface,
    text,
    thumb: surface,
    track: color(colors, ['contrastBorder', 'panel.border', 'input.border'], dark ? '#454545' : '#cecece'),
    warning: color(colors, ['terminal.ansiYellow', 'editorWarning.foreground'], '#cca700')
  }
}

export async function syncVsCodeTheme(options: VsCodeThemeSyncOptions = {}): Promise<SyncedVsCodeTheme> {
  const platform = options.platform ?? process.platform
  const homeDirectory = options.homeDirectory ?? homedir()
  const environment = options.environment ?? process.env
  const configurationRoots = options.configurationRoots
    ?? vscodeConfigurationRoots(platform, homeDirectory, environment)
  const extensionRoots = options.extensionRoots
    ?? vscodeExtensionRoots(platform, homeDirectory, environment)
  const { name, settings } = await activeConfiguration(configurationRoots, options.preferredColorScheme)
  const candidate = (await themeCandidates(extensionRoots)).find(({ contribution }) =>
    contributionMatches(contribution, name)
  )
  if (!candidate?.contribution.path) {
    throw new Error(`VS Code theme “${name}” is active, but its theme file was not found.`)
  }

  const theme = await loadThemeFile(resolve(candidate.extensionPath, candidate.contribution.path))
  const baseColors = isObject(theme.colors) ? theme.colors : {}
  const customColors = scopedCustomizations(settings['workbench.colorCustomizations'], name)
  const uiTheme = candidate.contribution.uiTheme ?? ''
  const dark = uiTheme !== 'vs' && !uiTheme.toLocaleLowerCase().includes('light')
  return {
    colorScheme: dark ? 'dark' : 'light',
    colors: toPalette({ ...baseColors, ...customColors }, dark),
    name
  }
}
