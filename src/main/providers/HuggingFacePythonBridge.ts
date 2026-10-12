import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import type { HuggingFaceBrowser } from '@shared/settings'

const COMMAND_TIMEOUT_MS = 30_000
const MAX_OUTPUT_BYTES = 64 * 1024

export interface HuggingFaceBalanceResult {
  provider: 'huggingface'
  username?: string
  balance_usd: number
  browser: Exclude<HuggingFaceBrowser, 'auto'>
}

export interface HuggingFaceMonitorResult {
  provider: 'huggingface'
  status: 'working' | 'idle' | 'unknown'
  username?: string
  browser: Exclude<HuggingFaceBrowser, 'auto'>
  requests_month?: number
  spent_usd_month?: number
  new_requests?: number
  detail?: string
}

export interface HuggingFaceMonitorHandle {
  stop(): void
}

export interface HuggingFaceCollector {
  balance(browser: HuggingFaceBrowser): Promise<HuggingFaceBalanceResult>
  monitor(browser: HuggingFaceBrowser, onResult: (result: HuggingFaceMonitorResult) => void): HuggingFaceMonitorHandle
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function parseBalance(line: string): HuggingFaceBalanceResult {
  const value = JSON.parse(line) as Partial<HuggingFaceBalanceResult>
  if (value.provider !== 'huggingface' || !isFiniteNonNegative(value.balance_usd) || typeof value.browser !== 'string') {
    throw new Error('Hugging Face balance collector returned an invalid response.')
  }
  return value as HuggingFaceBalanceResult
}

function parseMonitor(line: string): HuggingFaceMonitorResult | undefined {
  try {
    const value = JSON.parse(line) as Partial<HuggingFaceMonitorResult>
    if (value.provider !== 'huggingface') return undefined
    if (value.status !== 'working' && value.status !== 'idle' && value.status !== 'unknown') return undefined
    if (typeof value.browser !== 'string') return undefined
    return value as HuggingFaceMonitorResult
  } catch {
    return undefined
  }
}

function collectorError(stderr: string, fallback: string): Error {
  const detail = stderr.trim().replace(/^Erro:\s*/i, '')
  if (/No module named ['"]?(browser_cookie3|requests|bs4)/i.test(detail)) {
    return new Error('Hugging Face collector dependencies are missing. Install resources/huggingface/requirements.txt with Python.')
  }
  return new Error(detail || fallback)
}

/** Runs the bundled, read-only Python collectors that reuse the browser login. */
export class HuggingFacePythonBridge implements HuggingFaceCollector {
  private readonly scriptRoot: string
  private readonly pythonCommands: string[]

  constructor(options: { scriptRoot?: string; env?: NodeJS.ProcessEnv } = {}) {
    this.scriptRoot = options.scriptRoot ?? join(process.cwd(), 'resources', 'huggingface')
    const env = options.env ?? process.env
    this.pythonCommands = [
      env.WIDOKEN_PYTHON,
      resolve(process.cwd(), '..', '.venv', 'bin', 'python'),
      resolve(process.cwd(), '..', '.venv', 'Scripts', 'python.exe'),
      'python3',
      'python'
    ]
      .filter((command): command is string => Boolean(command?.trim()))
  }

  async balance(browser: HuggingFaceBrowser): Promise<HuggingFaceBalanceResult> {
    const output = await this.run('hf_balance.py', ['--json', '--browser', browser])
    const line = output.trim().split(/\r?\n/).filter(Boolean).at(-1)
    if (!line) throw new Error('Hugging Face balance collector returned no data.')
    try {
      return parseBalance(line)
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('Hugging Face balance collector returned invalid JSON.')
      throw error
    }
  }

  monitor(browser: HuggingFaceBrowser, onResult: (result: HuggingFaceMonitorResult) => void): HuggingFaceMonitorHandle {
    const script = join(this.scriptRoot, 'hf_monitor.py')
    const child = this.spawnPython(script, ['--browser', browser, '--interval', '5', '--active-for', '5'])
    let pending = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      const lines = `${pending}${chunk}`.split(/\r?\n/)
      pending = lines.pop() ?? ''
      for (const line of lines) {
        const result = parseMonitor(line)
        if (result) onResult(result)
      }
    })
    child.on('error', () => undefined)
    return {
      stop: () => {
        if (!child.killed) child.kill('SIGTERM')
      }
    }
  }

  private async run(scriptName: string, args: string[]): Promise<string> {
    const script = join(this.scriptRoot, scriptName)
    if (!existsSync(script)) throw new Error(`Hugging Face collector not found: ${scriptName}.`)
    const child = this.spawnPython(script, args)
    let stdout = ''
    let stderr = ''
    const append = (current: string, chunk: Buffer | string): string =>
      `${current}${chunk.toString()}`.slice(-MAX_OUTPUT_BYTES)
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk) })
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk) })

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new Error('Hugging Face collector timed out.'))
      }, COMMAND_TIMEOUT_MS)
      child.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
      child.once('close', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve(stdout)
        else reject(collectorError(stderr, `Hugging Face collector exited with code ${code ?? 'unknown'}.`))
      })
    })
  }

  private spawnPython(script: string, args: string[]): ChildProcessWithoutNullStreams {
    const command = this.pythonCommands.find((candidate) => {
      if (!isAbsolute(candidate)) return true
      return existsSync(candidate)
    }) ?? 'python3'
    return spawn(command, [script, ...args], {
      cwd: this.scriptRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    })
  }
}
