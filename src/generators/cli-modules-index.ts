import type { ResolvedPreset } from './template-generator'

/**
 * CLI module registry: auto-discovers CLI modules from manifest declarations.
 * When a server module with `cliModule` field is included in a preset,
 * its CLI commands are auto-registered.
 *
 * To add CLI support for a new module:
 * 1. Create the CLI module at template/src/cli/modules/{dir}/index.ts
 * 2. Export a `register{Name}Commands(site: SiteInstance)` function
 * 3. Add `cliModule: { dir: '...', registerFunction: '...' }` to the module's module.ts manifest
 */

// Config module is always included (manages base URL, status, etc.)
const ALWAYS_INCLUDED = {
  dir: 'config',
  registerFunction: 'registerConfigCommands',
}

export function generateCliModulesIndex(resolved: ResolvedPreset): string {
  const modules: string[] = []
  const registrations: string[] = []

  // Auto-register CLI modules based on manifest cliModule declarations
  for (const [, manifest] of resolved.modules) {
    if (manifest.cliModule) {
      const { dir, registerFunction } = manifest.cliModule
      modules.push(`import { ${registerFunction} } from './${dir}'`)
      registrations.push(`${registerFunction}(site)`)
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
