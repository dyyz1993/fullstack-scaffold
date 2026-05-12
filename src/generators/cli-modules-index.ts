import type { ResolvedPreset } from './template-generator'

export function generateCliModulesIndex(resolved: ResolvedPreset): string {
  const modules: string[] = []
  const registrations: string[] = []

  if (resolved.modules.has('todos')) {
    modules.push("import { registerTodoCommands } from './todo'")
    registrations.push('registerTodoCommands(site)')
  }

  if (resolved.modules.has('notifications')) {
    modules.push("import { registerNotificationCommands } from './notification'")
    registrations.push('registerNotificationCommands(site)')
  }

  modules.push("import { registerConfigCommands } from './config'")
  registrations.push('registerConfigCommands(site)')

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
