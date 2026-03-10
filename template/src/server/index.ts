/**
 * @framework-baseline 948282ecc1954dd4
 */

/**
 * Server Entry Point - Framework level, no business code awareness
 *
 * This file initializes the runtime adapter and automatically scans
 * for business modules using convention over configuration.
 */

import { setRuntimeAdapter } from './core/runtime'
import { getNodeRuntimeAdapter } from './core/runtime-node'

const runtimeAdapter = getNodeRuntimeAdapter()
setRuntimeAdapter(runtimeAdapter)

export { createApp, apiRoutes, notificationRoutes, chatRoutes, type AppType } from './app'
export { type AppBindings, type CreateAppOptions } from './types/bindings'
export { getAppConfig, getDatabaseConfig, type AppConfig, type DatabaseConfig } from './config'
export { createServer, startServer } from './entries/node'
export { default } from './entries/node'
