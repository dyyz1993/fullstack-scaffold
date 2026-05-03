import { eq } from 'drizzle-orm'
import fs from 'fs'
import { getDb } from '../../db'
import { workspaces, type WorkspaceTable } from '../../db/schema'
import { toISOString } from '../../utils/date'
import { generateId } from '../../utils/id'
import { Paths } from './paths'

export interface Workspace {
  id: string
  name: string
  description?: string
  path: string
  userId: string
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateWorkspaceInput {
  name?: string
  description?: string
  settings?: Record<string, unknown>
}

export interface UpdateWorkspaceInput {
  name?: string | null
  description?: string | null
  settings?: Record<string, unknown> | null
}

export async function getOrCreateWorkspace(
  userId: string,
  input?: CreateWorkspaceInput
): Promise<Workspace> {
  const db = await getDb()

  const existingWorkspaces = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .limit(1)

  if (existingWorkspaces.length > 0) {
    const row = existingWorkspaces[0] as WorkspaceTable
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      path: row.path,
      userId: row.userId,
      settings: (row.settings as Record<string, unknown>) ?? undefined,
      createdAt: toISOString(row.createdAt),
      updatedAt: toISOString(row.updatedAt),
    }
  }

  const workspacePath = Paths.workspace(userId)
  const sessionsPath = Paths.sessions(userId)

  await fs.promises.mkdir(sessionsPath, { recursive: true })

  const now = new Date()
  const workspaceId = generateId('workspace')
  const newWorkspace = {
    id: workspaceId,
    name: input?.name ?? 'My Workspace',
    description: input?.description ?? null,
    path: workspacePath,
    userId,
    settings: input?.settings ?? null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(workspaces).values(newWorkspace)

  return {
    id: newWorkspace.id,
    name: newWorkspace.name,
    description: newWorkspace.description ?? undefined,
    path: newWorkspace.path,
    userId: newWorkspace.userId,
    settings: newWorkspace.settings ?? undefined,
    createdAt: toISOString(newWorkspace.createdAt),
    updatedAt: toISOString(newWorkspace.updatedAt),
  }
}

export async function getWorkspace(userId: string): Promise<Workspace | null> {
  const db = await getDb()
  const rows = await db.select().from(workspaces).where(eq(workspaces.userId, userId))

  const row = rows[0] as WorkspaceTable | undefined
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    path: row.path,
    userId: row.userId,
    settings: (row.settings as Record<string, unknown>) ?? undefined,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }
}
export async function updateWorkspace(
  userId: string,
  input: UpdateWorkspaceInput
): Promise<Workspace | null> {
  const db = await getDb()

  const existing = await getWorkspace(userId)
  if (!existing) return null

  const now = new Date()
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  }

  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.settings !== undefined) updateData.settings = input.settings

  await db.update(workspaces).set(updateData).where(eq(workspaces.userId, userId))

  return {
    id: existing.id,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    path: existing.path,
    userId: existing.userId,
    settings: input.settings !== undefined ? (input.settings ?? undefined) : existing.settings,
    createdAt: existing.createdAt,
    updatedAt: toISOString(now),
  }
}
export async function deleteWorkspace(userId: string): Promise<void> {
  const db = await getDb()
  await db.delete(workspaces).where(eq(workspaces.userId, userId))
}
