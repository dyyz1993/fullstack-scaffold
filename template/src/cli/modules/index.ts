import type { Core } from '@dyyz1993/xcli-core'
import { registerTodoCommands } from './todo'
import { registerNotificationCommands } from './notification'
import { registerConfigCommands } from './config'
import { registerPluginCommands } from './plugin'
import { registerAuthCommands } from './auth'
import { registerAdminCommands } from './admin'
import { registerCaptchaCommands } from './captcha'
import { registerChatCommands } from './chat'
import { registerContentCommands } from './content'
import { registerDisputeCommands } from './dispute'
import { registerFileCommands } from './file'
import { registerOrderCommands } from './order'
import { registerPermissionCommands } from './permission'
import { registerTenantCommands } from './tenant'
import { registerTicketCommands } from './ticket'
import { registerMerchantCommands } from './merchant'

export function registerBuiltinCommands(app: Core) {
  const api = app.loader.getAPI()

  const site = api.createSite({
    name: 'local-server',
    url: 'http://localhost:3010',
  })

  registerTodoCommands(site)
  registerNotificationCommands(site)
  registerConfigCommands(site)
  registerPluginCommands(site)
  registerAuthCommands(site)
  registerAdminCommands(site)
  registerCaptchaCommands(site)
  registerChatCommands(site)
  registerContentCommands(site)
  registerDisputeCommands(site)
  registerFileCommands(site)
  registerOrderCommands(site)
  registerPermissionCommands(site)
  registerTenantCommands(site)
  registerTicketCommands(site)
  registerMerchantCommands(site)
}

export {
  registerTodoCommands,
  registerNotificationCommands,
  registerConfigCommands,
  registerPluginCommands,
  registerAuthCommands,
  registerAdminCommands,
  registerCaptchaCommands,
  registerChatCommands,
  registerContentCommands,
  registerDisputeCommands,
  registerFileCommands,
  registerOrderCommands,
  registerPermissionCommands,
  registerTenantCommands,
  registerTicketCommands,
  registerMerchantCommands,
}
