#!/usr/bin/env tsx
/**
 * 统一验证入口
 *
 * 运行所有验证器
 * 可以选择性运行特定验证器
 */

import { cwd } from 'node:process'
import { validateTodos, formatTodoErrors } from './validators/todos.validator.js'
import { validateSensitive, formatSensitiveErrors } from './validators/sensitive.validator.js'
import { validateImports, formatImportErrors } from './validators/imports.validator.js'
import { validateServerRPC, formatServerRPCErrors } from './validators/server-rpc.validator.js'
import { validateClientRPC, formatClientRPCErrors } from './validators/client-rpc.validator.js'
import {
  validateDirectoryStructure,
  formatDirectoryErrors,
} from './validators/directory-structure.validator.js'
import projectConfig from './config/project.config.js'

interface ValidatorResult {
  name: string
  passed: boolean
  errors: number
}

async function runAllValidators(): Promise<ValidatorResult[]> {
  const rootPath = cwd()
  const results: ValidatorResult[] = []

  // 1. TODO 验证
  console.log('🔍 [1/6] Checking TODO/FIXME comments...')
  const todoErrors = validateTodos(projectConfig.todos, rootPath)
  results.push({
    name: 'TODO/FIXME',
    passed: todoErrors.length === 0,
    errors: todoErrors.length,
  })
  if (todoErrors.length > 0) {
    console.error(formatTodoErrors(todoErrors))
  } else {
    console.log('  ✅ No unassigned TODOs found\n')
  }

  // 2. 敏感信息验证
  console.log('🔍 [2/6] Checking for sensitive data...')
  const sensitiveErrors = await validateSensitive(projectConfig.sensitive, rootPath)
  results.push({
    name: 'Sensitive Data',
    passed: sensitiveErrors.length === 0,
    errors: sensitiveErrors.length,
  })
  if (sensitiveErrors.length > 0) {
    console.error(formatSensitiveErrors(sensitiveErrors))
  } else {
    console.log('  ✅ No sensitive data found\n')
  }

  // 3. 导入路径验证
  console.log('🔍 [3/6] Checking import paths...')
  const importErrors = validateImports(projectConfig.imports, rootPath)
  results.push({
    name: 'Import Paths',
    passed: importErrors.length === 0,
    errors: importErrors.length,
  })
  if (importErrors.length > 0) {
    console.error(formatImportErrors(importErrors))
  } else {
    console.log('  ✅ All imports are valid\n')
  }

  // 4. 服务端 RPC 验证
  console.log('🔍 [4/6] Checking server RPC patterns...')
  const serverRPCErrors = validateServerRPC(projectConfig.serverRPC, rootPath)
  results.push({
    name: 'Server RPC',
    passed: serverRPCErrors.length === 0,
    errors: serverRPCErrors.length,
  })
  if (serverRPCErrors.length > 0) {
    console.error(formatServerRPCErrors(serverRPCErrors))
  } else {
    console.log('  ✅ Server RPC patterns are valid\n')
  }

  // 5. 客户端 RPC 验证
  console.log('🔍 [5/6] Checking client RPC usage...')
  const clientRPCErrors = validateClientRPC(projectConfig.clientRPC, rootPath)
  results.push({
    name: 'Client RPC',
    passed: clientRPCErrors.length === 0,
    errors: clientRPCErrors.length,
  })
  if (clientRPCErrors.length > 0) {
    console.error(formatClientRPCErrors(clientRPCErrors))
  } else {
    console.log('  ✅ Client RPC usage is valid\n')
  }

  // 6. 目录结构验证
  console.log('🔍 [6/6] Checking directory structure...')
  const { directoryErrors, forbiddenErrors } = validateDirectoryStructure(
    projectConfig.directory,
    rootPath
  )
  const totalDirectoryErrors = directoryErrors.length + forbiddenErrors.length
  results.push({
    name: 'Directory Structure',
    passed: totalDirectoryErrors === 0,
    errors: totalDirectoryErrors,
  })
  if (totalDirectoryErrors > 0) {
    console.error(formatDirectoryErrors(directoryErrors, forbiddenErrors))
  } else {
    console.log('  ✅ Directory structure is valid\n')
  }

  return results
}

async function main() {
  console.log('🚀 Running all validators...\n')

  const results = await runAllValidators()

  // 汇总结果
  const failed = results.filter(r => !r.passed)
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)

  console.log('\n' + '='.repeat(50))
  console.log('📊 Validation Summary:')
  console.log('='.repeat(50))

  for (const result of results) {
    const status = result.passed ? '✅' : '❌'
    console.log(`  ${status} ${result.name}: ${result.errors} error(s)`)
  }

  console.log('='.repeat(50))

  if (failed.length > 0) {
    console.error(`\n❌ Validation failed with ${totalErrors} total error(s)`)
    process.exit(1)
  }

  console.log('\n✅ All validations passed!')
}

main()
