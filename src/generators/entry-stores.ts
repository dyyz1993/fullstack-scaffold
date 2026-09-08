import type { ResolvedPreset } from './template-generator'

/**
 * 生成 src/client/entry-stores.ts：entry-server 的 store 种子逻辑。
 *
 * 背景：entry-server.tsx 曾硬编码 import todoStore 并预填充，preset 裁掉
 * todos 模块后（forum 等）构建因悬空导入失败。生成器只在选中 todo 模块
 * 时生成 todoStore 种子实现，否则生成空实现。
 */
export function generateEntryStores(
  resolved: ResolvedPreset,
  moduleFileExists: (moduleName: string, relPath: string) => boolean
): string {
  const hasTodos = resolved.modules.has('todos') && moduleFileExists('todos', 'todoStore.ts')

  if (!hasTodos) {
    return `/**
 * Entry SSR store 种子（本文件由 CLI 生成，勿手改）。
 * 当前 preset 不含 todo 模块：无 store 需要预填充，全部为空实现。
 */

export interface SSRData {
  [key: string]: unknown
}

export function snapshotEntryStores(): Record<string, unknown> {
  return {}
}

export function seedEntryStores(_data: SSRData): void {}

export function restoreEntryStores(_snapshot: Record<string, unknown>): void {}
`
  }

  return `/**
 * Entry SSR store 种子（本文件由 CLI 生成，勿手改）。
 * todo 模块在选中列表中：预填充 todoStore 供 ISR 渲染真实内容。
 */

import { useTodoStore } from './todoStore'
import type { Todo } from '@shared/schemas'

export interface SSRData {
  todos?: Todo[]
  [key: string]: unknown
}

export interface EntryStoreSnapshot {
  todos: Todo[]
  loading: boolean
}

export function snapshotEntryStores(): EntryStoreSnapshot {
  const state = useTodoStore.getState()
  return { todos: state.todos, loading: state.loading }
}

export function seedEntryStores(data: SSRData): void {
  if (data.todos) {
    useTodoStore.setState({ todos: data.todos, loading: false })
  }
}

export function restoreEntryStores(snapshot: EntryStoreSnapshot): void {
  useTodoStore.setState({ todos: snapshot.todos, loading: snapshot.loading })
}
`
}
