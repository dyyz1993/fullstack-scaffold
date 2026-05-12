import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getBaseUrl, setBaseUrl, getClient } from '@cli/utils/api'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const CONFIG_DIR = path.join(os.homedir(), '.biomimic')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

interface Config {
  baseUrl: string
  stats?: {
    totalCalls: number
    lastCallAt?: string
    commands?: Record<string, number>
  }
  [key: string]: string | number | boolean | undefined | Config['stats']
}

function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // ignore
  }
  return { baseUrl: 'http://localhost:3010' }
}

function saveConfig(config: Config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function registerConfigCommands(site: SiteInstance) {
  site.command('config-get', {
    description: 'Show current configuration',
    parameters: z.object({
      key: z.string().optional().describe('Get specific config key'),
    }),
    handler: async (params: unknown) => {
      const p = params as { key?: string }
      const cfg = loadConfig()
      if (p.key) {
        const value = cfg[p.key]
        return ok({ [p.key]: value ?? 'not set' })
      }
      return ok(cfg)
    },
  })

  site.command('config-set', {
    description: 'Set configuration value',
    parameters: z.object({
      url: z.string().optional().describe('Set server URL'),
    }),
    handler: async (params: unknown) => {
      const p = params as { url?: string }
      const cfg = loadConfig()
      if (p.url) {
        cfg.baseUrl = p.url
        setBaseUrl(p.url)
      }
      saveConfig(cfg)
      return ok(cfg, ['Configuration saved'])
    },
  })

  site.command('config-url', {
    description: 'Show or set server URL',
    parameters: z.object({
      url: z.string().optional().describe('New server URL'),
    }),
    handler: async (params: unknown) => {
      const p = params as { url?: string }
      if (p.url) {
        const cfg = loadConfig()
        cfg.baseUrl = p.url
        setBaseUrl(p.url)
        saveConfig(cfg)
        return ok({ url: p.url }, [`Server URL set to: ${p.url}`])
      }
      return ok({ url: getBaseUrl() })
    },
  })

  site.command('config-status', {
    description: 'Check server connection status',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        type HealthClient = { health: { $get: () => Promise<Response> } }
        const res = await (client as unknown as HealthClient).health.$get()
        const data = await res.json()
        return ok(data, ['Server is reachable'])
      } catch (error) {
        return fail(`Server not reachable: ${getBaseUrl()} - ${String(error)}`)
      }
    },
  })

  site.command('config-reset', {
    description: 'Reset configuration to defaults',
    parameters: z.object({}),
    handler: async () => {
      const defaultConfig: Config = { baseUrl: 'http://localhost:3010' }
      saveConfig(defaultConfig)
      setBaseUrl(defaultConfig.baseUrl)
      return ok(defaultConfig, ['Configuration reset to defaults'])
    },
  })

  site.command('config-path', {
    description: 'Show config file path',
    parameters: z.object({}),
    handler: async () => {
      return ok({ path: CONFIG_FILE })
    },
  })
}

export { loadConfig, saveConfig, CONFIG_FILE }
