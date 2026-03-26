/**
 * @framework-baseline 5517d7521a8bb458
 * @framework-modify
 * @reason 添加 Monaco 编辑器语言包预加载管理器，用于本地化 Monaco 编辑器资源
 * @impact 影响 Monaco 编辑器语言支持功能
 */

export interface LanguageConfig {
  id: string
  label: string
  extensions: string[]
}

const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    id: 'json',
    label: 'JSON',
    extensions: ['.json', '.jsonl'],
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    extensions: ['.ts', '.tsx'],
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs'],
  },
  {
    id: 'python',
    label: 'Python',
    extensions: ['.py', '.pyw'],
  },
  {
    id: 'markdown',
    label: 'Markdown',
    extensions: ['.md', '.mdx'],
  },
  {
    id: 'html',
    label: 'HTML',
    extensions: ['.html', '.htm'],
  },
  {
    id: 'css',
    label: 'CSS',
    extensions: ['.css', '.scss', '.sass', '.less'],
  },
  {
    id: 'sql',
    label: 'SQL',
    extensions: ['.sql'],
  },
  {
    id: 'java',
    label: 'Java',
    extensions: ['.java'],
  },
  {
    id: 'csharp',
    label: 'C#',
    extensions: ['.cs'],
  },
  {
    id: 'cpp',
    label: 'C++',
    extensions: ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
  },
  {
    id: 'c',
    label: 'C',
    extensions: ['.c'],
  },
  {
    id: 'go',
    label: 'Go',
    extensions: ['.go'],
  },
  {
    id: 'rust',
    label: 'Rust',
    extensions: ['.rs'],
  },
  {
    id: 'ruby',
    label: 'Ruby',
    extensions: ['.rb'],
  },
  {
    id: 'php',
    label: 'PHP',
    extensions: ['.php'],
  },
  {
    id: 'shell',
    label: 'Shell',
    extensions: ['.sh', '.bash', '.zsh'],
  },
  {
    id: 'yaml',
    label: 'YAML',
    extensions: ['.yaml', '.yml'],
  },
  {
    id: 'xml',
    label: 'XML',
    extensions: ['.xml', '.svg'],
  },
  {
    id: 'plaintext',
    label: 'Plain Text',
    extensions: ['.txt', '.log'],
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

  getLanguageLabel(languageId: string): string {
    const config = LANGUAGE_CONFIGS.find(l => l.id === languageId)
    return config?.label || 'Plain Text'
  }

  async preloadLanguages(filenames: string[]): Promise<void> {
    const languagesToLoad = new Set<string>()

    for (const filename of filenames) {
      const languageId = this.getLanguageByExtension(filename)
      if (
        !this.loadedLanguages.has(languageId) &&
        !this.loadingLanguages.has(languageId) &&
        languageId !== 'plaintext'
      ) {
        languagesToLoad.add(languageId)
      }
    }

    const loadPromises = Array.from(languagesToLoad).map(langId => this.loadLanguage(langId))

    await Promise.all(loadPromises)
  }

  async loadLanguage(languageId: string): Promise<void> {
    if (
      this.loadedLanguages.has(languageId) ||
      this.loadingLanguages.has(languageId) ||
      languageId === 'plaintext'
    ) {
      return
    }

    this.loadingLanguages.add(languageId)

    try {
      console.log(`[LanguagePack] Loading language: ${languageId}`)
      this.loadedLanguages.add(languageId)
    } catch (error) {
      console.error(`[LanguagePack] Failed to load language: ${languageId}`, error)
    } finally {
      this.loadingLanguages.delete(languageId)
    }
  }

  isLoaded(languageId: string): boolean {
    return this.loadedLanguages.has(languageId)
  }

  isLoading(languageId: string): boolean {
    return this.loadingLanguages.has(languageId)
  }

  getLoadedLanguages(): string[] {
    return Array.from(this.loadedLanguages)
  }

  reset(): void {
    this.loadedLanguages.clear()
    this.loadingLanguages.clear()
  }
}

export const languagePackManager = new LanguagePackManager()
