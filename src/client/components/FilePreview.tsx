import { useState, useEffect, useCallback } from 'react'
import { LazyMonacoEditor } from './LazyMonacoEditor'
import { X, FileText, File, Loader2 } from 'lucide-react'
import { languagePackManager } from '@client/services/LanguagePackManager'
import { useAgentStore } from '../stores/agentStore'
import { apiClient } from '@client/services/apiClient'

interface FilePreviewProps {
  file: {
    name: string
    path: string
    type: 'file' | 'directory'
  } | null
  onClose: () => void
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const workspace = useAgentStore(state => state.workspace)

  const fetchFileContent = useCallback(
    async (filePath: string) => {
      if (!workspace?.path) {
        setError('Workspace not available')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const relativePath = filePath.replace(workspace.path, '').replace(/^\//, '')
        const encodedPath = encodeURIComponent(relativePath)
        const response = await apiClient.api.workspace.files[':path'].$get({
          param: { path: encodedPath },
        })

        const result = await response.json()
        if (result.success) {
          setContent(result.data?.content || '')
        } else {
          throw new Error(result.error || 'Failed to fetch file')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file')
        setContent('')
      } finally {
        setLoading(false)
      }
    },
    [workspace?.path]
  )

  useEffect(() => {
    if (file && file.type === 'file') {
      fetchFileContent(file.path)
    } else {
      setContent('')
    }
  }, [file, fetchFileContent])

  if (!file) {
    return null
  }

  const language = languagePackManager.getLanguageByExtension(file.name)

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-500">Loading file...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-2 text-center">
              <File className="w-12 h-12 text-gray-300" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        ) : (
          <LazyMonacoEditor
            value={content}
            filename={file.name}
            language={language}
            readOnly={true}
            height="100%"
          />
        )}
      </div>
    </div>
  )
}
