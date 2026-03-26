import path from 'path'
import { fileURLToPath } from 'url'

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
    return path.join(getProjectRoot(), '.workspaces', userId)
  },

  sessions(userId: string): string {
    return path.join(getProjectRoot(), '.sessions', userId)
  },

  sessionFile(userId: string, filename: string): string {
    return path.join(this.sessions(userId), filename)
  },
}
