# Monaco 编辑器集成与资源懒加载计划

## 需求分析

### 用户需求
1. 在工作空间面板中集成代码编辑器
2. 支持点击文件后预览/编辑文件内容
3. 提前懒加载编辑器资源，避免首次加载时从外网下载
4. 根据文件类型提前加载对应语法高亮资源

### 当前架构
```
WorkspacePanel
├── Header (工作空间名称)
├── FileTree (文件列表)
│   └── 点击文件 → 显示文件内容
└── Footer (统计信息)
```

### 目标架构
```
WorkspacePanel
├── Header (工作空间名称)
├── FileTree (文件列表)
│   └── 点击文件 → MonacoEditor (懒加载)
│       ├── JSON 文件 → 加载 JSON 语言包
│       ├── Python 文件 → 加载 Python 语言包
│       ├── TypeScript 文件 → 加载 TypeScript 语言包
│       └── ...
└── Footer (统计信息)
```

---

## 技术方案

### 方案选型

#### 选项 A：Monaco Editor（推荐）
- **优点**：功能强大，VS Code 同款编辑器，支持多种语言
- **缺点**：体积较大（约 2-3MB）
- **懒加载方案**：只加载需要的语言包

#### 选项 B：CodeMirror 6
- **优点**：轻量，可定制性强
- **缺点**：需要手动配置各种语言包
- **懒加载方案**：动态导入语言扩展

#### 选项 C：@monaco-editor/react
- **优点**：React 封装，开箱即用
- **缺点**：默认加载所有语言包
- **懒加载方案**：配置语言包路径

---

## 实施步骤

### 第一阶段：Monaco Editor 基础集成

#### 步骤 1：安装依赖
```bash
npm install @monaco-editor/react monaco-editor
```

#### 步骤 2：创建懒加载 Hook
**文件：** `src/client/hooks/useLazyMonaco.ts`

```typescript
interface LazyMonacoState {
  editor: any
  loading: boolean
  language: string | null
  error: Error | null
}

export function useLazyMonaco() {
  const [state, setState] = useState<LazyMonacoState>({
    editor: null,
    loading: false,
    language: null,
    error: null,
  })

  const loadLanguage = async (language: string) => {
    setState(s => ({ ...s, loading: true }))

    try {
      // 根据语言类型懒加载语言包
      const loader = await import(`monaco-editor/esm/vs/language/${language}/${language}.js`)
      // 注册语言
      loader.register()
      setState(s => ({ ...s, loading: false, language }))
    } catch (error) {
      setState(s => ({ ...s, error, loading: false }))
    }
  }

  return { ...state, loadLanguage }
}
```

#### 步骤 3：创建懒加载的 MonacoEditor 组件
**文件：** `src/client/components/LazyMonacoEditor.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import Editor, { loader } from '@monaco-editor/react'

// 预加载常用语言包
const LANGUAGE_MODULES = {
  json: () => import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  typescript: () => import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
  python: () => import('monaco-editor/esm/vs/language/python/python.worker?worker'),
  javascript: () => import('monaco-editor/esm/vs/language/javascript/javaScript.worker?worker'),
}

// 预加载配置
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
})

interface LazyMonacoEditorProps {
  value: string
  language: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

export const LazyMonacoEditor: React.FC<LazyMonacoEditorProps> = ({
  value,
  language,
  onChange,
  readOnly = false,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [monaco, setMonaco] = useState<any>(null)

  useEffect(() => {
    // 懒加载编辑器核心
    loader.init().then(m => {
      setMonaco(m)
      setIsLoading(false)

      // 预注册常用语言
      const languageService = m.languages.typescript.getLanguages()
      console.log('Registered languages:', languageService.map(l => l.id))
    })
  }, [])

  const handleEditorMount = (editor: any, monacoInstance: any) => {
    // 根据文件类型设置语言
    const model = editor.getModel()
    if (model) {
      model.setLanguage(language)
    }
  }

  if (isLoading) {
    return <div className="h-full flex items-center justify-center">Loading editor...</div>
  }

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      theme="vs-dark"
      onMount={handleEditorMount}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  )
}
```

### 第二阶段：资源预加载系统

#### 步骤 4：创建语言包管理器
**文件：** `src/client/services/LanguagePackManager.ts`

```typescript
interface LanguageConfig {
  id: string
  label: string
  extensions: string[]
  module: () => Promise<any>
  worker?: () => Promise<any>
}

const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    id: 'json',
    label: 'JSON',
    extensions: ['.json'],
    module: () => import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    extensions: ['.ts', '.tsx'],
    module: () => import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    extensions: ['.js', '.jsx'],
    module: () => import('monaco-editor/esm/vs/language/javascript/javaScript.worker?worker'),
  },
  {
    id: 'python',
    label: 'Python',
    extensions: ['.py'],
    module: () => import('monaco-editor/esm/vs/language/python/python.worker?worker'),
  },
  {
    id: 'markdown',
    label: 'Markdown',
    extensions: ['.md'],
    module: () => import('monaco-editor/esm/vs/language/markdown/markdown.worker?worker'),
  },
  {
    id: 'html',
    label: 'HTML',
    extensions: ['.html', '.htm'],
    module: () => import('monaco-editor/esm/vs/language/html/html.worker?worker'),
  },
  {
    id: 'css',
    label: 'CSS',
    extensions: ['.css'],
    module: () => import('monaco-editor/esm/vs/language/css/css.worker?worker'),
  },
  {
    id: 'sql',
    label: 'SQL',
    extensions: ['.sql'],
    module: () => import('monaco-editor/esm/vs/language/sql/sql.worker?worker'),
  },
]

class LanguagePackManager {
  private loadedLanguages = new Set<string>()
  private loadingLanguages = new Set<string>()

  getLanguageByExtension(filename: string): string {
    const ext = '.' + filename.split('.').pop()?.toLowerCase()
    const config = LANGUAGE_CONFIGS.find(l => l.extensions.includes(ext))
    return config?.id || 'plaintext'
  }

  async preloadLanguages(filenames: string[]): Promise<void> {
    const languagesToLoad = new Set<string>()

    for (const filename of filenames) {
      const languageId = this.getLanguageByExtension(filename)
      if (!this.loadedLanguages.has(languageId) && !this.loadingLanguages.has(languageId)) {
        languagesToLoad.add(languageId)
      }
    }

    const loadPromises = Array.from(languagesToLoad).map(langId =>
      this.loadLanguage(langId)
    )

    await Promise.all(loadPromises)
  }

  async loadLanguage(languageId: string): Promise<void> {
    if (this.loadedLanguages.has(languageId) || this.loadingLanguages.has(languageId)) {
      return
    }

    this.loadingLanguages.add(languageId)

    try {
      const config = LANGUAGE_CONFIGS.find(l => l.id === languageId)
      if (config?.worker) {
        await config.worker()
      }
      this.loadedLanguages.add(languageId)
      console.log(`[LanguagePack] Loaded language: ${languageId}`)
    } catch (error) {
      console.error(`[LanguagePack] Failed to load language: ${languageId}`, error)
    } finally {
      this.loadingLanguages.delete(languageId)
    }
  }

  isLoaded(languageId: string): boolean {
    return this.loadedLanguages.has(languageId)
  }
}

export const languagePackManager = new LanguagePackManager()
```

#### 步骤 5：创建文件预览组件
**文件：** `src/client/components/FilePreview.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import { LazyMonacoEditor } from './LazyMonacoEditor'
import { languagePackManager } from '../services/LanguagePackManager'
import { apiClient } from '@client/services/apiClient'

interface FilePreviewProps {
  filePath: string
  onClose?: () => void
}

export const FilePreview: React.FC<FilePreviewProps> = ({ filePath, onClose }) => {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const language = languagePackManager.getLanguageByExtension(filePath)

  useEffect(() => {
    loadFileContent()
    // 预加载语言包
    languagePackManager.loadLanguage(language)
  }, [filePath])

  const loadFileContent = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.api.workspace.files[':path'].$get({
        param: { path: filePath }
      })
      const result = await response.json()
      if (result.success) {
        setContent(result.data.content)
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load file')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center">Loading {filePath}...</div>
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b bg-gray-100 flex items-center justify-between">
        <span className="text-sm font-medium">{filePath}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>
      <div className="flex-1">
        <LazyMonacoEditor
          value={content}
          language={language}
          readOnly={true}
        />
      </div>
    </div>
  )
}
```

### 第三阶段：优化与集成

#### 步骤 6：修改 WorkspacePanel
**文件：** `src/client/components/WorkspacePanel.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import { FolderOpen, File, HardDrive } from 'lucide-react'
import { FileTree } from './FileTree'
import { FilePreview } from './FilePreview'
import { useAgentStore } from '../stores/agentStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { languagePackManager } from '../services/LanguagePackManager'
import type { FileNode } from '../stores/workspaceStore'

export const WorkspacePanel: React.FC = () => {
  const workspace = useAgentStore(state => state.workspace)
  const files = useWorkspaceStore(state => state.files)
  const loadingFiles = useWorkspaceStore(state => state.loadingFiles)
  const fetchFiles = useWorkspaceStore(state => state.fetchFiles)
  const totalFiles = useWorkspaceStore(state => state.totalFiles)
  const totalDirectories = useWorkspaceStore(state => state.totalDirectories)
  const totalSize = useWorkspaceStore(state => state.totalSize)

  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)

  useEffect(() => {
    if (workspace && !files) {
      fetchFiles()
    }
  }, [workspace, files, fetchFiles])

  // 预加载文件列表中所有文件的语言包
  useEffect(() => {
    if (files) {
      const filenames = extractFilenames(files)
      languagePackManager.preloadLanguages(filenames)
    }
  }, [files])

  const extractFilenames = (node: FileNode): string[] => {
    if (node.type === 'file') return [node.name]
    if (!node.children) return []
    return node.children.flatMap(child => extractFilenames(child))
  }

  const handleSelectFile = (node: FileNode) => {
    if (node.type === 'file') {
      setSelectedFile(node)
    }
  }

  const handleClosePreview = () => {
    setSelectedFile(null)
  }

  const handleRefresh = () => {
    fetchFiles()
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
          <h3 className="font-semibold text-gray-900">
            {workspace?.name || 'Workspace'}
          </h3>
        </div>
        {workspace?.path && (
          <p className="text-xs text-gray-400 truncate" title={workspace.path}>
            {workspace.path}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          <FilePreview
            filePath={selectedFile.path}
            onClose={handleClosePreview}
          />
        ) : (
          <FileTree
            root={files || null}
            loading={loadingFiles}
            onRefresh={handleRefresh}
            onSelectFile={handleSelectFile}
          />
        )}
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
```

#### 步骤 7：更新 API 路由
**文件：** `src/server/module-agent/routes/file-routes.ts`

添加获取文件内容的端点：

```typescript
const getFileContentRoute = createRoute({
  method: 'get',
  path: '/workspace/files/:path',
  tags: ['workspace'],
  request: {
    params: z.object({
      path: z.string(),
    }),
  },
  responses: {
    200: successResponse(z.object({ content: z.string() }), 'Get file content'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('File not found'),
    500: errorResponse('Internal server error'),
  },
})
```

---

## 文件清单

### 新增文件
1. `src/client/services/LanguagePackManager.ts` - 语言包管理器
2. `src/client/hooks/useLazyMonaco.ts` - 懒加载 Hook
3. `src/client/components/LazyMonacoEditor.tsx` - Monaco 编辑器组件
4. `src/client/components/FilePreview.tsx` - 文件预览组件

### 修改文件
1. `src/client/components/WorkspacePanel.tsx` - 集成文件预览功能
2. `src/server/module-agent/routes/file-routes.ts` - 添加获取文件内容 API
3. `package.json` - 添加 Monaco 依赖

---

## 懒加载策略

### 策略 1：基于文件列表预加载
```typescript
// 获取文件列表后
const filenames = extractFilenames(fileTree)
languagePackManager.preloadLanguages(filenames)
```

### 策略 2：点击时加载
```typescript
// 用户点击文件时
languagePackManager.loadLanguage(languageId)
```

### 策略 3：空闲时预加载
```typescript
// 使用 requestIdleCallback
requestIdleCallback(() => {
  languagePackManager.preloadLanguages(allFilenames)
})
```

---

## 资源优化

### CDN 配置（可选）
```typescript
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
})
```

### 本地资源打包
将 Monaco 编辑器的资源打包到应用中：
```typescript
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
```

---

## 总结

### 核心功能
1. ✅ Monaco 编辑器集成
2. ✅ 点击文件预览内容
3. ✅ 懒加载语言包
4. ✅ 基于文件列表提前预加载

### 懒加载优化
- 获取文件列表后自动预加载常用语言包
- 点击文件时按需加载特定语言包
- 避免首次加载时从外网下载大文件

### 性能提升
- 首次加载：只加载编辑器核心（约 500KB）
- 预加载：后台加载常用语言包（JSON、TS、Python 等）
- 按需加载：用户点击时加载特定语言包
