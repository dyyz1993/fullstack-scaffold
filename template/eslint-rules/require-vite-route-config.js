import fs from 'fs'
import path from 'path'

export const requireViteRouteConfig = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure React Router paths are configured in vite.config.ts devServer exclude',
      recommended: true,
    },
    messages: {
      missingViteConfig:
        'Route path "{{routePath}}" is not configured in vite.config.ts devServer exclude.\n' +
        'This may cause the dev server to intercept the route incorrectly.\n' +
        'Please add this path pattern to the exclude array in vite.config.ts:\n' +
        '\n' +
        '  devServer({\n' +
        '    exclude: [\n' +
        '      // ... existing patterns\n' +
        '      /^\\/{{basename}}/,  // Add this line to cover all {{basename}} routes\n' +
        '    ],\n' +
        '  })',
      missingViteConfigNavigate:
        'Navigate target "{{routePath}}" is not configured in vite.config.ts devServer exclude.\n' +
        'Please add the path pattern to the exclude array in vite.config.ts.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename()

    if (!filename.includes('/client/') && !filename.includes('/admin/')) return {}
    if (!filename.endsWith('.tsx') && !filename.endsWith('.ts')) return {}
    if (filename.includes('__tests__') || filename.includes('.test.')) return {}

    let viteExcludePatterns = null

    function getViteConfigPath() {
      let currentDir = path.dirname(filename)
      while (currentDir !== path.dirname(currentDir)) {
        const viteConfigPath = path.join(currentDir, 'vite.config.ts')
        if (fs.existsSync(viteConfigPath)) {
          return viteConfigPath
        }
        currentDir = path.dirname(currentDir)
      }
      return null
    }

    function parseViteExcludePatterns(viteConfigPath) {
      if (!fs.existsSync(viteConfigPath)) return []

      const content = fs.readFileSync(viteConfigPath, 'utf-8')

      const excludeStartIdx = content.indexOf('exclude:')
      if (excludeStartIdx === -1) return []

      const bracketStart = content.indexOf('[', excludeStartIdx)
      let depth = 1
      let bracketEnd = bracketStart + 1
      while (bracketEnd < content.length && depth > 0) {
        if (content[bracketEnd] === '[') depth++
        if (content[bracketEnd] === ']') depth--
        bracketEnd++
      }

      const excludeContent = content.slice(bracketStart, bracketEnd)
      const patterns = []

      let i = 0
      while (i < excludeContent.length) {
        const startIdx = excludeContent.indexOf('/^', i)
        if (startIdx === -1) break

        let j = startIdx + 2
        while (j < excludeContent.length) {
          if (excludeContent[j] === '/') {
            let backslashCount = 0
            let k = j - 1
            while (k >= startIdx + 2 && excludeContent[k] === '\\') {
              backslashCount++
              k--
            }
            if (backslashCount % 2 === 0) {
              break
            }
          }
          j++
        }

        if (j < excludeContent.length) {
          const pattern = excludeContent.slice(startIdx + 2, j)
          const isExact = pattern.endsWith('$')
          patterns.push({
            pattern: isExact ? pattern.slice(0, -1) : pattern,
            isExact: isExact,
          })
          i = j + 1
        } else {
          break
        }
      }

      const stringMatches = excludeContent.matchAll(/['"`]([^'"`]+)['"`]/g)
      for (const match of stringMatches) {
        patterns.push({
          pattern: match[1],
          isExact: true,
        })
      }

      return patterns
    }

    function isPathConfigured(routePath, patterns, basename) {
      if (!patterns || patterns.length === 0) return true

      if (basename) {
        const hasBasenamePattern = patterns.some(p => {
          const unescaped = p.pattern.replace(/\\\//g, '/')
          return unescaped.includes('/' + basename) || unescaped.includes(basename)
        })
        if (hasBasenamePattern) return true
      }

      const normalizedPath = routePath.startsWith('/') ? routePath : '/' + routePath

      for (const { pattern, isExact } of patterns) {
        const unescapedPattern = pattern.replace(/\\\//g, '/')

        try {
          const regexPattern = unescapedPattern.replace(/\\./g, match => {
            if (match === '\\.') return '\\.'
            return match
          })

          if (isExact) {
            const regex = new RegExp('^' + regexPattern + '$')
            if (regex.test(normalizedPath)) return true
          } else {
            const regex = new RegExp('^' + regexPattern)
            if (regex.test(normalizedPath)) return true
          }
        } catch {
          // Invalid regex, skip
        }
      }

      return false
    }

    function checkRoutePath(node, pathValue, basename) {
      if (!pathValue || typeof pathValue !== 'string') return
      if (pathValue === '/*' || pathValue === '*') return
      if (pathValue.includes(':')) return

      if (pathValue.startsWith('/')) {
        pathValue = pathValue.slice(1)
      }

      if (!pathValue) return

      if (viteExcludePatterns === null) {
        const viteConfigPath = getViteConfigPath()
        if (viteConfigPath) {
          viteExcludePatterns = parseViteExcludePatterns(viteConfigPath)
        } else {
          viteExcludePatterns = []
        }
      }

      if (!isPathConfigured(pathValue, viteExcludePatterns, basename)) {
        context.report({
          node,
          messageId: 'missingViteConfig',
          data: {
            routePath: basename ? basename + '/' + pathValue : pathValue,
            basename: basename || '',
          },
        })
      }
    }

    function checkNavigatePath(node, toValue, basename) {
      if (!toValue || typeof toValue !== 'string') return
      if (toValue.startsWith('http://') || toValue.startsWith('https://')) return

      let pathValue = toValue
      if (pathValue.startsWith('/')) {
        pathValue = pathValue.slice(1)
      }

      if (!pathValue) return

      if (viteExcludePatterns === null) {
        const viteConfigPath = getViteConfigPath()
        if (viteConfigPath) {
          viteExcludePatterns = parseViteExcludePatterns(viteConfigPath)
        } else {
          viteExcludePatterns = []
        }
      }

      if (!isPathConfigured(pathValue, viteExcludePatterns, basename)) {
        context.report({
          node,
          messageId: 'missingViteConfigNavigate',
          data: {
            routePath: basename ? basename + '/' + pathValue : pathValue,
          },
        })
      }
    }

    let detectedBasename = null

    if (filename.includes('/admin/')) {
      detectedBasename = 'admin'
    } else if (filename.includes('/client/')) {
      detectedBasename = null
    }

    return {
      JSXElement(node) {
        const openingElement = node.openingElement
        if (!openingElement) return

        const elementName = openingElement.name
        if (!elementName) return

        const isBrowserRouter =
          elementName.type === 'JSXIdentifier' && elementName.name === 'BrowserRouter'
        const isRoute = elementName.type === 'JSXIdentifier' && elementName.name === 'Route'
        const isNavigate = elementName.type === 'JSXIdentifier' && elementName.name === 'Navigate'

        if (isBrowserRouter) {
          const attributes = openingElement.attributes || []
          for (const attr of attributes) {
            if (attr.type === 'JSXAttribute' && attr.name.name === 'basename') {
              if (attr.value && attr.value.type === 'Literal') {
                detectedBasename = attr.value.value.replace(/^\//, '')
              }
            }
          }
        }

        if (!isRoute && !isNavigate) return

        const attributes = openingElement.attributes || []

        if (isRoute) {
          for (const attr of attributes) {
            if (attr.type === 'JSXAttribute' && attr.name.name === 'path') {
              if (attr.value && attr.value.type === 'Literal') {
                checkRoutePath(attr.value, attr.value.value, detectedBasename)
              } else if (attr.value && attr.value.type === 'JSXExpressionContainer') {
                // Skip dynamic paths
              }
            }
          }
        }

        if (isNavigate) {
          for (const attr of attributes) {
            if (attr.type === 'JSXAttribute' && attr.name.name === 'to') {
              if (attr.value && attr.value.type === 'Literal') {
                checkNavigatePath(attr.value, attr.value.value, detectedBasename)
              }
            }
          }
        }
      },
    }
  },
}

export default requireViteRouteConfig
