import { app } from 'electron'
import { join } from 'node:path'

export function appIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'widoken-taskbar.png')
    : join(app.getAppPath(), 'resources', 'widoken-taskbar.png')
}
