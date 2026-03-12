/**
 * 检查项目中所有 md 文件的引用路径是否正确
 *
 * 运行: npm run check:refs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { glob } from 'glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const templateDir = path.resolve(__dirname, '..')

const MD_FILE_PATTERN = /\.md$/
const RELATIVE_REF_PATTERN = /\]\(\.\/([^)]+)\)/g
const ABSOLUTE_REF_PATTERN = /\]\(\/([^)]+)\)/g
const CODE_REF_PATTERN = /`([^`]+\.[a-z]+)`/g

const GLOB_CHARS = ['*', '?', '[', ']', '{', '}']
const PLACEHOLDER_PATTERN = /\{[a-zA-Z_]+\}/

interface CheckResult {
  file: string
  line: number
  ref: string
  resolvedPath: string
  exists: boolean
  isGlob: boolean
  matchedFiles?: string[]
}

function isGlobPattern(p: string): boolean {
  return GLOB_CHARS.some(char => p.includes(char))
}

function isPlaceholder(p: string): boolean {
  return PLACEHOLDER_PATTERN.test(p)
}

function findAllMdFiles(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git', '.pi'].includes(entry.name)) {
        results.push(...findAllMdFiles(fullPath))
      }
    } else if (entry.isFile() && MD_FILE_PATTERN.test(entry.name)) {
      results.push(fullPath)
    }
  }

  return results
}

function checkGlobPattern(
  baseDir: string,
  pattern: string
): { exists: boolean; matchedFiles: string[] } {
  try {
    const fullPattern = path.isAbsolute(pattern) ? pattern : path.join(baseDir, pattern)

    const matchedFiles = glob.sync(fullPattern, {
      cwd: templateDir,
      nodir: true,
    })

    return {
      exists: matchedFiles.length > 0,
      matchedFiles,
    }
  } catch {
    return { exists: false, matchedFiles: [] }
  }
}

function checkFileExists(baseDir: string, refPath: string): boolean {
  const fullPath = path.isAbsolute(refPath) ? refPath : path.join(baseDir, refPath)
  return fs.existsSync(fullPath)
}

function checkReferences(): CheckResult[] {
  const results: CheckResult[] = []
  const mdFiles = findAllMdFiles(templateDir)

  for (const filePath of mdFiles) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const fileDir = path.dirname(filePath)
    const relativePath = path.relative(templateDir, filePath)

    lines.forEach((line, index) => {
      const lineNum = index + 1

      RELATIVE_REF_PATTERN.lastIndex = 0
      let match
      while ((match = RELATIVE_REF_PATTERN.exec(line)) !== null) {
        const refPath = match[1]
        const resolvedPath = path.resolve(fileDir, refPath)
        const resolvedRelative = path.relative(templateDir, resolvedPath)

        if (isPlaceholder(refPath)) {
          continue
        }

        if (isGlobPattern(refPath)) {
          const { exists, matchedFiles } = checkGlobPattern(fileDir, refPath)
          results.push({
            file: relativePath,
            line: lineNum,
            ref: `./${refPath}`,
            resolvedPath: resolvedRelative,
            exists,
            isGlob: true,
            matchedFiles,
          })
        } else {
          const exists = checkFileExists(fileDir, refPath)
          results.push({
            file: relativePath,
            line: lineNum,
            ref: `./${refPath}`,
            resolvedPath: resolvedRelative,
            exists,
            isGlob: false,
          })
        }
      }

      ABSOLUTE_REF_PATTERN.lastIndex = 0
      while ((match = ABSOLUTE_REF_PATTERN.exec(line)) !== null) {
        const refPath = match[1]
        const resolvedPath = path.join(templateDir, refPath)

        if (isPlaceholder(refPath)) {
          continue
        }

        if (isGlobPattern(refPath)) {
          const { exists, matchedFiles } = checkGlobPattern(templateDir, refPath)
          results.push({
            file: relativePath,
            line: lineNum,
            ref: `/${refPath}`,
            resolvedPath: refPath,
            exists,
            isGlob: true,
            matchedFiles,
          })
        } else {
          const exists = checkFileExists(templateDir, refPath)
          results.push({
            file: relativePath,
            line: lineNum,
            ref: `/${refPath}`,
            resolvedPath: refPath,
            exists,
            isGlob: false,
          })
        }
      }

      CODE_REF_PATTERN.lastIndex = 0
      while ((match = CODE_REF_PATTERN.exec(line)) !== null) {
        const refPath = match[1]
        if (!refPath.startsWith('src/') && !refPath.startsWith('eslint-rules/')) {
          continue
        }

        if (isPlaceholder(refPath)) {
          continue
        }

        const resolvedPath = path.join(templateDir, refPath)

        if (isGlobPattern(refPath)) {
          const { exists, matchedFiles } = checkGlobPattern(templateDir, refPath)
          results.push({
            file: relativePath,
            line: lineNum,
            ref: refPath,
            resolvedPath: refPath,
            exists,
            isGlob: true,
            matchedFiles,
          })
        } else {
          const exists = fs.existsSync(resolvedPath)
          results.push({
            file: relativePath,
            line: lineNum,
            ref: refPath,
            resolvedPath: refPath,
            exists,
            isGlob: false,
          })
        }
      }
    })
  }

  return results
}

function main(): void {
  console.log('🔍 Checking references in all *.md files...\n')

  const results = checkReferences()
  const broken = results.filter(r => !r.exists)
  const valid = results.filter(r => r.exists)

  if (valid.length > 0) {
    console.log(`✅ Valid references (${valid.length}):\n`)
    const grouped = new Map<string, CheckResult[]>()
    for (const r of valid) {
      const key = `${r.file}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(r)
    }
    for (const [file, refs] of Array.from(grouped.entries())) {
      console.log(`  📄 ${file}`)
      for (const r of refs) {
        if (r.isGlob && r.matchedFiles && r.matchedFiles.length > 0) {
          console.log(`     L${r.line}: ${r.ref} (${r.matchedFiles.length} matches)`)
        } else {
          console.log(`     L${r.line}: ${r.ref}`)
        }
      }
    }
    console.log()
  }

  if (broken.length > 0) {
    console.log(`\n❌ Broken references (${broken.length}):\n`)
    const grouped = new Map<string, CheckResult[]>()
    for (const r of broken) {
      const key = `${r.file}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(r)
    }
    for (const [file, refs] of Array.from(grouped.entries())) {
      console.log(`  📄 ${file}`)
      for (const r of refs) {
        if (r.isGlob) {
          console.log(`     L${r.line}: ${r.ref} (NO MATCHES)`)
        } else {
          console.log(`     L${r.line}: ${r.ref} -> ${r.resolvedPath} (NOT FOUND)`)
        }
      }
    }
    console.log()
    process.exit(1)
  }

  console.log('✅ All references are valid!\n')
}

main()
