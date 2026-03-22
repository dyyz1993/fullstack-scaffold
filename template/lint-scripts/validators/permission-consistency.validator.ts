/**
 * 权限配置一致性验证器
 *
 * 检查权限配置的一致性：
 * 1. 路由中使用的权限是否在 Permission 枚举中定义
 * 2. 菜单配置中使用的权限是否在 Permission 枚举中定义
 * 3. 种子数据中的权限是否与 Permission 枚举一致
 * 4. PAGE_PERMISSIONS 中使用的权限是否在 Permission 枚举中定义
 * 5. 前端组件中使用的权限是否在 Permission 枚举中定义
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { glob } from 'glob'

export interface PermissionConsistencyConfig {
  permissionEnumPath: string
  seedDataPath: string
  menuConfigPath: string
  pagePermissionsPath: string
  routesDirs: string[]
  componentDirs: string[]
  ignoreDirs: string[]
}

export interface PermissionError {
  type: 'missing_in_enum' | 'missing_in_seed' | 'wrong_permission' | 'unused_permission'
  file: string
  line?: number
  permission: string
  message: string
  suggestion: string
}

const PERMISSION_ENUM_REGEX = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*['"]([a-z:_]+)['"]/gm
const PERMISSION_USAGE_REGEX = /Permission\.(\w+)/g
const SEED_PERMISSION_REGEX = /code:\s*['"]([a-z:_]+)['"]/g
const MENU_PERMISSION_REGEX = /permissions:\s*\[([^\]]+)\]/g
const BUILTIN_METHODS = new Set(['toString', 'valueOf', 'hasOwnProperty'])

function extractPermissionEnumValues(content: string): {
  names: Set<string>
  nameToCode: Map<string, string>
} {
  const names = new Set<string>()
  const nameToCode = new Map<string, string>()

  const permissionEnumMatch = content.match(/export\s+enum\s+Permission\s*\{([^}]+)\}/s)
  if (!permissionEnumMatch) {
    return { names, nameToCode }
  }

  const enumBody = permissionEnumMatch[1]
  let match
  while ((match = PERMISSION_ENUM_REGEX.exec(enumBody)) !== null) {
    names.add(match[1])
    nameToCode.set(match[1], match[2])
  }
  return { names, nameToCode }
}

function extractPermissionUsages(content: string): { name: string; line: number }[] {
  const usages: { name: string; line: number }[] = []
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    let match
    const lineRegex = /Permission\.(\w+)/g
    while ((match = lineRegex.exec(line)) !== null) {
      if (BUILTIN_METHODS.has(match[1])) continue
      if (!usages.some(u => u.name === match[1] && u.line === index + 1)) {
        usages.push({ name: match[1], line: index + 1 })
      }
    }
  })

  return usages
}

function extractSeedPermissionCodes(content: string): Set<string> {
  const codes = new Set<string>()

  const initialPermissionsMatch = content.match(
    /export\s+const\s+initialPermissions\s*=\s*\[([\s\S]*?)\n\]/
  )
  if (!initialPermissionsMatch) {
    return codes
  }

  const permissionsArray = initialPermissionsMatch[1]
  let match
  while ((match = SEED_PERMISSION_REGEX.exec(permissionsArray)) !== null) {
    codes.add(match[1])
  }
  return codes
}

function permissionCodeToEnumName(code: string): string {
  return code.toUpperCase().replace(/:/g, '_')
}

function enumNameToPermissionCode(name: string): string {
  return name.toLowerCase().replace(/_/g, ':')
}

export function validatePermissionConsistency(
  config: PermissionConsistencyConfig,
  rootPath: string
): PermissionError[] {
  const errors: PermissionError[] = []

  const permissionEnumFullPath = path.join(rootPath, config.permissionEnumPath)
  const seedDataFullPath = path.join(rootPath, config.seedDataPath)
  const menuConfigFullPath = path.join(rootPath, config.menuConfigPath)

  if (!fs.existsSync(permissionEnumFullPath)) {
    errors.push({
      type: 'missing_in_enum',
      file: config.permissionEnumPath,
      permission: 'N/A',
      message: `Permission enum file not found: ${config.permissionEnumPath}`,
      suggestion: 'Check the path configuration',
    })
    return errors
  }

  const permissionEnumContent = fs.readFileSync(permissionEnumFullPath, 'utf-8')
  const { names: definedPermissions, nameToCode } =
    extractPermissionEnumValues(permissionEnumContent)

  if (fs.existsSync(seedDataFullPath)) {
    const seedContent = fs.readFileSync(seedDataFullPath, 'utf-8')
    const seedCodes = extractSeedPermissionCodes(seedContent)

    for (const code of seedCodes) {
      const enumName = permissionCodeToEnumName(code)
      if (!definedPermissions.has(enumName)) {
        errors.push({
          type: 'missing_in_enum',
          file: config.seedDataPath,
          permission: code,
          message: `Seed data contains permission "${code}" but it's not defined in Permission enum`,
          suggestion: `Add ${enumName} = '${code}' to Permission enum or remove from seed data`,
        })
      }
    }

    for (const permName of definedPermissions) {
      const expectedCode = nameToCode.get(permName) || enumNameToPermissionCode(permName)
      if (!seedCodes.has(expectedCode)) {
        errors.push({
          type: 'missing_in_seed',
          file: config.seedDataPath,
          permission: permName,
          message: `Permission "${permName}" is defined in enum but missing in seed data`,
          suggestion: `Add permission with code "${expectedCode}" to seed data`,
        })
      }
    }
  }

  if (fs.existsSync(menuConfigFullPath)) {
    const menuContent = fs.readFileSync(menuConfigFullPath, 'utf-8')
    const menuUsages = extractPermissionUsages(menuContent)

    for (const usage of menuUsages) {
      if (!definedPermissions.has(usage.name)) {
        errors.push({
          type: 'missing_in_enum',
          file: config.menuConfigPath,
          line: usage.line,
          permission: usage.name,
          message: `Menu config uses Permission.${usage.name} but it's not defined in Permission enum`,
          suggestion: `Add ${usage.name} to Permission enum or fix the typo`,
        })
      }
    }
  }

  for (const routesDir of config.routesDirs) {
    const routesFullPath = path.join(rootPath, routesDir)
    if (!fs.existsSync(routesFullPath)) continue

    const routeFiles = glob.sync('**/*routes*.ts', {
      cwd: routesFullPath,
      ignore: config.ignoreDirs.map(d => `${d}/**`),
    })

    for (const routeFile of routeFiles) {
      const filePath = path.join(routesDir, routeFile)
      const content = fs.readFileSync(path.join(routesFullPath, routeFile), 'utf-8')
      const usages = extractPermissionUsages(content)

      for (const usage of usages) {
        if (!definedPermissions.has(usage.name)) {
          errors.push({
            type: 'missing_in_enum',
            file: filePath,
            line: usage.line,
            permission: usage.name,
            message: `Route uses Permission.${usage.name} but it's not defined in Permission enum`,
            suggestion: `Add ${usage.name} to Permission enum or fix the typo`,
          })
        }
      }
    }
  }

  for (const componentDir of config.componentDirs) {
    const componentFullPath = path.join(rootPath, componentDir)
    if (!fs.existsSync(componentFullPath)) continue

    const componentFiles = glob.sync('**/*.{ts,tsx}', {
      cwd: componentFullPath,
      ignore: config.ignoreDirs.map(d => `${d}/**`),
    })

    for (const componentFile of componentFiles) {
      const filePath = path.join(componentDir, componentFile)
      const content = fs.readFileSync(path.join(componentFullPath, componentFile), 'utf-8')
      const usages = extractPermissionUsages(content)

      for (const usage of usages) {
        if (!definedPermissions.has(usage.name)) {
          errors.push({
            type: 'missing_in_enum',
            file: filePath,
            line: usage.line,
            permission: usage.name,
            message: `Component uses Permission.${usage.name} but it's not defined in Permission enum`,
            suggestion: `Add ${usage.name} to Permission enum or fix the typo`,
          })
        }
      }
    }
  }

  return errors
}

export function formatPermissionErrors(errors: PermissionError[]): string {
  if (errors.length === 0) return ''

  const lines: string[] = ['\n❌ Permission consistency errors found:\n']

  const groupedErrors: Record<string, PermissionError[]> = {}
  for (const error of errors) {
    const key = error.type
    if (!groupedErrors[key]) groupedErrors[key] = []
    groupedErrors[key].push(error)
  }

  for (const [type, typeErrors] of Object.entries(groupedErrors)) {
    const typeLabels: Record<string, string> = {
      missing_in_enum: 'Missing in Permission Enum',
      missing_in_seed: 'Missing in Seed Data',
      wrong_permission: 'Wrong Permission Usage',
      unused_permission: 'Unused Permission',
    }
    lines.push(`\n  📌 ${typeLabels[type] || type}:`)

    for (const error of typeErrors) {
      const location = error.line ? `${error.file}:${error.line}` : error.file
      lines.push(`    • ${location}`)
      lines.push(`      Permission: ${error.permission}`)
      lines.push(`      Issue: ${error.message}`)
      lines.push(`      Suggestion: ${error.suggestion}`)
    }
  }

  lines.push(`\n  Total: ${errors.length} error(s)`)
  return lines.join('\n')
}
