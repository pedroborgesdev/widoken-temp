import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cursorStateDatabasePath } from '../../src/main/providers/cursorStorage'

describe('Cursor storage path', () => {
  it('uses the roaming application data directory on Windows', () => {
    expect(cursorStateDatabasePath('win32', 'C:\\Users\\person', 'D:\\Profiles\\person\\Roaming')).toBe(
      join('D:\\Profiles\\person\\Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb')
    )
  })

  it('falls back to the conventional roaming directory on Windows', () => {
    expect(cursorStateDatabasePath('win32', 'C:\\Users\\person', '')).toBe(
      join('C:\\Users\\person', 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb')
    )
  })

  it('uses the XDG-style Cursor directory on Linux', () => {
    expect(cursorStateDatabasePath('linux', '/home/person')).toBe(
      join('/home/person', '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb')
    )
  })

  it('uses Application Support on macOS', () => {
    expect(cursorStateDatabasePath('darwin', '/Users/person')).toBe(
      join('/Users/person', 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb')
    )
  })
})
