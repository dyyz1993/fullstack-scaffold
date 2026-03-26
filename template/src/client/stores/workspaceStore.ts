import { create } from 'zustand'
import type { Workspace, UpdateWorkspaceInput, FileNode } from '@shared/modules/workspace'
export type { FileNode } from '@shared/modules/workspace'
import { apiClient } from '@client/services/apiClient'

interface WorkspaceState {
  workspace: Workspace | null
  files: FileNode | null
  selectedFile: FileNode | null
  loading: boolean
  loadingFiles: boolean
  error: string | null
  totalFiles: number
  totalDirectories: number
  totalSize: number

  fetchWorkspace: () => Promise<void>
  updateWorkspace: (input: UpdateWorkspaceInput) => Promise<void>
  fetchFiles: () => Promise<void>
  setSelectedFile: (file: FileNode | null) => void
  setError: (error: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  files: null,
  selectedFile: null,
  loading: false,
  loadingFiles: false,
  error: null,
  totalFiles: 0,
  totalDirectories: 0,
  totalSize: 0,

  fetchWorkspace: async () => {
    const { workspace, loading } = get()
    if (workspace || loading) return

    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.workspace.$get()
      const result = await response.json()
      if (result.success) {
        set({ workspace: result.data, loading: false })
      } else {
        set({ error: 'Failed to fetch workspace', loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  updateWorkspace: async (input: UpdateWorkspaceInput) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.workspace.$put({
        json: input,
      })
      const result = await response.json()
      if (result.success) {
        set({ workspace: result.data, loading: false })
      } else {
        set({ error: 'Failed to update workspace', loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  fetchFiles: async () => {
    set({ loadingFiles: true, error: null })
    try {
      const response = await apiClient.api.workspace.files.$get()
      const result = await response.json()
      if (result.success) {
        set({
          files: result.data.root,
          totalFiles: result.data.totalFiles,
          totalDirectories: result.data.totalDirectories,
          totalSize: result.data.totalSize,
          loadingFiles: false,
        })
      } else {
        set({ error: 'Failed to fetch files', loadingFiles: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loadingFiles: false,
      })
    }
  },

  setSelectedFile: file => set({ selectedFile: file }),

  setError: error => set({ error }),
}))
