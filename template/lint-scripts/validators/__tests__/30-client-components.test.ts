/**
 * Client 组件开发规范测试
 *
 * 验证规则文档中描述的组件模式是否被正确遵循
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'

const TEMPLATE_ROOT = join(__dirname, '..', '..', '..', '..', 'template')
const RULE_DOCS_DIR = join(TEMPLATE_ROOT, '.claude', 'rules')

interface RuleCheckResult {
  ruleName: string
  passed: boolean
  violations: string[]
  docLink: string
}

function checkComponentDefinition(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.endsWith('.tsx') && filePath.includes('/components/')) {
    if (!content.includes('React.FC') && !content.includes('forwardRef')) {
      violations.push('组件必须使用 React.FC 或 forwardRef 定义')
    }

    if (content.includes('export default')) {
      violations.push('组件应使用命名导出，而非默认导出')
    }

    if (content.includes(': any')) {
      violations.push('组件中禁止使用 any 类型')
    }
  }

  return {
    ruleName: 'component-definition',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/30-client-components.md#component-design',
  }
}

function checkPropsInterface(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.endsWith('.tsx') && filePath.includes('/components/')) {
    if (!content.includes('interface') && !content.includes('type') && content.includes('Props')) {
      violations.push('组件应明确定义 Props 接口')
    }

    const hasInlineObjectProps = /<[A-Z]\w+\s+[^>]*=\{\{\s*[^}]+\}\}/.test(content)
    if (hasInlineObjectProps) {
      violations.push('禁止内联对象作为 Props，应使用稳定的引用')
    }
  }

  return {
    ruleName: 'props-interface',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/30-client-components.md#props-interface',
  }
}

function checkStyling(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.endsWith('.tsx') && filePath.includes('/components/')) {
    if (content.includes('style={{')) {
      violations.push('应使用 Tailwind CSS 而非内联样式')
    }
  }

  return {
    ruleName: 'styling',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/30-client-components.md#styling',
  }
}

function checkApiUsage(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.endsWith('.tsx') && filePath.includes('/components/')) {
    if (content.includes('fetch(') && !content.includes('apiClient')) {
      violations.push('组件中禁止直接使用 fetch，应使用 apiClient 或 Store')
    }

    if (content.includes('fetch(') && !content.includes('useStore')) {
      violations.push('组件中禁止直接调用 API，应通过 Store 进行状态管理')
    }
  }

  return {
    ruleName: 'api-usage',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/30-client-components.md#api-usage',
  }
}

function checkSharedTypes(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.endsWith('.tsx') && filePath.includes('/components/')) {
    const hasLocalTypeDefinition =
      /interface\s+\w+Props\s*{[^}]*status:\s*['"]active['"]\s*\|/.test(content)
    if (hasLocalTypeDefinition) {
      violations.push('应使用共享类型（@shared/schemas）而非本地定义')
    }
  }

  return {
    ruleName: 'shared-types',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/30-client-components.md#shared-types',
  }
}

function checkTestId(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.endsWith('.tsx') && filePath.includes('/components/')) {
    const hasTestId = content.includes('data-testid')
    const hasTestFile =
      existsSync(filePath.replace('.tsx', '.test.tsx')) ||
      existsSync(
        filePath.replace('/components/', '/components/__tests__/').replace('.tsx', '.test.tsx')
      )

    if (hasTestFile && !hasTestId) {
      violations.push('有测试文件的组件应包含 data-testid 属性')
    }
  }

  return {
    ruleName: 'test-id',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/30-client-components.md#testing',
  }
}

describe('Client Components Rules Documentation Tests', () => {
  it('should have client-components rule file', () => {
    const ruleFile = join(RULE_DOCS_DIR, '30-client-components.md')
    expect(existsSync(ruleFile)).toBe(true)
  })
})

describe('Component Definition Rule', () => {
  it('should pass valid component definition', () => {
    const validComponent = `
import { useItemStore } from '@client/stores/itemStore'

interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {label}
    </button>
  )
}
`
    const result = checkComponentDefinition(validComponent, 'src/client/components/Button.tsx')
    expect(result.passed).toBe(true)
  })

  it('should fail when component uses default export', () => {
    const defaultExportComponent = `
export default function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>
}
`
    const result = checkComponentDefinition(
      defaultExportComponent,
      'src/client/components/Button.tsx'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('组件应使用命名导出，而非默认导出')
  })

  it('should fail when component uses any type', () => {
    const anyTypeComponent = `
interface ButtonProps {
  data: any
  onChange: (value: any) => void
}

export const Button: React.FC<ButtonProps> = ({ data, onChange }) => {
  return <button onClick={() => onChange(data)}>{data}</button>
}
`
    const result = checkComponentDefinition(anyTypeComponent, 'src/client/components/Button.tsx')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('组件中禁止使用 any 类型')
  })
})

describe('Props Interface Rule', () => {
  it('should pass valid props interface', () => {
    const validProps = `
import type { Item, ItemStatus } from '@shared/schemas'

interface ItemCardProps {
  item: Item
  onStatusChange: (status: ItemStatus) => void
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onStatusChange }) => {
  return <div>{item.name}</div>
}
`
    const result = checkPropsInterface(validProps, 'src/client/components/ItemCard.tsx')
    expect(result.passed).toBe(true)
  })

  it('should fail when using inline object as props', () => {
    const inlineObjectProps = `
import { useMemo } from 'react'

export const Parent: React.FC = () => {
  return <ItemCard item={{ id: 1, name: 'Item' }} />
}
`
    const result = checkPropsInterface(inlineObjectProps, 'src/client/components/Parent.tsx')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('禁止内联对象作为 Props，应使用稳定的引用')
  })
})

describe('Styling Rule', () => {
  it('should pass when using Tailwind CSS', () => {
    const tailwindComponent = `
export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {children}
    </div>
  )
}
`
    const result = checkStyling(tailwindComponent, 'src/client/components/Card.tsx')
    expect(result.passed).toBe(true)
  })

  it('should fail when using inline styles', () => {
    const inlineStyleComponent = `
export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div style={{ padding: '16px', backgroundColor: 'white' }}>
      <h3 style={{ fontSize: '18px' }}>{title}</h3>
      {children}
    </div>
  )
}
`
    const result = checkStyling(inlineStyleComponent, 'src/client/components/Card.tsx')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('应使用 Tailwind CSS 而非内联样式')
  })
})

describe('API Usage Rule', () => {
  it('should pass when using Store', () => {
    const storeComponent = `
import { useItemStore } from '@client/stores/itemStore'

export const ItemList: React.FC = () => {
  const items = useItemStore(state => state.items)
  const fetchItems = useItemStore(state => state.fetchItems)

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return <div>{items.map(item => <span key={item.id}>{item.name}</span>)}</div>
}
`
    const result = checkApiUsage(storeComponent, 'src/client/components/ItemList.tsx')
    expect(result.passed).toBe(true)
  })

  it('should fail when using fetch directly', () => {
    const fetchComponent = `
export const ItemList: React.FC = () => {
  const [items, setItems] = useState([])

  useEffect(() => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => setItems(data))
  }, [])

  return <div>...</div>
}
`
    const result = checkApiUsage(fetchComponent, 'src/client/components/ItemList.tsx')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('组件中禁止直接使用 fetch，应使用 apiClient 或 Store')
  })
})

describe('Shared Types Rule', () => {
  it('should pass when using shared types', () => {
    const sharedTypesComponent = `
import type { Item, ItemStatus } from '@shared/schemas'

interface ItemCardProps {
  item: Item
  onStatusChange: (status: ItemStatus) => void
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  return <div>{item.name}</div>
}
`
    const result = checkSharedTypes(sharedTypesComponent, 'src/client/components/ItemCard.tsx')
    expect(result.passed).toBe(true)
  })

  it('should fail when defining local status type', () => {
    const localTypeComponent = `
interface ItemCardProps {
  item: {
    id: number
    name: string
    status: 'active' | 'inactive'
  }
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  return <div>{item.name}</div>
}
`
    const result = checkSharedTypes(localTypeComponent, 'src/client/components/ItemCard.tsx')
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('应使用共享类型（@shared/schemas）而非本地定义')
  })
})
