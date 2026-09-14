import type { Core, SiteInstance } from '@dyyz1993/xcli-core'
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

/**
 * 冲突守护：xcli-core 的 SiteInstance.command 默认 override=true，同名命令会被
 * 后注册者静默覆盖（此前 todo/ticket 等模块都注册扁平 `list`/`get`，导致
 * `todos list` 实际路由到 ticket 的 list）。模块现已全部改用 site.group('<ns>')
 * 命名空间注册，但为防止未来新增模块回归扁平命令名，在注册时刻检测重复并告警。
 */
function withConflictGuard(site: SiteInstance): SiteInstance {
  const warn = (name: string) => {
    console.error(
      `[biomimic] CLI command conflict: "${name}" 已被注册过，后者将覆盖前者。` +
        ` 请使用 site.group('<module>') 命名空间注册命令。`
    )
  }

  // 每个 wrap 层（site 顶层 / 每个 group）各自记录已注册名：
  // group 命令的实际注册名带前缀（todos.list / tickets.list），跨组不会冲突，
  // 需要检测的只是同层内的重复注册
  const wrap = (target: SiteInstance): SiteInstance => {
    const seen = new Set<string>()
    return new Proxy(target, {
      get(t, prop, receiver) {
        if (prop === 'command') {
          return (name: string, cmd: Parameters<SiteInstance['command']>[1]) => {
            if (seen.has(name)) warn(name)
            seen.add(name)
            return t.command(name, cmd)
          }
        }
        if (prop === 'group') {
          return (name: string) => wrap(t.group(name))
        }
        const value = Reflect.get(t, prop, receiver)
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(t)
          : value
      },
    })
  }

  return wrap(site)
}

export function registerBuiltinCommands(app: Core) {
  const api = app.loader.getAPI()

  const site = withConflictGuard(
    api.createSite({
      name: 'local-server',
      url: 'http://localhost:3010',
    })
  )

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
