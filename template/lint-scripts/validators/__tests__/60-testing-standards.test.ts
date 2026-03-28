/**
 * 测试规则文档中的规范
 *
 * 这些测试验证规则文档中描述的代码模式是否被正确遵循
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'

const TEMPLATE_ROOT = join(__dirname, '..', '..', '..', '..', 'template')
const RULE_DOCS_DIR = join(TEMPLATE_ROOT, '.claude', 'rules')

type RuleCheckResult = {
  ruleName: string
  passed: boolean
  violations: string[]
  docLink: string
}

function checkTestingStandardsRule(content: string): RuleCheckResult {
  const violations: string[] = []

  if (content.includes('.skip(') || content.includes('.only(')) {
    violations.push('检测到跳过测试（.skip 或 .only）')
  }

  if (content.includes('fetch(') && !content.includes('createTestClient')) {
    violations.push('检测到直接使用 fetch() 而未使用 createTestClient')
  }

  if (content.includes('app.fetch') || content.includes('app.request')) {
    violations.push('检测到使用 app.fetch 或 app.request，应非类型安全方式')
  }

  if (content.includes(': any') && !content.includes('@ts-ignore')) {
    violations.push('检测到使用 any 类型')
  }

  const docLink = '.claude/rules/60-testing-standards.md'

  return {
    ruleName: 'testing-standards',
    passed: violations.length === 0,
    violations,
    docLink,
  }
}

function checkServerApiRule(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []
  const fileName = basename(filePath)

  if (filePath.includes('/routes/')) {
    if (!content.includes('openapi(')) {
      violations.push('路由文件必须使用 openapi() 函数')
    }
  }

  if (filePath.includes('/services/')) {
    if (content.includes('req.') || content.includes('res.')) {
      violations.push('Service 文件不应直接使用 req/res 对象')
    }
  }

  return {
    ruleName: 'server-api',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/20-server-api.md',
  }
}

function checkClientComponentRule(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.includes('/components/')) {
    if (!content.includes('React.FC') && !content.includes('forwardRef')) {
      violations.push('组件必须使用 React.FC 或 forwardRef 定义')
    }

    if (content.includes('useState(') && !content.includes('useStore(')) {
      violations.push('组件内使用 useState 应考虑使用 Zustand store')
    }
  }

  return {
    ruleName: 'client-components',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/30-client-components.md',
  }
}

function checkZustandStoreRule(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.includes('/stores/')) {
    if (!content.includes('create') && !content.includes('zustand')) {
      violations.push('Store 文件必须使用 zustand 的 create 函数')
    }

    if (content.includes('useState') && !content.includes('useStore')) {
      violations.push('Store 文件内不应使用 React 的 useState')
    }
  }

  return {
    ruleName: 'zustand-store',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/32-client-state-zustand.md',
  }
}

describe('Rules Documentation Tests', () => {
  it('should have testing-standards rule file', () => {
    const ruleFile = join(RULE_DOCS_DIR, '60-testing-standards.md')
    expect(existsSync(ruleFile)).toBe(true)
  })

  it('should have server-api rule file', () => {
    const ruleFile = join(RULE_DOCS_DIR, '20-server-api.md')
    expect(existsSync(ruleFile)).toBe(true)
  })

  it('should have client-components rule file', () => {
    const ruleFile = join(RULE_DOCS_DIR, '30-client-components.md')
    expect(existsSync(ruleFile)).toBe(true)
  })

  it('should have zustand-store rule file', () => {
    const ruleFile = join(RULE_DOCS_DIR, '32-client-state-zustand.md')
    expect(existsSync(ruleFile)).toBe(true)
  })
})

describe('Testing Standards Rule Check', () => {
  it('should pass valid test file', () => {
    const validTestFile = `
import { describe, it, expect } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'

describe('ValidTest', () => {
  it('should work', async () => {
    const client = createTestClient()
    const response = await client.api.items.$get()
    expect(response.status).toBe(200)
  })
})
`
    const result = checkTestingStandardsRule(validTestFile)
    expect(result.passed).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('should fail when using fetch directly', () => {
    const invalidTestFile = `
import { describe, it, expect } from 'vitest'

describe('InvalidTest', () => {
  it('should work', async () => {
    const response = await fetch('/api/items')
    expect(response.status).toBe(200)
  })
})
`
    const result = checkTestingStandardsRule(invalidTestFile)
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('检测到直接使用 fetch() 而未使用 createTestClient')
  })

  it('should fail when using .skip', () => {
    const skippedTestFile = `
import { describe, it, expect } from 'vitest'

describe('SkippedTest', () => {
  it.skip('should work', () => {
    expect(true).toBe(true)
  })
})
`
    const result = checkTestingStandardsRule(skippedTestFile)
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('检测到跳过测试（.skip 或 .only）')
  })

  it('should fail when using any type', () => {
    const anyTypeFile = `
import { describe, it, expect } from 'vitest'

describe('AnyTypeTest', () => {
  it('should work', async () => {
    const result: any = await Promise.resolve({ data: 'test' })
    expect(result.data).toBe('test')
  })
})
`
    const result = checkTestingStandardsRule(anyTypeFile)
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('检测到使用 any 类型')
  })
})

describe('Server API Rule Check', () => {
  it('should pass valid route file', () => {
    const validRouteFile = `
import { Hono } from 'hono'
import { openapi } from '../utils/openapi'

const app = new Hono()

app.openapi(
  {
    method: 'get',
    path: '/items',
  },
  async (c) => {
    return c.json({ items: [] })
  }
)
`
    const result = checkServerApiRule(
      validRouteFile,
      'src/server/module-todos/routes/todos-routes.ts'
    )
    expect(result.passed).toBe(true)
  })

  it('should fail when route does not use openapi', () => {
    const invalidRouteFile = `
import { Hono } from 'hono'

const app = new Hono()

app.get('/items', async (c) => {
  return c.json({ items: [] })
})
`
    const result = checkServerApiRule(
      invalidRouteFile,
      'src/server/module-todos/routes/todos-routes.ts'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('路由文件必须使用 openapi() 函数')
  })
})

describe('Client Component Rule Check', () => {
  it('should pass valid component file', () => {
    const validComponentFile = `
import { useTodoStore } from '../stores/todoStore'

export const TodoList: React.FC = () => {
  const todos = useTodoStore(state => state.todos)
  return <div>{todos.map(t => <span key={t.id}>{t.title}</span>)}</div>
}
`
    const result = checkClientComponentRule(
      validComponentFile,
      'src/client/components/TodoList.tsx'
    )
    expect(result.passed).toBe(true)
  })

  it('should fail when component does not use React.FC', () => {
    const invalidComponentFile = `
export const TodoList = () => {
  return <div>Todo List</div>
}
`
    const result = checkClientComponentRule(
      invalidComponentFile,
      'src/client/components/TodoList.tsx'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('组件必须使用 React.FC 或 forwardRef 定义')
  })
})

describe('Zustand Store Rule Check', () => {
  it('should pass valid store file', () => {
    const validStoreFile = `
import { create } from 'zustand'

interface TodoState {
  todos: Todo[]
  addTodo: (todo: Todo) => void
}

export const useTodoStore = create<TodoState>((set) => ({
  todos: [],
  addTodo: (todo) => set((state) => ({ todos: [...state.todos, todo] })),
}))
`
    const result = checkZustandStoreRule(validStoreFile, 'src/client/stores/todoStore.ts')
    expect(result.passed).toBe(true)
  })

  it('should fail when store does not use create', () => {
    const invalidStoreFile = `
import { useState } from 'react'

export const useTodoStore = () => {
  const [todos, setTodos] = useState([])
  return { todos, setTodos }
}
`
    const result = checkZustandStoreRule(invalidStoreFile, 'src/client/stores/todoStore.ts')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('Store 文件必须使用 zustand 的 create 函数')
  })
})
