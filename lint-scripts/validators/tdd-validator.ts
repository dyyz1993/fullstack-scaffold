#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

const TDD_DOC_LINK = '.claude/rules/62-tdd-red-green.md'

export interface TDDViolation {
  type: 'missing_test' | 'test_after_impl' | 'skipped_test' | 'no_assertions'
  sourceFile: string
  testFile?: string
  message: string
  suggestion: string
  docLink: string
}

export interface TDDValidationResult {
  passed: boolean
  violations: TDDViolation[]
  stats: {
    sourceFilesChanged: number
    testFilesChanged: number
    newSourceFiles: number
    newTestFiles: number
    tddCompliantFiles: number
  }
}

interface StagedFiles {
  sourceFiles: string[]
  testFiles: string[]
}

function getStagedFiles(): StagedFiles {
  try {
    const output = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
      cwd: PROJECT_ROOT,
    }).trim()

    const files = output.split('\n').filter(Boolean)

    const sourceFiles = files.filter(f => {
      const isSource =
        (f.endsWith('.ts') || f.endsWith('.tsx')) &&
        !f.endsWith('.test.ts') &&
        !f.endsWith('.test.tsx') &&
        !f.includes('__tests__') &&
        (f.startsWith('src/server/') || f.startsWith('src/client/'))
      return isSource
    })

    const testFiles = files.filter(f => {
      return f.endsWith('.test.ts') || f.endsWith('.test.tsx') || f.includes('__tests__/')
    })

    return { sourceFiles, testFiles }
  } catch {
    return { sourceFiles: [], testFiles: [] }
  }
}

function getNewFiles(): StagedFiles {
  try {
    const output = execSync('git diff --cached --name-status', {
      encoding: 'utf-8',
      cwd: PROJECT_ROOT,
    }).trim()

    const lines = output.split('\n').filter(Boolean)
    const newFiles = lines.filter(line => line.startsWith('A ')).map(line => line.slice(2))

    const sourceFiles = newFiles.filter(f => {
      const isSource =
        (f.endsWith('.ts') || f.endsWith('.tsx')) &&
        !f.endsWith('.test.ts') &&
        !f.endsWith('.test.tsx') &&
        !f.includes('__tests__') &&
        (f.startsWith('src/server/') || f.startsWith('src/client/'))
      return isSource
    })

    const testFiles = newFiles.filter(f => {
      return f.endsWith('.test.ts') || f.endsWith('.test.tsx') || f.includes('__tests__/')
    })

    return { sourceFiles, testFiles }
  } catch {
    return { sourceFiles: [], testFiles: [] }
  }
}

function getExpectedTestFile(sourceFile: string): string[] {
  const possibleTestFiles: string[] = []

  const dir = dirname(sourceFile)
  const base = basename(sourceFile, sourceFile.endsWith('.tsx') ? '.tsx' : '.ts')
  const ext = sourceFile.endsWith('.tsx') ? '.test.tsx' : '.test.ts'

  possibleTestFiles.push(join(dir, '__tests__', base + ext))
  possibleTestFiles.push(join(dir, base + ext))

  if (sourceFile.includes('/services/')) {
    const moduleDir = dirname(dirname(sourceFile))
    possibleTestFiles.push(join(moduleDir, '__tests__', base + ext))
  }

  if (sourceFile.includes('/routes/')) {
    const moduleDir = dirname(dirname(sourceFile))
    possibleTestFiles.push(
      join(moduleDir, '__tests__', base.replace('-routes', '-route-rpc') + ext)
    )
  }

  return possibleTestFiles
}

function checkTestExists(sourceFile: string, existingTests: string[]): string | null {
  const expectedTests = getExpectedTestFile(sourceFile)

  for (const expected of expectedTests) {
    if (existingTests.includes(expected) || existsSync(join(PROJECT_ROOT, expected))) {
      return expected
    }
  }

  return null
}

function getFileFirstCommit(filePath: string): string | null {
  try {
    const commit = execSync(`git log --format=%H --reverse -- "${filePath}" | head -1`, {
      encoding: 'utf-8',
      cwd: PROJECT_ROOT,
    }).trim()
    return commit || null
  } catch {
    return null
  }
}

function getCommitTimestamp(commit: string): number {
  try {
    const timestamp = execSync(`git show -s --format=%ct ${commit}`, {
      encoding: 'utf-8',
      cwd: PROJECT_ROOT,
    }).trim()
    return parseInt(timestamp, 10) * 1000
  } catch {
    return 0
  }
}

function checkTestFirst(sourceFile: string, testFile: string): boolean {
  const sourceFirstCommit = getFileFirstCommit(sourceFile)
  const testFirstCommit = getFileFirstCommit(testFile)

  if (!sourceFirstCommit || !testFirstCommit) {
    return true
  }

  const sourceTime = getCommitTimestamp(sourceFirstCommit)
  const testTime = getCommitTimestamp(testFirstCommit)

  return testTime <= sourceTime
}

function checkForSkippedTests(testFile: string): boolean {
  try {
    const content = readFileSync(join(PROJECT_ROOT, testFile), 'utf-8')

    const skipPatterns = [
      /\.skip\s*\(/,
      /it\.skip\s*\(/,
      /describe\.skip\s*\(/,
      /test\.skip\s*\(/,
      /\.only\s*\(/,
      /it\.only\s*\(/,
      /describe\.only\s*\(/,
      /test\.only\s*\(/,
    ]

    for (const pattern of skipPatterns) {
      if (pattern.test(content)) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

function checkForAssertions(testFile: string): boolean {
  try {
    const content = readFileSync(join(PROJECT_ROOT, testFile), 'utf-8')

    const assertionPatterns = [
      /expect\s*\(/,
      /assert\s*\(/,
      /should\s*\.\w+/,
      /\.toBe\(/,
      /\.toEqual\(/,
      /\.toBeTruthy\(/,
      /\.toBeFalsy\(/,
    ]

    for (const pattern of assertionPatterns) {
      if (pattern.test(content)) {
        return true
      }
    }

    return false
  } catch {
    return true
  }
}

export function validateTDD(): TDDValidationResult {
  const violations: TDDViolation[] = []

  const staged = getStagedFiles()
  const newFiles = getNewFiles()

  const allTestFiles = [...staged.testFiles, ...newFiles.testFiles]

  for (const sourceFile of newFiles.sourceFiles) {
    const testFile = checkTestExists(sourceFile, allTestFiles)

    if (!testFile) {
      violations.push({
        type: 'missing_test',
        sourceFile,
        message: `新增源文件缺少对应的测试文件`,
        suggestion: `请先为 ${sourceFile} 创建测试文件，遵循 TDD 红-绿-重构循环`,
        docLink: TDD_DOC_LINK,
      })
    } else {
      const testFirst = checkTestFirst(sourceFile, testFile)
      if (!testFirst) {
        violations.push({
          type: 'test_after_impl',
          sourceFile,
          testFile,
          message: `测试文件在源文件之后创建，违反 TDD 规则`,
          suggestion: `TDD 要求先写测试（红灯），再写实现（绿灯）。请确保测试先于实现`,
          docLink: TDD_DOC_LINK,
        })
      }

      if (checkForSkippedTests(testFile)) {
        violations.push({
          type: 'skipped_test',
          sourceFile,
          testFile,
          message: `测试文件包含跳过的测试（.skip 或 .only）`,
          suggestion: `TDD 不允许跳过测试。请确保所有测试都能运行并通过`,
          docLink: TDD_DOC_LINK,
        })
      }
    }
  }

  for (const testFile of staged.testFiles) {
    if (checkForSkippedTests(testFile)) {
      violations.push({
        type: 'skipped_test',
        sourceFile: '',
        testFile,
        message: `测试文件包含跳过的测试`,
        suggestion: `移除 .skip() 或 .only()，确保所有测试都能运行`,
        docLink: TDD_DOC_LINK,
      })
    }

    if (!checkForAssertions(testFile)) {
      violations.push({
        type: 'no_assertions',
        sourceFile: '',
        testFile,
        message: `测试文件没有断言`,
        suggestion: `测试必须包含断言（expect、assert 等）`,
        docLink: TDD_DOC_LINK,
      })
    }
  }

  const stats = {
    sourceFilesChanged: staged.sourceFiles.length,
    testFilesChanged: staged.testFiles.length,
    newSourceFiles: newFiles.sourceFiles.length,
    newTestFiles: newFiles.testFiles.length,
    tddCompliantFiles:
      newFiles.sourceFiles.length -
      violations.filter(v => v.type === 'missing_test' || v.type === 'test_after_impl').length,
  }

  return {
    passed: violations.length === 0,
    violations,
    stats,
  }
}

function printResult(result: TDDValidationResult): void {
  console.log('\n🔍 TDD 红绿灯规则检查\n')
  console.log('='.repeat(60))

  if (result.violations.length > 0) {
    console.log('\n❌ TDD 违规检测到！\n')

    for (const violation of result.violations) {
      console.log(`\n📋 违规类型: ${violation.type}`)
      if (violation.sourceFile) {
        console.log(`   源文件: ${violation.sourceFile}`)
      }
      if (violation.testFile) {
        console.log(`   测试文件: ${violation.testFile}`)
      }
      console.log(`   问题: ${violation.message}`)
      console.log(`\n   💡 建议: ${violation.suggestion}`)
      console.log(`   📚 文档: ${violation.docLink}\n`)

      if (violation.type === 'missing_test') {
        const expectedTests = getExpectedTestFile(violation.sourceFile)
        console.log('   预期测试文件位置:')
        for (const expected of expectedTests.slice(0, 2)) {
          console.log(`     - ${expected}`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`\n📊 统计:`)
    console.log(`   源文件变更: ${result.stats.sourceFilesChanged}`)
    console.log(`   测试文件变更: ${result.stats.testFilesChanged}`)
    console.log(`   新增源文件: ${result.stats.newSourceFiles}`)
    console.log(`   新增测试文件: ${result.stats.newTestFiles}`)
    console.log(`   TDD 合规文件: ${result.stats.tddCompliantFiles}/${result.stats.newSourceFiles}`)

    console.log('\n❌ TDD compliance: FAILED')
    console.log('\n💡 提示: TDD 红-绿-重构循环要求:')
    console.log('   1. 🔴 先写测试（红灯）- 测试应该失败')
    console.log('   2. 🟢 写实现代码（绿灯）- 测试应该通过')
    console.log('   3. 🔵 重构代码 - 保持测试通过\n')

    process.exit(1)
  }

  console.log('\n✅ TDD 合规检查通过！\n')

  console.log('📊 统计:')
  console.log(`   源文件变更: ${result.stats.sourceFilesChanged}`)
  console.log(`   测试文件变更: ${result.stats.testFilesChanged}`)
  console.log(`   新增源文件: ${result.stats.newSourceFiles}`)
  console.log(`   新增测试文件: ${result.stats.newTestFiles}`)
  console.log(`   TDD 合规文件: ${result.stats.tddCompliantFiles}/${result.stats.newSourceFiles}`)

  console.log('\n✅ TDD compliance: PASSED')
  console.log('\n🎉 遵循 TDD 红-绿-重构循环:')
  console.log('   1. 🔴 先写测试（红灯）')
  console.log('   2. 🟢 写实现代码（绿灯）')
  console.log('   3. 🔵 重构代码\n')
}

if (process.argv[1] === __filename) {
  const result = validateTDD()
  printResult(result)
}
