export type FrontendChannel = 'web' | 'ops' | 'cli' | 'mobile' | 'miniapp'

export type BackendModule =
  | 'todos'
  | 'chat'
  | 'notifications'
  | 'file'
  | 'agent'
  | 'permission'
  | 'ops'
  | 'order'
  | 'ticket'
  | 'dispute'
  | 'content'
  | 'tenant'
  | 'captcha'

export type DeployTarget = 'node' | 'cloudflare'

export type DatabaseType = 'sqlite' | 'mysql' | 'd1'

export interface ProjectConfig {
  name: string
  channels: FrontendChannel[]
  backend: boolean
  modules: BackendModule[]
  deploy: DeployTarget
  database: DatabaseType
}

export interface ValidationError {
  field: string
  message: string
}

export function validateConfig(config: ProjectConfig): {
  errors: ValidationError[]
  warnings: ValidationError[]
} {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  const hasChannel = (ch: FrontendChannel) => config.channels.includes(ch)
  const hasModule = (m: BackendModule) => config.modules.includes(m)

  // C1: mobile/miniapp → must have backend
  if ((hasChannel('mobile') || hasChannel('miniapp')) && !config.backend) {
    errors.push({ field: 'channels', message: 'mobile/miniapp 通道需要后端支持' })
  }

  // C2: cli → must have backend
  if (hasChannel('cli') && !config.backend) {
    errors.push({ field: 'channels', message: 'cli 通道需要后端支持' })
  }

  // C3: ops → must select permission module
  if (hasChannel('ops') && !hasModule('permission')) {
    errors.push({ field: 'modules', message: 'ops 通道需要 permission 模块' })
  }

  // C4: no backend → only web channel
  if (!config.backend && config.channels.some(ch => ch !== 'web')) {
    errors.push({ field: 'channels', message: '无后端时只能选择 web 通道' })
  }

  // C5: no backend → no modules
  if (!config.backend && config.modules.length > 0) {
    errors.push({ field: 'modules', message: '无后端时不能选择任何模块' })
  }

  // C6: cloudflare → database must be d1
  if (config.deploy === 'cloudflare' && config.database !== 'd1') {
    errors.push({ field: 'database', message: 'cloudflare 部署只能使用 d1 数据库' })
  }

  // C7: d1 → deploy must be cloudflare
  if (config.database === 'd1' && config.deploy !== 'cloudflare') {
    errors.push({ field: 'deploy', message: 'd1 数据库只能用于 cloudflare 部署' })
  }

  // C8: at least one channel or backend
  if (config.channels.length === 0 && !config.backend) {
    errors.push({ field: 'channels', message: '至少需要选择一个通道或启用后端' })
  }

  // C9: ops → must select ops module
  if (hasChannel('ops') && !hasModule('ops')) {
    errors.push({ field: 'modules', message: 'ops 通道需要 ops 模块' })
  }

  // S1: ops but no web
  if (hasChannel('ops') && !hasChannel('web')) {
    warnings.push({
      field: 'channels',
      message: '选了 ops 但没选 web，运营后台通常搭配 web 前端使用',
    })
  }

  // S2: chat/notifications with cloudflare
  if (config.deploy === 'cloudflare' && (hasModule('chat') || hasModule('notifications'))) {
    const modules: string[] = []
    if (hasModule('chat')) modules.push('chat')
    if (hasModule('notifications')) modules.push('notifications')
    warnings.push({
      field: 'modules',
      message: `${modules.join('/')} 模块在 cloudflare 部署下需要 Durable Objects 支持 (WebSocket/SSE)`,
    })
  }

  // S3: file with cloudflare
  if (config.deploy === 'cloudflare' && hasModule('file')) {
    warnings.push({
      field: 'modules',
      message: 'file 模块在 cloudflare 部署下需要将文件存储替换为 R2',
    })
  }

  // S4: agent with cloudflare
  if (config.deploy === 'cloudflare' && hasModule('agent')) {
    warnings.push({
      field: 'modules',
      message:
        'agent 模块的 sandbox 安全沙箱功能在 Cloudflare Workers 上不可用，将降级为无 sandbox 模式运行。如需 agent 完整功能，建议使用 Node.js 部署方式',
    })
  }

  return { errors, warnings }
}
