import React, { useEffect } from 'react'
import { FolderOpen, File, HardDrive } from 'lucide-react'
import { FileTree } from './FileTree'
import { useAgentStore } from '../stores/agentStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { languagePackManager } from '@client/services/LanguagePackManager'
import type { FileNode } from '../stores/workspaceStore'

const extractFileNames = (node: FileNode): string[] => {
  const names: string[] = []
  if (node.type === 'file') {
    names.push(node.name)
  }
  if (node.children) {
    for (const child of node.children) {
      names.push(...extractFileNames(child))
    }
  }
  return names
}

export const WorkspacePanel: React.FC = () => {
  const workspace = useAgentStore(state => state.workspace)
  const files = useWorkspaceStore(state => state.files)
  const loadingFiles = useWorkspaceStore(state => state.loadingFiles)
  const fetchFiles = useWorkspaceStore(state => state.fetchFiles)
  const setSelectedFile = useWorkspaceStore(state => state.setSelectedFile)
  const totalFiles = useWorkspaceStore(state => state.totalFiles)
  const totalDirectories = useWorkspaceStore(state => state.totalDirectories)
  const totalSize = useWorkspaceStore(state => state.totalSize)

  useEffect(() => {
    if (workspace && !files) {
      fetchFiles()
    }
  }, [workspace, files, fetchFiles])

  useEffect(() => {
    if (files) {
      const fileNames = extractFileNames(files)
      languagePackManager.preloadLanguages(fileNames)
    }
  }, [files])

  const handleRefresh = () => {
    fetchFiles()
  }

  const handleSelectFile = (node: FileNode) => {
    if (node.type === 'file') {
      setSelectedFile(node)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">{workspace?.name || 'Workspace'}</h3>
        </div>
        {workspace?.description && (
          <p className="text-sm text-gray-500 mb-2">{workspace.description}</p>
        )}
        {workspace?.path && (
          <p className="text-xs text-gray-400 truncate" title={workspace.path}>
            {workspace.path}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <FileTree
          root={files || null}
          loading={loadingFiles}
          onRefresh={handleRefresh}
          onSelectFile={handleSelectFile}
        />
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col">
            <div className="flex items-center justify-center gap-1 text-gray-600">
              <File className="w-3 h-3" />
              <span className="text-xs font-medium">{totalFiles}</span>
            </div>
            <span className="text-xs text-gray-400">Files</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-center gap-1 text-gray-600">
              <FolderOpen className="w-3 h-3" />
              <span className="text-xs font-medium">{totalDirectories}</span>
            </div>
            <span className="text-xs text-gray-400">Dirs</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-center gap-1 text-gray-600">
              <HardDrive className="w-3 h-3" />
              <span className="text-xs font-medium">{formatSize(totalSize)}</span>
            </div>
            <span className="text-xs text-gray-400">Size</span>
          </div>
        </div>
      </div>
    </div>
  )
}
