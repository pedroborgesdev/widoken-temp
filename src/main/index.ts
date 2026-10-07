import { app } from 'electron'
import { AppController } from './application/AppController'

if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland') {
  app.commandLine.appendSwitch('ozone-platform', process.env.WIDOKEN_OZONE_PLATFORM ?? 'wayland')
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  const controller = new AppController()
  let isFinishingQuit = false

  app.on('second-instance', () => {
    void controller.handleSecondInstance()
  })

  void app.whenReady().then(() => controller.start()).catch((error: unknown) => {
    console.error('Could not start widoken:', error)
    app.quit()
  })

  app.on('window-all-closed', () => app.quit())
  app.on('before-quit', (event) => {
    if (isFinishingQuit) return
    event.preventDefault()
    isFinishingQuit = true
    void controller.stop().finally(() => app.exit(0))
  })
}
