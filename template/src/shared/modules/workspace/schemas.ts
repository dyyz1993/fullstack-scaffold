import { z } from '@hono/zod-openapi'

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  path: z.string(),
  userId: z.string(),
  settings: z.record(z.string(), z.unknown()).nullish(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').nullish(),
  description: z.string().nullish(),
  settings: z.record(z.string(), z.unknown()).nullish(),
})

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').nullish(),
  description: z.string().nullish(),
  settings: z.record(z.string(), z.unknown()).nullish(),
})

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number | null
  modifiedAt?: string | null
  children?: FileNode[] | null
}

const FileNodeZodSchema: z.ZodType<FileNode> = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['file', 'directory']),
  path: z.string(),
  size: z.number().nullish(),
  modifiedAt: z.string().nullish(),
  children: z.array(z.any()).nullish(),
})

export const FileNodeSchema = FileNodeZodSchema

export const WorkspaceFilesSchema = z.object({
  root: FileNodeSchema,
  totalFiles: z.number(),
  totalDirectories: z.number(),
  totalSize: z.number(),
})

export const FileContentSchema = z.object({
  content: z.string(),
})

export const DeleteWorkspaceResponseSchema = z.object({
  success: z.literal(true),
})

export type Workspace = z.infer<typeof WorkspaceSchema>
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>
export type WorkspaceFiles = z.infer<typeof WorkspaceFilesSchema>
