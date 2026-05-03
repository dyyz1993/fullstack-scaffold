#!/usr/bin/env ts-node
/**
 * 初始化 LLM Chat 项目
 *
 * 用法：
 *   npx ts-node scripts/init-chat-project.ts --name my-chat-app --path ./output
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

interface InitOptions {
  name: string
  path: string
  withAuth?: boolean
  withSSE?: boolean
  withHistory?: boolean
  withMock?: boolean
}

const defaultOptions: InitOptions = {
  name: 'my-chat-app',
  path: './',
  withAuth: true,
  withSSE: true,
  withHistory: true,
  withMock: true,
}

async function initChatProject(options: Partial<InitOptions> = defaultOptions): Promise<void> {
  const config = { ...defaultOptions, ...options }
  const projectPath = config.path

  console.log(`🚀 初始化 LLM Chat 项目: ${config.name}`)

  // 创建目录结构
  const dirs = [
    `${projectPath}/${config.name}/src/client/components`,
    `${projectPath}/${config.name}/src/client/hooks`,
    `${projectPath}/${config.name}/src/client/stores`,
    `${projectPath}/${config.name}/src/client/services`,
    `${projectPath}/${config.name}/src/client/pages`,
    `${projectPath}/${config.name}/src/server/module-agent/routes`,
    `${projectPath}/${config.name}/src/server/module-agent/services`,
    `${projectPath}/${config.name}/src/server/middleware`,
    `${projectPath}/${config.name}/src/server/utils`,
    `${projectPath}/${config.name}/src/shared/modules/agent`,
    `${projectPath}/${config.name}/src/shared/modules/chat`,
    `${projectPath}/${config.name}/src/shared/core`,
  ]

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true })
  }

  console.log('✅ 目录结构创建完成')

  // 创建配置文件
  await createPackageJson(projectPath, config.name)
  await createTsConfig(projectPath, config.name)
  await createViteConfig(projectPath, config.name)
  await createEnvFile(projectPath, config.name, config.withMock)

  // 创建共享模块
  await createSharedModules(projectPath, config.name)

  // 创建服务端模块
  await createServerModules(projectPath, config.name, config)

  // 创建客户端模块
  await createClientModules(projectPath, config.name, config)

  console.log(`
🎉 项目初始化完成！

下一步：
  cd ${config.name}
  npm install
  npm run dev
`)
}

async function createPackageJson(projectPath: string, name: string): Promise<void> {
  const packageJson = {
    name: name,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      hono: '^4.0.0',
      '@hono/zod-openapi': '^0.2.0',
      zustand: '^4.0.0',
      zod: '^3.22.0',
      react: '^18.0.0',
      'react-dom': '^18.0.0',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.0.0',
      '@types/react-dom': '^18.0.0',
      typescript: '^5.0.0',
      vite: '^5.0.0',
      '@vitejs/plugin-react': '^4.0.0',
      tailwindcss: '^3.0.0',
      postcss: '^8.0.0',
      autoprefixer: '^10.0.0',
    },
  }

  fs.writeFileSync(
    path.join(projectPath, name, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  )
}

async function createTsConfig(projectPath: string, name: string): Promise<void> {
  const tsConfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      baseUrl: '.',
      paths: {
        '@shared/*': ['./src/shared/*'],
        '@client/*': ['./src/client/*'],
        '@server/*': ['./src/server/*'],
      },
    },
    include: ['src/**/*'],
    exclude: ['node_modules'],
  }

  fs.writeFileSync(path.join(projectPath, name, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2))
}

async function createViteConfig(projectPath: string, name: string): Promise<void> {
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@shared': '/src/shared',
      '@client': '/src/client',
      '@server': '/src/server',
    },
  },
})
`

  fs.writeFileSync(path.join(projectPath, name, 'vite.config.ts'), viteConfig)
}

async function createEnvFile(projectPath: string, name: string, withMock: boolean): Promise<void> {
  const envContent = `# LLM 配置
USE_MOCK_LLM=${withMock}
MOCK_DELAY=30

# API 配置
API_BASE_URL=http://localhost:3010
`

  fs.writeFileSync(path.join(projectPath, name, '.env'), envContent)
}

async function createSharedModules(projectPath: string, name: string): Promise<void> {
  const agentSchemas = `import { z } from 'zod'

export const ChatMessageRoleSchema = z.enum(['user', 'agent', 'system'])

export const ToolCallSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'error']),
  args: z.record(z.unknown()).optional(),
  result: z.unknown().nullish(),
  error: z.string().optional(),
})

export const ChatMessageSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  role: ChatMessageRoleSchema,
  content: z.string(),
  thinking: z.string().nullish(),
  toolCalls: z.array(ToolCallSchema).nullish(),
  createdAt: z.string(),
})

export const AgentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  model: z.string(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>
export type ToolCall = z.infer<typeof ToolCallSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type Agent = z.infer<typeof AgentSchema>
`

  fs.writeFileSync(
    path.join(projectPath, name, 'src/shared/modules/agent/schemas.ts'),
    agentSchemas
  )

  const chatProtocol = `import { z } from 'zod'

export const ChatSSEProtocolSchema = z.object({
  events: z.object({
    'pi-text-delta': z.object({
      messageId: z.string(),
      delta: z.string(),
      isFinal: z.boolean().default(false),
    }),
    'pi-thinking-delta': z.object({
      messageId: z.string(),
      delta: z.string(),
    }),
    'pi-tool-start': z.object({
      messageId: z.string(),
      toolCallId: z.string(),
      toolName: z.string(),
      args: z.record(z.unknown()),
    }),
    'pi-tool-end': z.object({
      messageId: z.string(),
      toolCallId: z.string(),
      result: z.unknown().nullable(),
      error: z.string().optional(),
    }),
    'pi-agent-start': z.object({
      messageId: z.string(),
      agentId: z.string(),
    }),
    'pi-agent-end': z.object({
      messageId: z.string(),
    }),
  }),
})

export type ChatSSEProtocol = z.infer<typeof ChatSSEProtocolSchema>
`

  fs.writeFileSync(path.join(projectPath, name, 'src/shared/modules/chat/index.ts'), chatProtocol)
}

async function createServerModules(
  projectPath: string,
  name: string,
  config: InitOptions
): Promise<void> {
  const agentService = `import type { Agent, ChatMessage } from '@shared/modules/agent'

const mockAgents: Agent[] = []
const mockMessages: ChatMessage[] = []

export async function getAgents(userId: string): Promise<Agent[]> {
  return mockAgents.filter(a => a.userId === userId)
}

export async function getMessages(agentId: string, userId: string): Promise<ChatMessage[]> {
  return mockMessages.filter(m => m.agentId === agentId)
}

export async function sendMessage(agentId: string, userId: string, content: string): Promise<void> {
  console.log('Sending message:', content)
}
`

  fs.writeFileSync(
    path.join(projectPath, name, 'src/server/module-agent/services/agent-service.ts'),
    agentService
  )

  if (config.withAuth) {
    const authMiddleware = `import { createMiddleware } from 'hono/factory'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  avatar?: string
}

export function authMiddleware() {
  return createMiddleware<{ Variables: { user: AuthUser } }>(async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    
    if (token?.startsWith('user-')) {
      c.set('user', {
        id: token.replace('user-', '').replace('-token', ''),
        username: 'Test User',
        email: 'test@example.com',
        role: 'user',
      })
    }
    
    await next()
  })
}
`

    fs.writeFileSync(path.join(projectPath, name, 'src/server/middleware/auth.ts'), authMiddleware)
  }
}

async function createClientModules(
  projectPath: string,
  name: string,
  config: InitOptions
): Promise<void> {
  if (config.withAuth) {
    const authStore = `import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  username: string
  avatar?: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: 'auth-token' }
  )
)
`

    fs.writeFileSync(path.join(projectPath, name, 'src/client/stores/authStore.ts'), authStore)
  }

  const appTsx = `import { useAuthStore } from './stores/authStore'

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <div>Please login</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1>LLM Chat</h1>
      <p>Welcome to your chat application!</p>
    </div>
  )
}
`

  fs.writeFileSync(path.join(projectPath, name, 'src/client/App.tsx'), appTsx)

  const mainTsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`

  fs.writeFileSync(path.join(projectPath, name, 'src/client/main.tsx'), mainTsx)

  const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LLM Chat</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
`

  fs.writeFileSync(path.join(projectPath, name, 'index.html'), indexHtml)
}

const args = process.argv.slice(2)
const options: Partial<InitOptions> = {}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--name' && args[i + 1]) {
    options.name = args[i + 1]
    i++
  } else if (args[i] === '--path' && args[i + 1]) {
    options.path = args[i + 1]
    i++
  } else if (args[i] === '--no-auth') {
    options.withAuth = false
  } else if (args[i] === '--no-mock') {
    options.withMock = false
  }
}

initChatProject(options).catch(console.error)
