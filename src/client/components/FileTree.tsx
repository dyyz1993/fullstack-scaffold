import React, { useState } from 'react'
import { Search, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { TreeNode } from './TreeNode'
import type { FileNode } from '../stores/workspaceStore'

interface FileTreeProps {
  root: FileNode | null
  loading?: boolean
  onRefresh?: () => void
  onSelectFile?: (node: FileNode) => void
}

export const FileTree: React.FC<FileTreeProps> = ({ root, loading, onRefresh, onSelectFile }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandAll, setExpandAll] = useState(false)

  const handleExpandAll = () => {
    setExpandAll(!expandAll)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!root) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-sm">No files found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            {expandAll ? (
              <>
                <ChevronDown className="w-3 h-3" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronRight className="w-3 h-3" />
                Expand All
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <TreeNode node={root} level={0} searchQuery={searchQuery} onSelect={onSelectFile} />
      </div>
    </div>
  )
}
