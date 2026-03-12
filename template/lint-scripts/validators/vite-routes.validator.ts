/**
 * Vite 路由配置验证器
 *
 * 检查 React Router 路由路径是否在 vite.config.ts devServer exclude 中配置
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { ViteRoutesConfig, ViteRouteError } from './index.js'

interface ParsedPattern {
  pattern: string
  isExact: boolean
}

function parseViteExcludePatterns(viteConfigPath: string): ParsedPattern[] {
  if (!existsSync(viteConfigPath)) return []

  const content = readFileSync(viteConfigPath, 'utf-8')

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
  const patterns: ParsedPattern[] = []

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
        if (backslashCount % 2 === 0) break
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

function isPathConfigured(
  routePath: string,
  patterns: ParsedPattern[],
  basename: string | null
): boolean {
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

    if (unescapedPattern.includes(normalizedPath)) return true
    if (unescapedPattern.includes(routePath)) return true

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

function extractRoutesFromFile(
  filePath: string,
  rootPath: string,
  patterns: ParsedPattern[]
): ViteRouteError[] {
  const content = readFileSync(filePath, 'utf-8')
  const errors: ViteRouteError[] = []
  const lines = content.split('\n')

  let detectedBasename: string | null = null

  // First pass: find basename from BrowserRouter
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const basenameMatch = line.match(/<BrowserRouter[^>]*basename\s*=\s*["']([^"']+)["']/)
    if (basenameMatch) {
      detectedBasename = basenameMatch[1].replace(/^\//, '')
      break
    }
  }

  // Also check by file path
  if (filePath.includes('/admin/')) {
    detectedBasename = detectedBasename || 'admin'
  }

  // Second pass: find Route and Navigate
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Check Route path
    const routeMatch = line.match(/<Route[^>]*path\s*=\s*["']([^"']+)["']/)
    if (routeMatch) {
      const pathValue = routeMatch[1]

      // Skip dynamic routes, wildcards, empty paths
      if (pathValue.includes(':') || pathValue === '/*' || pathValue === '*' || pathValue === '/') {
        continue
      }

      const normalizedPath = pathValue.startsWith('/') ? pathValue.slice(1) : pathValue
      if (!normalizedPath) continue

      if (!isPathConfigured(normalizedPath, patterns, detectedBasename)) {
        const fullRoutePath = detectedBasename
          ? `${detectedBasename}/${normalizedPath}`
          : normalizedPath
        const suggestion = detectedBasename
          ? `/^\\/${detectedBasename}/`
          : `/^\\/${normalizedPath}$/`

        errors.push({
          file: relative(rootPath, filePath),
          line: lineNum,
          routePath: fullRoutePath,
          basename: detectedBasename,
          suggestion: `Add ${suggestion} to vite.config.ts devServer exclude`,
        })
      }
    }

    // Check Navigate to
    const navigateMatch = line.match(/<Navigate[^>]*to\s*=\s*["']([^"']+)["']/)
    if (navigateMatch) {
      const toValue = navigateMatch[1]

      // Skip external URLs and empty paths
      if (toValue.startsWith('http://') || toValue.startsWith('https://') || toValue === '/') {
        continue
      }

      const normalizedPath = toValue.startsWith('/') ? toValue.slice(1) : toValue
      if (!normalizedPath) continue

      if (!isPathConfigured(normalizedPath, patterns, detectedBasename)) {
        const fullRoutePath = detectedBasename
          ? `${detectedBasename}/${normalizedPath}`
          : normalizedPath
        const suggestion = detectedBasename
          ? `/^\\/${detectedBasename}/`
          : `/^\\/${normalizedPath}$/`

        errors.push({
          file: relative(rootPath, filePath),
          line: lineNum,
          routePath: fullRoutePath,
          basename: detectedBasename,
          suggestion: `Add ${suggestion} to vite.config.ts devServer exclude`,
        })
      }
    }
  }

  return errors
}

function scanDirectory(
  rootPath: string,
  targetDir: string,
  config: ViteRoutesConfig,
  patterns: ParsedPattern[]
): ViteRouteError[] {
  const errors: ViteRouteError[] = []
  const targetPath = join(rootPath, targetDir)

  if (!existsSync(targetPath)) {
    return errors
  }

  function scanDir(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        // Skip ignored directories
        if (!config.ignoreDirs.includes(entry.name)) {
          scanDir(fullPath)
        }
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) &&
        !entry.name.includes('.test.') &&
        !entry.name.includes('.spec.')
      ) {
        const fileErrors = extractRoutesFromFile(fullPath, rootPath, patterns)
        errors.push(...fileErrors)
      }
    }
  }

  scanDir(targetPath)
  return errors
}

export function validateViteRoutes(config: ViteRoutesConfig, rootPath: string): ViteRouteError[] {
  const allErrors: ViteRouteError[] = []

  // Parse vite.config.ts once
  const viteConfigPath = join(rootPath, config.viteConfigPath)
  const patterns = parseViteExcludePatterns(viteConfigPath)

  // Scan all check directories
  for (const dir of config.checkDirs) {
    const errors = scanDirectory(rootPath, dir, config, patterns)
    allErrors.push(...errors)
  }

  return allErrors
}

export function formatViteRouteErrors(errors: ViteRouteError[]): string {
  if (errors.length === 0) return ''

  let output = `❌ Found ${errors.length} unconfigured route(s):\n\n`

  for (const err of errors) {
    output += `  ${err.file}:${err.line}:\n`
    output += `    Route path: /${err.routePath}\n`
    if (err.basename) {
      output += `    Basename: ${err.basename}\n`
    }
    output += `    → ${err.suggestion}\n\n`
  }

  output += '📋 Guidelines:\n'
  output += '  All React Router paths must be configured in vite.config.ts devServer exclude.\n'
  output += '  This prevents the dev server from intercepting client routes incorrectly.\n\n'
  output += '  Example vite.config.ts:\n'
  output += '    devServer({\n'
  output += '      exclude: [\n'
  output += '        /^\\/todos$/,        // Exact match\n'
  output += '        /^\\/notifications$/, // Exact match\n'
  output += '        /^\\/admin/,         // Prefix match (covers all /admin/* routes)\n'
  output += '      ],\n'
  output += '    })\n'

  return output
}
