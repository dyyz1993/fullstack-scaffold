import type { Core } from '@dyyz1993/xcli-core'
import { registerTodoCommands } from './todo'
import { registerNotificationCommands } from './notification'
import { registerConfigCommands } from './config'

/**
 * Register all builtin CLI commands to xcli-core.
 * Each register function receives a SiteInstance for command registration.
 */
export function registerBuiltinCommands(app: Core) {
  const api = app.loader.getAPI()

  // Create a builtin site representing the local server
  const site = api.createSite({
    name: 'local-server',
    url: 'http://localhost:3010',
  })

  registerTodoCommands(site)
  registerNotificationCommands(site)
  registerConfigCommands(site)
}

export { registerTodoCommands, registerNotificationCommands, registerConfigCommands }
