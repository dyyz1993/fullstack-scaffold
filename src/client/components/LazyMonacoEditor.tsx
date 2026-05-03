import { loader } from '@monaco-editor/react'
import Editor from '@monaco-editor/react'
import type { OnMount, OnChange } from '@monaco-editor/react'
import { languagePackManager } from '@client/services/LanguagePackManager'

loader.config({
  paths: {
    vs: '/monaco-editor/vs',
  },
})

export interface LazyMonacoEditorProps {
  value: string
  language?: string
  filename?: string
  onChange?: (value: string | undefined) => void
  readOnly?: boolean
  height?: string | number
}

export const LazyMonacoEditor: React.FC<LazyMonacoEditorProps> = ({
  value,
  language,
  filename,
  onChange,
  readOnly = false,
  height = '100%',
}) => {
  const resolvedLanguage =
    language || (filename ? languagePackManager.getLanguageByExtension(filename) : 'plaintext')

  const handleEditorMount: OnMount = (_editor, monacoInstance) => {
    monacoInstance.editor.defineTheme('workspace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2a2a2a',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#569cd6',
      },
    })

    monacoInstance.editor.defineTheme('workspace-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#333333',
        'editor.lineHighlightBackground': '#f5f5f5',
        'editor.selectionBackground': '#add6ff',
      },
    })
  }

  const handleChange: OnChange = newValue => {
    onChange?.(newValue)
  }

  return (
    <Editor
      height={height}
      language={resolvedLanguage}
      value={value}
      theme="workspace-dark"
      onMount={handleEditorMount}
      onChange={handleChange}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        padding: { top: 8, bottom: 8 },
        renderLineHighlight: 'line',
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
      }}
    />
  )
}
