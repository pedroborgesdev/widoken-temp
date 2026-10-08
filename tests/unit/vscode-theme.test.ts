import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  syncVsCodeTheme,
  vscodeConfigurationRoots,
  vscodeExtensionRoots
} from '../../src/main/themes/VsCodeThemeService'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { force: true, recursive: true })))
})

describe('VS Code theme discovery', () => {
  it('resolves configuration directories on Linux, Windows, and macOS', () => {
    expect(vscodeConfigurationRoots('linux', '/home/ada', {})).toContain('/home/ada/.config/Code')
    expect(vscodeConfigurationRoots('darwin', '/Users/ada', {})).toContain(
      '/Users/ada/Library/Application Support/Code'
    )
    expect(vscodeConfigurationRoots('win32', 'C:\\Users\\Ada', {
      APPDATA: 'C:\\Users\\Ada\\AppData\\Roaming'
    })).toContain('C:\\Users\\Ada\\AppData\\Roaming\\Code')
  })

  it('resolves user and built-in extension directories on every supported platform', () => {
    expect(vscodeExtensionRoots('linux', '/home/ada', {})).toContain('/home/ada/.vscode/extensions')
    expect(vscodeExtensionRoots('darwin', '/Users/ada', {})).toContain(
      '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions'
    )
    expect(vscodeExtensionRoots('win32', 'C:\\Users\\Ada', {
      LOCALAPPDATA: 'C:\\Users\\Ada\\AppData\\Local'
    })).toContain(
      'C:\\Users\\Ada\\AppData\\Local\\Programs\\Microsoft VS Code\\resources\\app\\extensions'
    )
  })

  it('loads JSONC themes, inherited colors, and user customizations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'widoken-vscode-theme-'))
    temporaryDirectories.push(root)
    const configurationRoot = join(root, 'Code')
    const extensionRoot = join(root, 'extensions')
    const extension = join(extensionRoot, 'fixture.theme-1.0.0')
    await mkdir(join(configurationRoot, 'User'), { recursive: true })
    await mkdir(join(extension, 'themes'), { recursive: true })
    await writeFile(join(configurationRoot, 'User', 'settings.json'), `{
      // VS Code settings use JSON with comments and trailing commas.
      "window.autoDetectColorScheme": true,
      "workbench.colorTheme": "Another Theme",
      "workbench.preferredDarkColorTheme": "Fixture Theme",
      "workbench.colorCustomizations": {
        "focusBorder": "#abcdef",
        "[Fixture Theme]": {
          "editor.background": "#101112",
        },
      },
    }`)
    await writeFile(join(extension, 'package.json'), JSON.stringify({
      contributes: {
        themes: [{ label: 'Fixture Theme', path: './themes/fixture.json', uiTheme: 'vs-dark' }]
      }
    }))
    await writeFile(join(extension, 'themes', 'base.json'), JSON.stringify({
      colors: {
        'editor.background': '#202122',
        'editor.foreground': '#f0f1f2',
        'sideBar.background': '#303132',
        'terminal.ansiGreen': '#00ff00'
      }
    }))
    await writeFile(join(extension, 'themes', 'fixture.json'), `{
      "include": "./base.json",
      "colors": {
        "list.hoverBackground": "#404142",
      },
    }`)

    const theme = await syncVsCodeTheme({
      configurationRoots: [configurationRoot],
      extensionRoots: [extensionRoot],
      preferredColorScheme: 'dark'
    })

    expect(theme).toMatchObject({
      colorScheme: 'dark',
      name: 'Fixture Theme',
      colors: {
        accent: '#abcdef',
        hover: '#404142',
        strong: '#f0f1f2',
        success: '#00ff00',
        surface: '#303132',
        text: '#f0f1f2'
      }
    })
    expect(theme.colors.thumb).toBe('#303132')
    expect(theme.colors.track).toBe('#454545')
  })

  it('keeps borders and the usage track visible when the theme border matches the background', async () => {
    const root = await mkdtemp(join(tmpdir(), 'widoken-vscode-flat-theme-'))
    temporaryDirectories.push(root)
    const configurationRoot = join(root, 'Code')
    const extensionRoot = join(root, 'extensions')
    const extension = join(extensionRoot, 'flat.theme-1.0.0')
    await mkdir(join(configurationRoot, 'User'), { recursive: true })
    await mkdir(join(extension, 'themes'), { recursive: true })
    await writeFile(join(configurationRoot, 'User', 'settings.json'), JSON.stringify({
      'workbench.colorTheme': 'Flat Theme'
    }))
    await writeFile(join(extension, 'package.json'), JSON.stringify({
      contributes: {
        themes: [{ label: 'Flat Theme', path: './themes/flat.json', uiTheme: 'vs-dark' }]
      }
    }))
    await writeFile(join(extension, 'themes', 'flat.json'), JSON.stringify({
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'sideBar.background': '#1e1e1e',
        'contrastBorder': '#1e1e1e',
        'panel.border': '#1e1e1e',
        'input.border': '#1e1e1e80',
        'sideBar.border': '#3c3c3c'
      }
    }))

    const theme = await syncVsCodeTheme({
      configurationRoots: [configurationRoot],
      extensionRoots: [extensionRoot]
    })

    expect(theme.colors.surface).toBe('#1e1e1e')
    expect(theme.colors.track.toLowerCase()).toBe('#3c3c3c')
  })

  it('derives a track color when every theme border matches the board', async () => {
    const root = await mkdtemp(join(tmpdir(), 'widoken-vscode-same-border-'))
    temporaryDirectories.push(root)
    const configurationRoot = join(root, 'Code')
    const extensionRoot = join(root, 'extensions')
    const extension = join(extensionRoot, 'same.theme-1.0.0')
    await mkdir(join(configurationRoot, 'User'), { recursive: true })
    await mkdir(join(extension, 'themes'), { recursive: true })
    await writeFile(join(configurationRoot, 'User', 'settings.json'), JSON.stringify({
      'workbench.colorTheme': 'Same Border Theme'
    }))
    await writeFile(join(extension, 'package.json'), JSON.stringify({
      contributes: {
        themes: [{ label: 'Same Border Theme', path: './themes/same.json', uiTheme: 'vs-dark' }]
      }
    }))
    await writeFile(join(extension, 'themes', 'same.json'), JSON.stringify({
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'sideBar.background': '#1e1e1e',
        'contrastBorder': '#1e1e1e',
        'panel.border': '#1e1e1e',
        'input.border': '#1e1e1e',
        'sideBar.border': '#1e1e1e'
      }
    }))

    const theme = await syncVsCodeTheme({
      configurationRoots: [configurationRoot],
      extensionRoots: [extensionRoot]
    })

    expect(theme.colors.surface).toBe('#1e1e1e')
    expect(theme.colors.track.toLowerCase()).not.toBe('#1e1e1e')
  })

  it('reports when the selected theme package cannot be located', async () => {
    const root = await mkdtemp(join(tmpdir(), 'widoken-vscode-missing-theme-'))
    temporaryDirectories.push(root)
    const configurationRoot = join(root, 'Code')
    await mkdir(join(configurationRoot, 'User'), { recursive: true })
    await writeFile(join(configurationRoot, 'User', 'settings.json'), JSON.stringify({
      'workbench.colorTheme': 'Missing Theme'
    }))

    await expect(syncVsCodeTheme({
      configurationRoots: [configurationRoot],
      extensionRoots: []
    })).rejects.toThrow('Missing Theme')
  })
})
