let widokenPid = -1
let targetGeometry = null
const overlayTitle = 'widoken overlay'

function applyTargetGeometry(window) {
  if (targetGeometry === null) return

  const geometry = window.frameGeometry
  if (
    Math.round(geometry.x) === targetGeometry.x &&
    Math.round(geometry.y) === targetGeometry.y &&
    Math.round(geometry.width) === targetGeometry.width &&
    Math.round(geometry.height) === targetGeometry.height
  ) return

  window.frameGeometry = targetGeometry
}

function reportWindowState(window) {
  const geometry = window.frameGeometry
  callDBus(
    'dev.widoken.Cursor',
    '/dev/widoken/Cursor',
    'dev.widoken.Cursor',
    'WindowConfigured',
    window.pid,
    window.keepAbove,
    Math.round(geometry.x),
    Math.round(geometry.y),
    Math.round(geometry.width),
    Math.round(geometry.height)
  )
}

function configureWidokenWindow(window) {
  if (window.pid !== widokenPid || window.caption !== overlayTitle) return

  window.keepBelow = false
  window.keepAbove = true
  window.skipTaskbar = true
  applyTargetGeometry(window)
  window.keepAboveChanged.connect(function () {
    if (!window.keepAbove) window.keepAbove = true
    reportWindowState(window)
  })
  window.skipTaskbarChanged.connect(function () {
    if (!window.skipTaskbar) window.skipTaskbar = true
  })
  window.frameGeometryChanged.connect(function () {
    reportWindowState(window)
  })
  reportWindowState(window)
}

function configureExistingWindows() {
  const windows = workspace.stackingOrder
  for (let index = 0; index < windows.length; index += 1) configureWidokenWindow(windows[index])
}

function publishCursorPosition() {
  const position = workspace.cursorPos
  callDBus(
    'dev.widoken.Cursor',
    '/dev/widoken/Cursor',
    'dev.widoken.Cursor',
    'UpdateCursor',
    position.x,
    position.y
  )
}

workspace.cursorPosChanged.connect(publishCursorPosition)
workspace.windowAdded.connect(configureWidokenWindow)
callDBus(
  'dev.widoken.Cursor',
  '/dev/widoken/Cursor',
  'dev.widoken.Cursor',
  'GetProcessId',
  function (pid) {
    widokenPid = pid
    callDBus(
      'dev.widoken.Cursor',
      '/dev/widoken/Cursor',
      'dev.widoken.Cursor',
      'GetTargetGeometry',
      function (x, y, width, height) {
        targetGeometry = { x: x, y: y, width: width, height: height }
        configureExistingWindows()
      }
    )
  }
)
publishCursorPosition()
