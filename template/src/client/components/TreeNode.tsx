import React, { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileJson,
  FileText,
} from 'lucide-react'
import type { FileNode } from '../stores/workspaceStore'

interface TreeNodeProps {
  node: FileNode
  level: number
  searchQuery?: string
  onSelect?: (node: FileNode) => void
}

export const TreeNode: React.FC<TreeNodeProps> = ({ node, level, searchQuery, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2)

  const isDirectory = node.type === 'directory'
  const hasChildren = isDirectory && node.children && node.children.length > 0

  const matchesSearch = searchQuery
    ? node.name.toLowerCase().includes(searchQuery.toLowerCase())
    : true

  const shouldShow =
    matchesSearch ||
    (isDirectory &&
      hasChildren &&
      node.children!.some(child =>
        child.name.toLowerCase().includes(searchQuery?.toLowerCase() || '')
      ))

  if (!shouldShow && searchQuery) return null

  const getFileIcon = () => {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-500" />
      )
    }

    const ext = node.name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'json':
      case 'jsonl':
        return <FileJson className="w-4 h-4 text-yellow-600" />
      case 'md':
      case 'txt':
        return <FileText className="w-4 h-4 text-gray-600" />
      default:
        return <File className="w-4 h-4 text-gray-400" />
    }
  }

  const handleClick = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded)
    } else if (onSelect) {
      onSelect(node)
    }
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center gap-1 py-1 px-2 rounded cursor-pointer
          hover:bg-gray-100 transition-colors
          ${matchesSearch && searchQuery ? 'bg-yellow-50' : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory && hasChildren && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </span>
        )}
        {isDirectory && !hasChildren && <span className="w-4" />}

        {getFileIcon()}

        <span className="flex-1 text-sm text-gray-700 truncate">{node.name}</span>

        {!isDirectory && node.size && (
          <span className="text-xs text-gray-400 ml-2">{formatSize(node.size)}</span>
        )}
      </div>

      {isDirectory && isExpanded && hasChildren && (
        <div className="transition-all duration-200">
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              searchQuery={searchQuery}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
