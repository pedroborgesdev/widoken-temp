import { homedir } from 'node:os'
import { posix, win32 } from 'node:path'

/** Antigravity keeps shared IDE and CLI state below ~/.gemini on every supported OS. */
export function antigravityDataRoot(
  platform: NodeJS.Platform = process.platform,
  userHome: string = homedir()
): string {
  const path = platform === 'win32' ? win32 : posix
  return path.join(userHome, '.gemini', 'antigravity')
}
