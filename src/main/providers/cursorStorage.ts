import { homedir } from 'node:os'
import { join } from 'node:path'

const CURSOR_DATABASE_SEGMENTS = ['Cursor', 'User', 'globalStorage', 'state.vscdb'] as const

export function cursorStateDatabasePath(
  platform: NodeJS.Platform = process.platform,
  userHome = homedir(),
  roamingAppData = process.env.APPDATA
): string {
  if (platform === 'win32') {
    return join(roamingAppData || join(userHome, 'AppData', 'Roaming'), ...CURSOR_DATABASE_SEGMENTS)
  }

  if (platform === 'darwin') {
    return join(userHome, 'Library', 'Application Support', ...CURSOR_DATABASE_SEGMENTS)
  }

  return join(userHome, '.config', ...CURSOR_DATABASE_SEGMENTS)
}
