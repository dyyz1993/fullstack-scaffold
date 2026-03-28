/**
 * Zustand 状态管理规范测试
 *
 * 验证规则文档中描述的 Store 模式是否被正确遵循
 */

import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'

const TEMPLATE_ROOT = join(__dirname, '..', '..', '..', '..', 'template')
const RULE_DOCS_DIR = join(TEMPLATE_ROOT, '.claude', 'rules')

interface RuleCheckResult {
  ruleName: string
  passed: boolean
  violations: string[]
  docLink: string
}

function checkStoreDefinition(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.includes('/stores/')) {
    if (!content.includes('create') && !content.includes('zustand')) {
      violations.push('Store 文件必须使用 zustand 的 create 函数')
    }

    if (content.includes('export default')) {
      violations.push('Store 应使用命名导出，而非默认导出')
    }

    if (content.includes(': any') || content.includes('<any>')) {
      violations.push('Store 中禁止使用 any 类型')
    }
  }

  return {
    ruleName: 'store-definition',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/32-client-state-zustand.md#store-structure',
  }
}

function checkApiUsage(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.includes('/stores/')) {
    if (content.includes('fetch(') && !content.includes('apiClient')) {
      violations.push('Store 中禁止直接使用 fetch，应使用 apiClient')
    }

    if (content.includes('fetch(') && !content.includes('apiClient')) {
      violations.push('Store 中禁止直接调用 API，应通过 apiClient 进行调用')
    }
  }

  return {
    ruleName: 'api-usage',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/32-client-state-zustand.md#api-usage',
  }
}

function checkSharedTypes(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.includes('/stores/')) {
    const hasLocalTypeDefinition = /interface\s+\w+State\s*{[^}]*items:\s*Array<{/.test(content)
    if (hasLocalTypeDefinition) {
      violations.push('应使用共享类型（@shared/schemas）而非本地定义')
    }
  }

  return {
    ruleName: 'shared-types',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/32-client-state-zustand.md#shared-types',
  }
}

function checkNoComponentInStore(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.includes('/stores/')) {
    const hasComponent =
      content.includes('React.FC') ||
      /return\s*<[^>]+>/.test(content) ||
      /:\s*\(\s*\)\s*=>\s*</.test(content) ||
      /:\s*\([^)]*\)\s*=>\s*</.test(content)

    if (hasComponent) {
      violations.push('Store 中禁止定义组件')
    }
  }

  return {
    ruleName: 'no-component-in-store',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/32-client-state-zustand.md#no-components',
  }
}

function checkSelectiveSubscription(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.includes('/components/')) {
    const hasFullStoreSubscription = /const\s*\{[^}]+\}\s*=\s*use\w+Store\s*\(\s*\)/.test(content)
    if (hasFullStoreSubscription) {
      violations.push('组件应选择性订阅 Store，而非订阅整个 Store')
    }
  }

  return {
    ruleName: 'selective-subscription',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/32-client-state-zustand.md#selective-subscription',
  }
}

describe('Zustand Store Rules Documentation Tests', () => {
  it('should have zustand rule file', () => {
    const ruleFile = join(RULE_DOCS_DIR, '32-client-state-zustand.md')
    expect(existsSync(ruleFile)).toBe(true)
  })
})

describe('Store Definition Rule', () => {
  it('should pass valid store definition', () => {
    const validStore = `
import { create } from 'zustand'
import { apiClient } from '@client/services/apiClient'
import type { Item, CreateItemInput } from '@shared/schemas'

interface ItemState {
  items: Item[]
  loading: boolean
  error: string | null
  fetchItems: () => Promise<void>
  createItem: (input: CreateItemInput) => Promise<void>
}

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.items.$get()
      const result = await response.json()
      if (result.success) {
        set({ items: result.data, loading: false })
      }
    } catch (error) {
      set({ error: 'Failed to fetch items', loading: false })
    }
  },

  createItem: async (input: CreateItemInput) => {
    const response = await apiClient.api.items.$post({ json: input })
    const result = await response.json()
    if (result.success) {
      set(state => ({ items: [...state.items, result.data] }))
    }
  },
}))
`
    const result = checkStoreDefinition(validStore, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(true)
  })

  it('should fail when store does not use create', () => {
    const invalidStore = `
import { useState } from 'react'

export const useItemStore = () => {
  const [items, setItems] = useState([])
  return { items, setItems }
}
`
    const result = checkStoreDefinition(invalidStore, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('Store 文件必须使用 zustand 的 create 函数')
  })

  it('should fail when store uses default export', () => {
    const defaultExportStore = `
import { create } from 'zustand'

export default create<ItemState>((set) => ({
  items: [],
}))
`
    const result = checkStoreDefinition(defaultExportStore, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('Store 应使用命名导出，而非默认导出')
  })

  it('should fail when store uses any type', () => {
    const anyTypeStore = `
import { create } from 'zustand'

interface ItemState {
  items: any[]
  createItem: (input: any) => Promise<void>
}

export const useItemStore = create<ItemState>((set) => ({
  items: [],
  createItem: async (input) => { ... },
}))
`
    const result = checkStoreDefinition(anyTypeStore, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('Store 中禁止使用 any 类型')
  })
})

describe('API Usage Rule', () => {
  it('should pass when using apiClient', () => {
    const validApiUsage = `
import { apiClient } from '@client/services/apiClient'

export const useItemStore = create<ItemState>((set) => ({
  fetchItems: async () => {
    const response = await apiClient.api.items.$get()
    const result = await response.json()
    if (result.success) {
      set({ items: result.data })
    }
  },
}))
`
    const result = checkApiUsage(validApiUsage, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(true)
  })

  it('should fail when using fetch directly', () => {
    const fetchUsage = `
export const useItemStore = create<ItemState>((set) => ({
  fetchItems: async () => {
    const response = await fetch('/api/items')
    const data = await response.json()
    set({ items: data })
  },
}))
`
    const result = checkApiUsage(fetchUsage, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('Store 中禁止直接使用 fetch，应使用 apiClient')
  })
})

describe('Shared Types Rule', () => {
  it('should pass when using shared types', () => {
    const sharedTypesStore = `
import type { Item, CreateItemInput } from '@shared/schemas'

interface ItemState {
  items: Item[]
  createItem: (input: CreateItemInput) => Promise<void>
}

export const useItemStore = create<ItemState>((set) => ({
  items: [],
  createItem: async (input) => { ... },
}))
`
    const result = checkSharedTypes(sharedTypesStore, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(true)
  })

  it('should fail when defining local types', () => {
    const localTypesStore = `
interface ItemState {
  items: Array<{
    id: number
    name: string
  }>
}

export const useItemStore = create<ItemState>((set) => ({
  items: [],
}))
`
    const result = checkSharedTypes(localTypesStore, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('应使用共享类型（@shared/schemas）而非本地定义')
  })
})

describe('No Component in Store Rule', () => {
  it('should pass when store has no components', () => {
    const noComponentStore = `
export const useItemStore = create<ItemState>((set) => ({
  items: [],
  fetchItems: async () => { ... },
}))
`
    const result = checkNoComponentInStore(noComponentStore, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(true)
  })

  it('should fail when store contains component', () => {
    const componentInStore = `
export const useItemStore = create<ItemState>((set) => ({
  ItemComponent: () => <div>Item</div>,
  items: [],
}))
`
    const result = checkNoComponentInStore(componentInStore, 'src/client/stores/itemStore.ts')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('Store 中禁止定义组件')
  })
})

describe('Selective Subscription Rule', () => {
  it('should pass when using selective subscription', () => {
    const selectiveSubscription = `
import { useItemStore } from '@client/stores/itemStore'

export const ItemList: React.FC = () => {
  const items = useItemStore(state => state.items)
  const loading = useItemStore(state => state.loading)
  const fetchItems = useItemStore(state => state.fetchItems)

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return <div>{items.map(item => <span key={item.id}>{item.name}</span>)}</div>
}
`
    const result = checkSelectiveSubscription(
      selectiveSubscription,
      'src/client/components/ItemList.tsx'
    )
    expect(result.passed).toBe(true)
  })

  it('should fail when subscribing to entire store', () => {
    const fullSubscription = `
import { useItemStore } from '@client/stores/itemStore'

export const ItemList: React.FC = () => {
  const { items, loading, fetchItems } = useItemStore()

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return <div>{items.map(item => <span key={item.id}>{item.name}</span>)}</div>
}
`
    const result = checkSelectiveSubscription(
      fullSubscription,
      'src/client/components/ItemList.tsx'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('组件应选择性订阅 Store，而非订阅整个 Store')
  })
})
