import { execFile } from 'node:child_process'

let cachedSystemFonts: Promise<string[]> | null = null

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { encoding: 'utf8', windowsHide: true, timeout: 20_000, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout) => error ? reject(error) : resolve(stdout)
    )
  })
}

function normalizeFontNames(names: string[]): string[] {
  return [...new Set(
    names
      .flatMap((name) => name.split(','))
      .map((name) => name.replace(/^\uFEFF/, '').trim())
      .filter((name) => name.length > 0 && !name.startsWith('@'))
  )].sort((a, b) => a.localeCompare(b))
}

async function readSystemFonts(): Promise<string[]> {
  if (process.platform === 'win32') {
    const command = [
      '$OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding',
      'Add-Type -AssemblyName System.Drawing',
      '$fonts = New-Object System.Drawing.Text.InstalledFontCollection',
      '$fonts.Families | ForEach-Object { $_.Name }'
    ].join('; ')
    const output = await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command])
    return normalizeFontNames(output.split(/\r?\n/))
  }

  if (process.platform === 'darwin') {
    const output = await run('system_profiler', ['SPFontsDataType', '-json'])
    const parsed = JSON.parse(output) as {
      SPFontsDataType?: Array<Record<string, unknown>>
    }
    const names = (parsed.SPFontsDataType ?? []).flatMap((font) => {
      if (typeof font.family === 'string') return [font.family]
      return [font._name, font.name].filter((name): name is string => typeof name === 'string')
    })
    return normalizeFontNames(names)
  }

  if (process.platform === 'linux') {
    const output = await run('fc-list', ['--format=%{family}\\n'])
    return normalizeFontNames(output.split(/\r?\n/))
  }

  return []
}

export function listSystemFonts(): Promise<string[]> {
  if (!cachedSystemFonts) {
    cachedSystemFonts = readSystemFonts().catch((error: unknown) => {
      cachedSystemFonts = null
      throw error
    })
  }
  return cachedSystemFonts.then((fonts) => [...fonts])
}
