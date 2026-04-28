import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Settings, UpdateSettings } from '@shared/modules/ops'

const SETTINGS_FILE = resolve(process.cwd(), 'data', 'settings.json')

const DEFAULT_SETTINGS: Settings = {
  siteName: 'Biomimic App',
  siteDescription: 'A full-stack React + Hono application',
  notificationsEnabled: true,
}

function ensureDataDir(): void {
  const dir = resolve(process.cwd(), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function getSettings(): Settings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, 'utf-8')
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {
    // ignore read errors
  }
  return { ...DEFAULT_SETTINGS }
}

export function updateSettings(data: UpdateSettings): Settings {
  const current = getSettings()
  const updated: Settings = {
    ...current,
    ...Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined)),
  }
  try {
    ensureDataDir()
    writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8')
  } catch {
    // ignore write errors
  }
  return updated
}
