import fs from 'fs'
import path from 'path'
import { getOrCreateWorkspace } from './workspace-service'
import { Paths } from './paths'

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number
  modifiedAt?: string
  children?: FileNode[]
}

export interface WorkspaceFiles {
  root: FileNode
  totalFiles: number
  totalDirectories: number
  totalSize: number
}

function shouldIgnoreFile(name: string): boolean {
  const ignorePatterns = ['.DS_Store', '.env', '.git', 'node_modules', '.tmp', '.cache']
  return ignorePatterns.some(pattern => name.includes(pattern))
}

async function buildFileTree(dirPath: string, relativePath: string = ''): Promise<FileNode> {
  const stats = await fs.promises.stat(dirPath)
  const name = path.basename(dirPath)

  const node: FileNode = {
    id: relativePath || '/',
    name,
    type: stats.isDirectory() ? 'directory' : 'file',
    path: relativePath || '/',
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  }

  if (stats.isDirectory()) {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    const children: FileNode[] = []

    for (const entry of entries) {
      if (shouldIgnoreFile(entry.name)) continue

      const childPath = path.join(dirPath, entry.name)
      const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : `/${entry.name}`

      const childNode = await buildFileTree(childPath, childRelativePath)
      children.push(childNode)
    }

    node.children = children.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name)
      return a.type === 'directory' ? -1 : 1
    })
  }

  return node
}

function countFilesAndDirectories(node: FileNode): {
  files: number
  directories: number
  size: number
} {
  let files = 0
  let directories = 0
  let size = 0

  if (node.type === 'file') {
    files = 1
    size = node.size || 0
  } else {
    directories = 1
    if (node.children) {
      for (const child of node.children) {
        const counts = countFilesAndDirectories(child)
        files += counts.files
        directories += counts.directories
        size += counts.size
      }
    }
  }

  return { files, directories, size }
}

export async function getWorkspaceFiles(userId: string): Promise<WorkspaceFiles> {
  const workspace = await getOrCreateWorkspace(userId)
  const workspacePath = workspace.path

  if (!fs.existsSync(workspacePath)) {
    await fs.promises.mkdir(workspacePath, { recursive: true })
    await fs.promises.mkdir(Paths.sessions(userId), { recursive: true })
  }

  const root = await buildFileTree(workspacePath)
  const counts = countFilesAndDirectories(root)

  return {
    root,
    totalFiles: counts.files,
    totalDirectories: counts.directories - 1,
    totalSize: counts.size,
  }
}

export async function getFileContent(userId: string, filePath: string): Promise<string | null> {
  const workspace = await getOrCreateWorkspace(userId)
  const fullPath = path.join(workspace.path, filePath)

  if (!fullPath.startsWith(workspace.path)) {
    throw new Error('Access denied: file path outside workspace')
  }

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const stats = await fs.promises.stat(fullPath)
  if (stats.isDirectory()) {
    return null
  }

  if (stats.size > 1024 * 1024) {
    throw new Error('File too large to preview')
  }

  return await fs.promises.readFile(fullPath, 'utf-8')
}
