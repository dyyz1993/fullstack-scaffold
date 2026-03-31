import path from 'path'
import { fileURLToPath } from 'url'

function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: empty or non-string')
  }
  // 防止路径遍历
  if (userId.includes('..') || userId.includes('/') || userId.includes('\\')) {
    throw new Error('Invalid userId: contains path traversal characters')
  }
  // 只允许字母、数字、横杠、下划线
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new Error('Invalid userId: contains invalid characters')
  }
}

function getProjectRoot(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.cwd()
  }
  const currentFile = fileURLToPath(import.meta.url)
  const currentDir = path.dirname(currentFile)
  return path.resolve(currentDir, '../../../../..')
}

export const Paths = {
  getProjectRoot,

  workspace(userId: string): string {
    validateUserId(userId)
    return path.join(getProjectRoot(), '.workspaces', userId)
  },

  sessions(userId: string): string {
    validateUserId(userId)
    return path.join(getProjectRoot(), '.sessions', userId)
  },

  sessionFile(userId: string, filename: string): string {
    return path.join(this.sessions(userId), filename)
  },
}
