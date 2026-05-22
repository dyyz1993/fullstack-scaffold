// template/src/server/module-{name}/services/{name}-service.ts
import type { {Name}, Create{Name}Input, Update{Name}Input } from '@shared/schemas'

// === In-memory store (replace with DB) ===

const items = new Map<number, {Name}>()
let nextId = 1

// === CRUD Operations ===

export async function list{Names}(): Promise<{Name}[]> {
  return Array.from(items.values())
}

export async function get{Name}ById(id: number): Promise<{Name} | undefined> {
  return items.get(id)
}

export async function create{Name}(input: Create{Name}Input): Promise<{Name}> {
  const item: {Name} = {
    id: nextId++,
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as {Name}
  items.set(item.id, item)
  return item
}

export async function update{Name}(id: number, input: Update{Name}Input): Promise<{Name} | undefined> {
  const existing = items.get(id)
  if (!existing) return undefined

  const updated: {Name} = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  } as {Name}
  items.set(id, updated)
  return updated
}

export async function delete{Name}(id: number): Promise<boolean> {
  return items.delete(id)
}
