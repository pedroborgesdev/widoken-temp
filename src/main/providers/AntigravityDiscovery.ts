import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const DEFAULT_LANGUAGE_SERVER_PORT = 5387
const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{8,512}$/

export interface AntigravityLanguageServer {
  host: '127.0.0.1' | '[::1]'
  port: number
  csrfToken: string
}

export interface ProcessListingCommand {
  executable: string
  args: string[]
}

type Environment = Readonly<Record<string, string | undefined>>

const WINDOWS_PROCESS_QUERY = [
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  "Get-CimInstance -ClassName Win32_Process -Property CommandLine | Where-Object { $_.CommandLine -like '*--hub-port*' } | ForEach-Object { $_.CommandLine }"
].join('; ')

export function antigravityProcessListingCommand(platform: NodeJS.Platform): ProcessListingCommand | undefined {
  if (platform === 'win32') {
    return {
      executable: 'powershell.exe',
      args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_PROCESS_QUERY]
    }
  }
  if (platform === 'darwin') {
    return { executable: 'ps', args: ['-axww', '-o', 'command='] }
  }
  if (platform === 'linux') {
    return { executable: 'ps', args: ['-ww', '-eo', 'args='] }
  }
  return undefined
}

function argumentValue(commandLine: string, flag: string): string | undefined {
  const escaped = flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = commandLine.match(new RegExp(`(?:^|\\s)${escaped}(?:=|\\s+)(?:"([^"]+)"|'([^']+)'|(\\S+))`))
  return match?.[1] ?? match?.[2] ?? match?.[3]
}

function validPort(value: string | undefined): number | undefined {
  if (!value || !/^\d{1,5}$/.test(value)) return undefined
  const port = Number(value)
  return port >= 1 && port <= 65_535 ? port : undefined
}

function hasHubFlag(commandLine: string): boolean {
  return /(?:^|\s)--hub(?=\s|$)/.test(commandLine)
}

function isAntigravityProcess(commandLine: string): boolean {
  return /(?:^|[\\/\s"'])(?:agy(?:\.exe)?|language_server[^\\/\s"']*|antigravity(?:\.exe)?)(?=[\s"']|$)/i.test(commandLine)
}

export function parseAntigravityProcessList(output: string): AntigravityLanguageServer[] {
  const servers: AntigravityLanguageServer[] = []
  for (const commandLine of output.split(/\r?\n/)) {
    if (!hasHubFlag(commandLine) || !isAntigravityProcess(commandLine)) continue
    const port = validPort(argumentValue(commandLine, '--hub-port'))
    const csrfToken = argumentValue(commandLine, '--csrf_token')
    if (!port || !csrfToken || !CSRF_TOKEN_PATTERN.test(csrfToken)) continue
    servers.push({ host: '127.0.0.1', port, csrfToken })
  }
  return uniqueServers(servers)
}

function isLoopback(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (normalized === 'localhost' || normalized === '::1') return true
  return /^127(?:\.\d{1,3}){3}$/.test(normalized)
}

export function antigravityServerFromEnvironment(environment: Environment): AntigravityLanguageServer | undefined {
  const csrfToken = environment.ANTIGRAVITY_CSRF_TOKEN
  if (!csrfToken || !CSRF_TOKEN_PATTERN.test(csrfToken)) return undefined

  const address = environment.ANTIGRAVITY_LS_ADDRESS?.trim() || `localhost:${DEFAULT_LANGUAGE_SERVER_PORT}`
  try {
    const url = new URL(address.includes('://') ? address : `http://${address}`)
    if (url.protocol !== 'http:' || !isLoopback(url.hostname)) return undefined
    if (url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== '/')) return undefined
    const port = validPort(url.port || String(DEFAULT_LANGUAGE_SERVER_PORT))
    if (!port) return undefined
    return {
      host: url.hostname.replace(/^\[|\]$/g, '') === '::1' ? '[::1]' : '127.0.0.1',
      port,
      csrfToken
    }
  } catch {
    return undefined
  }
}

function uniqueServers(servers: AntigravityLanguageServer[]): AntigravityLanguageServer[] {
  const seen = new Set<string>()
  return servers.filter((server) => {
    const key = `${server.host}:${server.port}:${server.csrfToken}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function discoverAntigravityLanguageServers(
  platform: NodeJS.Platform = process.platform,
  environment: Environment = process.env
): Promise<AntigravityLanguageServer[]> {
  const fromEnvironment = antigravityServerFromEnvironment(environment)
  const command = antigravityProcessListingCommand(platform)
  if (!command) return fromEnvironment ? [fromEnvironment] : []

  try {
    const { stdout } = await execFileAsync(command.executable, command.args, {
      encoding: 'utf8',
      timeout: 5_000,
      maxBuffer: 2_000_000,
      windowsHide: true
    })
    return uniqueServers([
      ...(fromEnvironment ? [fromEnvironment] : []),
      ...parseAntigravityProcessList(stdout)
    ])
  } catch {
    return fromEnvironment ? [fromEnvironment] : []
  }
}
