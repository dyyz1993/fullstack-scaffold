/**
 * @framework-baseline entry-stores-v1
 *
 * Entry SSR store 种子（全量版）。
 * 本文件在模板仓库中为全量实现；CLI 脚手架时会按 preset 重新生成
 * （src/generators/entry-stores.ts），preset 不含 todo 模块时为空实现，
 * 避免 entry-server 悬空导入导致构建失败。
 */

import { useTodoStore } from './todoStore'
import type { Todo } from '@shared/schemas'

export interface SSRData {
  todos?: Todo[]
  /** content 模块 ISR 数据（列表/详情首帧，页面从 __SSR_DATA__ 读取） */
  contents?: unknown[]
  content?: Record<string, unknown> | null
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
