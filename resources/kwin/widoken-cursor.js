let widokenPid = -1
let overlayLayouts = {}

function parseLayouts(payload) {
  const layouts = {}
  const rows = String(payload || '').split(';')
  for (let index = 0; index < rows.length; index += 1) {
    if (!rows[index]) continue
    const fields = rows[index].split('|')
    if (fields.length < 5) continue
    const height = Number(fields.pop())
    const width = Number(fields.pop())
    const y = Number(fields.pop())
    const x = Number(fields.pop())
    const caption = fields.join('|')
    if (!caption || !isFinite(x) || !isFinite(y) || !isFinite(width) || !isFinite(height)) continue
    layouts[caption] = { x: x, y: y, width: width, height: height }
  }
  return layouts
}

function kwinScreens() {
  if (workspace.screens && workspace.screens.length) {
    const screens = []
    for (let index = 0; index < workspace.screens.length; index += 1) {
      const geometry = workspace.screens[index].geometry
      if (!geometry) continue
      screens.push({ x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height })
    }
    return screens
  }

  const count = workspace.numScreens || 0
  const area = typeof KWin !== 'undefined' && KWin.ScreenArea !== undefined ? KWin.ScreenArea : 7
  const screens = []
  for (let index = 0; index < count; index += 1) {
    const geometry = workspace.clientArea(area, index, workspace.currentDesktop)
    if (!geometry) continue
    screens.push({ x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height })
  }
  return screens
}

function layoutsAreStacked() {
  const captions = Object.keys(overlayLayouts)
  if (captions.length < 2) return false
  const origin = overlayLayouts[captions[0]]
  return captions.every(function (caption) {
    const layout = overlayLayouts[caption]
    return layout.x === origin.x && layout.y === origin.y
  })
}

function geometryFor(window) {
  const layout = overlayLayouts[window.caption]
  if (!layout) return null
  if (!layoutsAreStacked()) return layout

  const screens = kwinScreens().slice().sort(function (left, right) {
    return left.x - right.x || left.y - right.y
  })
  const captions = Object.keys(overlayLayouts).sort(function (left, right) {
    return left < right ? -1 : left > right ? 1 : 0
  })
  const index = captions.indexOf(window.caption)
  if (index < 0 || index >= screens.length) return layout
  return screens[index]
}

function applyTargetGeometry(window) {
  const targetGeometry = geometryFor(window)
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
    Math.round(geometry.height),
    window.caption
  )
}

function isWidokenOverlay(window) {
  return window.pid === widokenPid &&
    typeof window.caption === 'string' &&
    window.caption.indexOf('widoken overlay') === 0
}

function configureWidokenWindow(window) {
  if (!isWidokenOverlay(window)) return

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
      'GetOverlayLayout',
      function (payload) {
        overlayLayouts = parseLayouts(payload)
        configureExistingWindows()
      }
    )
  }
)
publishCursorPosition()
