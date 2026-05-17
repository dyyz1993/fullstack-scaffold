import type { ResolvedPreset } from './template-generator'

/**
 * CLI module registry: maps server module names to their CLI module counterparts.
 * When a server module is included in a preset, its CLI commands are auto-registered.
 *
 * To add CLI support for a new module:
 * 1. Create the CLI module at template/src/cli/modules/{dir}/index.ts
 * 2. Export a `register{Name}Commands(site: SiteInstance)` function
 * 3. Add an entry to CLI_MODULE_MAP below
 */
const CLI_MODULE_MAP: Record<string, { dir: string; registerFunction: string }> = {
  todos: { dir: 'todo', registerFunction: 'registerTodoCommands' },
  notifications: {
    dir: 'notification',
    registerFunction: 'registerNotificationCommands',
  },
  auth: { dir: 'auth', registerFunction: 'registerAuthCommands' },
  plugin: { dir: 'plugin', registerFunction: 'registerPluginCommands' },
  // Add new modules below:
  // order: { dir: 'order', registerFunction: 'registerOrderCommands' },
  // tenant: { dir: 'tenant', registerFunction: 'registerTenantCommands' },
}

// Config module is always included (manages base URL, status, etc.)
const ALWAYS_INCLUDED = {
  dir: 'config',
  registerFunction: 'registerConfigCommands',
}

export function generateCliModulesIndex(resolved: ResolvedPreset): string {
  const modules: string[] = []
  const registrations: string[] = []

  // Auto-register CLI modules based on resolved server modules
  for (const [serverModule, config] of Object.entries(CLI_MODULE_MAP)) {
    if (resolved.modules.has(serverModule)) {
      modules.push(`import { ${config.registerFunction} } from './${config.dir}'`)
      registrations.push(`${config.registerFunction}(site)`)
    }
  }

  // Always include config module
  modules.push(`import { ${ALWAYS_INCLUDED.registerFunction} } from './${ALWAYS_INCLUDED.dir}'`)
  registrations.push(`${ALWAYS_INCLUDED.registerFunction}(site)`)

  const exports = modules
    .map(m => {
      const match = m.match(/\{ (\w+) \}/)
      return match ? match[1] : ''
    })
    .filter(Boolean)

  return `import type { Core } from '@dyyz1993/xcli-core'
${modules.join('\n')}

/**
 * Register all builtin CLI commands to xcli-core.
 * Each register function receives a SiteInstance for command registration.
 */
export function registerBuiltinCommands(app: Core) {
  const api = app.loader.getAPI()

  const site = api.createSite({
    name: 'local-server',
    url: 'http://localhost:3010',
  })

${registrations.map(r => `  ${r}`).join('\n')}
}

export { ${exports.join(', ')} }
`
}
