import { app, type Point, type Rectangle } from 'electron'
import * as dbus from 'dbus-native'
import { join } from 'node:path'
import { serializeOverlayLayouts, type OverlayLayout } from '@shared/overlayDisplay'

const SERVICE_NAME = 'dev.widoken.Cursor'
const OBJECT_PATH = '/dev/widoken/Cursor'
const INTERFACE_NAME = 'dev.widoken.Cursor'
const PLUGIN_NAME = 'widoken-cursor-bridge'

export interface KWinCursorBridge {
  refreshLayouts: (layouts: OverlayLayout[], force?: boolean) => Promise<void>
  stop: () => Promise<void>
}

function scriptPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'kwin', 'widoken-cursor.js')
    : join(app.getAppPath(), 'resources', 'kwin', 'widoken-cursor.js')
}

export async function startKWinCursorBridge(
  onCursor: (point: Point) => void,
  onWindowConfigured: (caption: string, bounds: Rectangle) => void,
  initialLayouts: OverlayLayout[]
): Promise<KWinCursorBridge> {
  const bus = dbus.sessionBus({ timeout: 3_000 })
  bus.on('error', (error) => console.warn('KWin cursor bridge D-Bus error:', error))

  let kwinOwner = await bus.getNameOwner('org.kde.KWin')
  let layoutPayload = serializeOverlayLayouts(initialLayouts)
  const firstLayout = initialLayouts[0]
  const cursorInterface = dbus.defineInterface({
    name: INTERFACE_NAME,
    methods: {
      GetProcessId: {
        out: { pid: 'i' },
        handler: () => process.pid
      },
      GetTargetGeometry: {
        out: { x: 'i', y: 'i', width: 'i', height: 'i' },
        handler: () => firstLayout ?? { x: 0, y: 0, width: 0, height: 0 }
      },
      GetOverlayLayout: {
        out: { payload: 's' },
        handler: () => layoutPayload
      },
      UpdateCursor: {
        in: { x: 'i', y: 'i' },
        handler: (args, context) => {
          if (context.sender !== kwinOwner) return
          const { x, y } = args as { x: number; y: number }
          if (Number.isFinite(x) && Number.isFinite(y)) {
            if (process.env.WIDOKEN_DEBUG_CURSOR === '1') console.log(`KWin cursor: ${x},${y}`)
            onCursor({ x, y })
          }
        }
      },
      WindowConfigured: {
        in: { pid: 'i', keepAbove: 'b', x: 'i', y: 'i', width: 'i', height: 'i', caption: 's' },
        handler: (args, context) => {
          if (context.sender !== kwinOwner) return
          const { pid, keepAbove, x, y, width, height, caption } = args as {
            pid: number
            keepAbove: boolean
            x: number
            y: number
            width: number
            height: number
            caption: string
          }
          if (
            pid !== process.pid ||
            typeof caption !== 'string' ||
            ![x, y, width, height].every(Number.isFinite) ||
            width <= 0 ||
            height <= 0
          ) return
          onWindowConfigured(caption, { x, y, width, height })
          if (process.env.WIDOKEN_DEBUG_CURSOR === '1') {
            console.log(
              `KWin window configured: pid=${pid}, keepAbove=${keepAbove}, caption=${caption}, bounds=${x},${y} ${width}x${height}`
            )
          }
        }
      }
    }
  })

  const exported = await bus.export(OBJECT_PATH, cursorInterface)
  const ownedName = await bus.ownName(SERVICE_NAME)
  if (!ownedName.isPrimaryOwner) {
    await exported.remove()
    await bus.close()
    throw new Error(`Could not own D-Bus name ${SERVICE_NAME}`)
  }

  await bus.invoke<boolean>({
    destination: 'org.kde.KWin',
    path: '/Scripting',
    interface: 'org.kde.kwin.Scripting',
    member: 'unloadScript',
    signature: 's',
    body: [PLUGIN_NAME]
  })

  let stopped = false
  let operation = Promise.resolve()

  const unloadScript = async (): Promise<void> => {
    try {
      await bus.invoke<boolean>({
        destination: 'org.kde.KWin',
        path: '/Scripting',
        interface: 'org.kde.kwin.Scripting',
        member: 'unloadScript',
        signature: 's',
        body: [PLUGIN_NAME]
      })
    } catch (error) {
      console.warn('Could not unload KWin cursor bridge:', error)
    }
  }

  const loadScript = async (): Promise<void> => {
    kwinOwner = await bus.getNameOwner('org.kde.KWin')
    const scriptId = await bus.invoke<number>({
      destination: 'org.kde.KWin',
      path: '/Scripting',
      interface: 'org.kde.kwin.Scripting',
      member: 'loadScript',
      signature: 'ss',
      body: [scriptPath(), PLUGIN_NAME]
    })
    if (!Number.isInteger(scriptId) || scriptId < 0) throw new Error('KWin refused to load the cursor bridge script')

    await bus.invoke<void>({
      destination: 'org.kde.KWin',
      path: `/Scripting/Script${scriptId}`,
      interface: 'org.kde.kwin.Script',
      member: 'run'
    })
  }

  const enqueue = (task: () => Promise<void>): Promise<void> => {
    operation = operation.then(task, task)
    return operation
  }

  await loadScript()

  const refreshLayouts = async (layouts: OverlayLayout[], force = false): Promise<void> => {
    const next = serializeOverlayLayouts(layouts)
    const changed = next !== layoutPayload
    layoutPayload = next
    if (stopped || (!changed && !force)) return

    await enqueue(async () => {
      if (stopped) return
      await unloadScript()
      await loadScript()
    })
  }

  const stop = async (): Promise<void> => {
    if (stopped) return
    stopped = true
    await operation.catch(() => undefined)
    await unloadScript()
    await exported.remove()
    await ownedName.release()
    await bus.close()
  }

  return { refreshLayouts, stop }
}
