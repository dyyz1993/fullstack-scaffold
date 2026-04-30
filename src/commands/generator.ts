/* eslint-disable no-console */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'
import type { BackendModule, ProjectConfig } from '../types.js'
import { moduleRegistry } from '../module-registry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const EXCLUDE_COPY = [
  'node_modules',
  '.wrangler',
  'data',
  '.sessions',
  '.workspaces',
  'dist',
  '.git',
]

function getTemplateDir(): string {
  return path.join(__dirname, '../../template')
}

async function copyTemplate(targetDir: string): Promise<void> {
  const templateDir = getTemplateDir()
  await fs.copy(templateDir, targetDir, {
    filter: (src: string) => {
      const relative = path.relative(templateDir, src)
      if (relative === '') return true
      const topDir = relative.split(path.sep)[0]
      return !EXCLUDE_COPY.includes(topDir)
    },
    dereference: false,
  })
}

async function deleteModuleFiles(
  targetDir: string,
  selectedModules: BackendModule[]
): Promise<void> {
  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !selectedModules.includes(m))

  for (const modKey of removedModules) {
    const mod = moduleRegistry[modKey]
    if (!mod) continue

    const dirs: Record<string, string[]> = {
      'src/server/': mod.files.server,
      'src/shared/modules/': mod.files.shared,
      'src/server/db/schema/': mod.files.dbSchema,
      'src/server/db/seeds/': mod.files.dbSeeds,
      'src/client/pages/': mod.files.clientPages,
      'src/client/stores/': mod.files.clientStores,
      'src/client/components/': mod.files.clientComponents,
      'src/client/hooks/': mod.files.clientHooks,
      'src/ops/pages/': mod.files.opsPages,
      'src/ops/components/': mod.files.opsComponents,
      'src/ops/hooks/': mod.files.opsHooks,
      'src/ops/stores/': mod.files.opsStores,
      'src/ops/services/': mod.files.opsServices,
      'src/tenant/': mod.files.tenantFiles,
      'src/platform/': mod.files.platformFiles,
      'src/cli/modules/': mod.files.cliModules,
    }

    for (const [base, files] of Object.entries(dirs)) {
      for (const file of files) {
        const filePath = path.join(targetDir, base, file)
        await fs.remove(filePath)
      }
    }
  }
}

async function deleteTestFilesForRemovedSources(
  targetDir: string,
  selectedModules: BackendModule[]
): Promise<void> {
  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !selectedModules.includes(m))

  const sourceToTestDirs: Record<string, string[]> = {
    'src/client/components/': ['src/client/components/__tests__/'],
    'src/client/pages/': ['src/client/pages/__tests__/'],
    'src/client/stores/': ['src/client/stores/__tests__/'],
    'src/client/hooks/': ['src/client/hooks/__tests__/'],
    'src/ops/pages/': ['src/ops/pages/__tests__/'],
    'src/ops/components/': ['src/ops/components/__tests__/'],
    'src/ops/stores/': ['src/ops/stores/__tests__/'],
    'src/tenant/pages/': ['src/tenant/pages/__tests__/'],
    'src/tenant/stores/': ['src/tenant/stores/__tests__/'],
  }

  for (const modKey of removedModules) {
    const mod = moduleRegistry[modKey]
    if (!mod) continue

    const allSourceFiles = [
      ...mod.files.clientComponents,
      ...mod.files.clientPages,
      ...mod.files.clientStores,
      ...mod.files.clientHooks,
      ...mod.files.opsPages,
      ...mod.files.opsComponents,
      ...mod.files.opsStores,
      ...mod.files.tenantFiles,
    ]

    for (const srcFile of allSourceFiles) {
      const fileName = srcFile.split('/').pop() || srcFile
      const baseName = fileName.replace(/\.(tsx|ts)$/, '')
      const testBaseName = baseName + '.test'

      for (const [, testDirs] of Object.entries(sourceToTestDirs)) {
        for (const testDir of testDirs) {
          for (const ext of ['.tsx', '.ts']) {
            const testFile = path.join(targetDir, testDir, testBaseName + ext)
            if (await fs.pathExists(testFile)) {
              await fs.remove(testFile)
            }
          }
        }
      }
    }
  }
}

async function deleteFrontendChannels(targetDir: string, config: ProjectConfig): Promise<void> {
  if (!config.channels.includes('web')) {
    await fs.remove(path.join(targetDir, 'src/client'))
    await fs.remove(path.join(targetDir, 'index.html'))
    if (config.modules.includes('tenant')) {
      await fs.remove(path.join(targetDir, 'src/tenant'))
    }
  }

  if (!config.channels.includes('ops')) {
    await fs.remove(path.join(targetDir, 'src/ops'))
    await fs.remove(path.join(targetDir, 'ops.html'))
  }

  if (!config.channels.includes('cli')) {
    await fs.remove(path.join(targetDir, 'src/cli'))
  }

  if (!config.modules.includes('tenant') && config.channels.includes('web')) {
    await fs.remove(path.join(targetDir, 'src/client/tenant'))
  }

  if (!config.backend) {
    await fs.remove(path.join(targetDir, 'src/server'))
    await fs.remove(path.join(targetDir, 'src/platform/server'))
  }
}

async function deleteLinesByIndices(filePath: string, lineIndices: number[]): Promise<void> {
  if (!(await fs.pathExists(filePath))) return
  if (lineIndices.length === 0) return

  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')
  const indexSet = new Set(lineIndices)

  const filtered = lines.filter((_, i) => !indexSet.has(i + 1))
  await fs.writeFile(filePath, filtered.join('\n'))
}

async function cleanRouteRegistry(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'src/server/route-registry.ts')
  if (!(await fs.pathExists(filePath))) return

  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !config.modules.includes(m))

  const importLinesToRemove = new Set<number>()
  const routeLinesToRemove = new Set<number>()

  for (const modKey of removedModules) {
    const refs = moduleRegistry[modKey]?.references?.routeRegistry
    if (!refs) continue
    refs.importLines.forEach(l => importLinesToRemove.add(l))
    refs.routeLines.forEach(l => routeLinesToRemove.add(l))
  }

  await deleteLinesByIndices(filePath, [...importLinesToRemove, ...routeLinesToRemove])

  const opsRelatedModules: BackendModule[] = [
    'ops',
    'order',
    'ticket',
    'dispute',
    'content',
    'captcha',
    'permission',
  ]
  const hasAnyOpsModule = config.modules.some(m => opsRelatedModules.includes(m))

  if (!hasAnyOpsModule || !config.channels.includes('ops')) {
    const opsOnlyModules: BackendModule[] = ['ops', 'order', 'ticket', 'dispute', 'content']
    const modulesToMigrate: BackendModule[] = ['captcha']
    const routeVarNames: Record<string, string> = { captcha: 'captchaRoutes' }

    const routeVarsToMigrate = modulesToMigrate
      .filter(m => config.modules.includes(m) && !opsOnlyModules.includes(m))
      .map(m => routeVarNames[m])

    const content = await fs.readFile(filePath, 'utf-8')
    let updated = content

    updated = updated.replace(/\n\/\/ 运营后台路由[\s\S]*?export type OpsApiRoutes.*\n?/g, '')
    updated = updated.replace(/.*opsApiRoutes.*\n?/g, '')
    updated = updated.replace(/import.*opsApiRoutes.*\n?/g, '')
    updated = updated.replace(/.*OpsApiRoutes.*\n?/g, '')

    if (routeVarsToMigrate.length > 0) {
      const clientBlockMatch = updated.match(
        /(export const clientApiRoutes = new OpenAPIHono\(\)(?:\s*\.route\([^)]+\)[^\n]*\n)*)/
      )
      if (clientBlockMatch) {
        const lastRouteMatch = clientBlockMatch[1].match(/(\s*\.route\([^)]+\))\s*$/)
        if (lastRouteMatch) {
          const insertRoutes = routeVarsToMigrate.map(v => `\n  .route('/api', ${v})`).join('')
          const insertPos =
            clientBlockMatch.index! +
            clientBlockMatch[1].lastIndexOf(lastRouteMatch[1]) +
            lastRouteMatch[1].length
          updated = updated.slice(0, insertPos) + insertRoutes + updated.slice(insertPos)
        }
      }
    }

    if (!config.channels.includes('ops')) {
      const codeWithoutImports = updated.replace(/^import\s.*$/gm, '').trim()
      const importLineRegex = /^import\s*\{([^}]*)\}\s*from\s*['"][^'"]*['"][^;\n]*;?\s*$/gm
      const replacements: Array<{ original: string; replacement: string }> = []
      let m
      while ((m = importLineRegex.exec(updated)) !== null) {
        const fullLine = m[0]
        const parsedVars = m[1]
          .split(',')
          .map(s => {
            const parts = s.trim().split(/\s+as\s+/)
            return {
              original: parts[0].trim(),
              alias: parts.length > 1 ? parts[1].trim() : parts[0].trim(),
            }
          })
          .filter(v => v.original)
        const usedVars = parsedVars.filter(v => {
          const re = new RegExp(`\\b${v.alias}\\b`)
          return re.test(codeWithoutImports)
        })
        if (usedVars.length === 0) {
          replacements.push({ original: fullLine, replacement: '' })
        } else if (usedVars.length < parsedVars.length) {
          const kept = usedVars.map(v => {
            if (v.original === v.alias) return v.original
            return `${v.original} as ${v.alias}`
          })
          const newImport = fullLine.replace(/\{[^}]*\}/, `{ ${kept.join(', ')} }`)
          replacements.push({ original: fullLine, replacement: newImport })
        }
      }
      for (const r of replacements) {
        updated = updated.replace(r.original, r.replacement)
      }
    }

    updated = updated.replace(/\n{3,}/g, '\n\n')
    updated = updated.replace(/\.route\(\s*'\/'\s*,\s*new OpenAPIHono\(\)\s*\)\s*\n?/g, '')
    updated = updated.trimEnd() + '\n'
    await fs.writeFile(filePath, updated)
  }

  let content = await fs.readFile(filePath, 'utf-8')
  const clientRoutesMatch = content.match(
    /export const clientApiRoutes = new OpenAPIHono\(\)([\s\S]*?)\n\n/
  )
  if (clientRoutesMatch) {
    const chainBlock = clientRoutesMatch[1].trim()
    if (!chainBlock) {
      content = content.replace(/export const clientApiRoutes = new OpenAPIHono\(\)\n\n/g, '')
      content = content.replace(/export type ClientApiRoutes[^\n]*\n/g, '')
      content = content.replace(/\s*\.route\('\/',\s*clientApiRoutes\)\s*\n/g, '\n')
      await fs.writeFile(filePath, content)

      const appPath = path.join(targetDir, 'src/server/app.ts')
      if (await fs.pathExists(appPath)) {
        let appContent = await fs.readFile(appPath, 'utf-8')
        appContent = appContent.replace(/\s*\.route\('\/',\s*clientApiRoutes\)\s*\n/g, '\n')
        appContent = appContent.replace(/,\s*clientApiRoutes/g, '')
        appContent = appContent.replace(/clientApiRoutes\s*,\s*/g, '')
        appContent = appContent.replace(/export type ClientApiType[^\n]*\n/g, '')
        await fs.writeFile(appPath, appContent)
      }

      const serverIndexPath = path.join(targetDir, 'src/server/index.ts')
      if (await fs.pathExists(serverIndexPath)) {
        let idxContent = await fs.readFile(serverIndexPath, 'utf-8')
        idxContent = idxContent.replace(/,\s*ClientApiType/g, '')
        idxContent = idxContent.replace(/ClientApiType\s*,\s*/g, '')
        await fs.writeFile(serverIndexPath, idxContent)
      }
    } else {
      await fs.writeFile(filePath, content)
    }
  } else {
    await fs.writeFile(filePath, content)
  }
}

async function cleanDbSchemaIndex(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'src/server/db/schema/index.ts')
  if (!(await fs.pathExists(filePath))) return

  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !config.modules.includes(m))

  const linesToRemove: number[] = []
  for (const modKey of removedModules) {
    const refs = moduleRegistry[modKey]?.references?.dbSchemaIndex
    if (refs) linesToRemove.push(...refs)
  }

  await deleteLinesByIndices(filePath, linesToRemove)
}

async function cleanSharedSchemasIndex(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'src/shared/schemas/index.ts')
  if (!(await fs.pathExists(filePath))) return

  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !config.modules.includes(m))

  const linesToRemove: number[] = []
  for (const modKey of removedModules) {
    const refs = moduleRegistry[modKey]?.references?.sharedSchemasIndex
    if (refs) linesToRemove.push(...refs)
  }

  await deleteLinesByIndices(filePath, linesToRemove)

  if (await fs.pathExists(filePath)) {
    let content = await fs.readFile(filePath, 'utf-8')
    content = content.replace(
      /\/\/\s*Re-export modules\s*\nexport\s*\{\s*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
      ''
    )
    content = content.replace(/\nexport\s*\{\s*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g, '\n')
    content = content.replace(/\nexport\s*\{\s*$/g, '')
    content = content.replace(/\/\/\s*Re-export modules\s*\n\s*$/g, '')
    await fs.writeFile(filePath, content)
  }
}

async function cleanSharedModulesIndex(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'src/shared/modules/index.ts')
  if (!(await fs.pathExists(filePath))) return

  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !config.modules.includes(m))

  const linesToRemove: number[] = []
  for (const modKey of removedModules) {
    const refs = moduleRegistry[modKey]?.references?.sharedModulesIndex
    if (refs) linesToRemove.push(...refs)
  }

  await deleteLinesByIndices(filePath, linesToRemove)
}

async function cleanClientApp(targetDir: string, config: ProjectConfig): Promise<void> {
  if (!config.channels.includes('web')) return

  const filePath = path.join(targetDir, 'src/client/App.tsx')
  if (!(await fs.pathExists(filePath))) return

  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !config.modules.includes(m))

  const importLinesToRemove = new Set<number>()
  const routeLinesToRemove = new Set<number>()

  for (const modKey of removedModules) {
    const refs = moduleRegistry[modKey]?.references?.clientApp
    if (!refs) continue
    refs.importLines.forEach(l => importLinesToRemove.add(l))
    refs.routeLines.forEach(l => routeLinesToRemove.add(l))
  }

  await deleteLinesByIndices(filePath, [...importLinesToRemove, ...routeLinesToRemove])

  if (!config.modules.includes('tenant')) {
    const content = await fs.readFile(filePath, 'utf-8')
    const updated = content.replace(/\/\/ tenant start[\s\S]*?\/\/ tenant end\n?/gi, '')
    await fs.writeFile(filePath, updated)
  }

  const clientModulesWithRoutes: BackendModule[] = ['todos', 'chat', 'notifications', 'tenant']
  const hasClientRoutes = config.modules.some(m => clientModulesWithRoutes.includes(m))

  if (!hasClientRoutes) {
    const homePagePath = path.join(targetDir, 'src/client/pages/HomePage.tsx')
    if (!(await fs.pathExists(homePagePath))) {
      await fs.ensureDir(path.dirname(homePagePath))
      await fs.writeFile(
        homePagePath,
        `export const HomePage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome</h1>
        <p className="text-gray-500">Get started by adding modules to your project.</p>
      </div>
    </div>
  )
}
`
      )
    }

    let content = await fs.readFile(filePath, 'utf-8')
    content = content.replace(
      /<Route path="\/" element=\{<Navigate to="\/todos" replace \/>\} \/>/g,
      '<Route path="/" element={<HomePage />} />'
    )
    const hasHomePageImport = /import.*HomePage/.test(content)
    if (!hasHomePageImport) {
      content = content.replace(
        /import\s*\{([^}]*)\}\s*from\s*['"]react-router-dom['"]/,
        (match, imports: string) => {
          const cleaned = imports
            .replace(/,?\s*Navigate/g, '')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, ' }')
          if (cleaned.match(/\{\s*\}/)) return match
          return `import { ${cleaned.replace(/\{|\}/g, '').trim()} } from 'react-router-dom'`
        }
      )
      const layoutImportMatch = content.match(
        /import\s*\{\s*Layout\s*\}\s*from\s*['"]\.\/Layout['"]/
      )
      if (layoutImportMatch) {
        const insertPos = content.indexOf(layoutImportMatch[0]) + layoutImportMatch[0].length
        content =
          content.slice(0, insertPos) +
          "\nimport { HomePage } from './pages/HomePage'" +
          content.slice(insertPos)
      }
    }
    await fs.writeFile(filePath, content)
  }
}

async function cleanOpsApp(targetDir: string, config: ProjectConfig): Promise<void> {
  if (!config.channels.includes('ops')) return

  const filePath = path.join(targetDir, 'src/ops/App.tsx')
  if (!(await fs.pathExists(filePath))) return

  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !config.modules.includes(m))

  const importLinesToRemove = new Set<number>()
  const routeLinesToRemove = new Set<number>()

  for (const modKey of removedModules) {
    const refs = moduleRegistry[modKey]?.references?.opsApp
    if (!refs) continue
    refs.importLines.forEach(l => importLinesToRemove.add(l))
    refs.routeLines.forEach(l => routeLinesToRemove.add(l))
  }

  await deleteLinesByIndices(filePath, [...importLinesToRemove, ...routeLinesToRemove])
}

async function cleanClientNavigation(targetDir: string, config: ProjectConfig): Promise<void> {
  if (!config.channels.includes('web')) return

  const filePath = path.join(targetDir, 'src/client/components/Navigation.tsx')
  if (!(await fs.pathExists(filePath))) return

  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !config.modules.includes(m))

  const keysToRemove = new Set<string>()
  for (const modKey of removedModules) {
    const refs = moduleRegistry[modKey]?.references?.clientNavigation
    if (refs) refs.forEach(k => keysToRemove.add(k))
  }

  if (keysToRemove.size === 0) return

  const content = await fs.readFile(filePath, 'utf-8')

  const routeKeyLineRegex = /^type RouteKey = (.*)$/m
  const routeKeyMatch = content.match(routeKeyLineRegex)
  if (!routeKeyMatch) return

  const allKeys: string[] = []
  const keyRegex = /'([^']+)'/g
  let m
  while ((m = keyRegex.exec(routeKeyMatch[1])) !== null) {
    allKeys.push(m[1])
  }

  const keptKeys = allKeys.filter(k => !keysToRemove.has(k))

  let updated = content

  if (keptKeys.length === 0) {
    updated = updated.replace(routeKeyLineRegex, `type RouteKey = never`)

    const routeDeclStart = updated.indexOf('const routes:')
    if (routeDeclStart !== -1) {
      const routeObjStart = updated.indexOf('= {', routeDeclStart)
      if (routeObjStart !== -1) {
        let depth = 0
        let routeObjEnd = -1
        for (let i = routeObjStart + 2; i < updated.length; i++) {
          if (updated[i] === '{') depth++
          if (updated[i] === '}') {
            depth--
            if (depth === 0) {
              routeObjEnd = i
              break
            }
          }
        }
        if (routeObjEnd !== -1) {
          updated =
            updated.slice(0, routeDeclStart) +
            'const routes: Record<RouteKey, { label: string; icon: React.FC<{ className?: string }>; path: string }> = {}' +
            updated.slice(routeObjEnd + 1)
        }
      }
    }

    const navItemsRegex =
      /\{[\s\S]*?\(Object\.keys\(routes\) as RouteKey\[\]\)[\s\S]*?\}\s*\n\s*\)\s*\n\s*\}\s*<\/div>/
    updated = updated.replace(navItemsRegex, '')

    const navDivRegex = /<div className="flex items-center gap-1">[\s\S]*?<\/div>\s*\n/
    updated = updated.replace(navDivRegex, '')

    updated = updated.replace(
      /import\s*\{[^}]*NavLink[^}]*\}\s*from\s*['"]react-router-dom['"]\s*;?\s*\n?/g,
      ''
    )
    updated = updated.replace(/^type RouteKey = never\s*\n?/m, '')

    const routeDeclStart2 = updated.indexOf('const routes:')
    if (routeDeclStart2 !== -1) {
      const routeDeclEnd2 = updated.indexOf('\n', updated.indexOf('= {}', routeDeclStart2))
      if (routeDeclEnd2 !== -1) {
        updated = updated.slice(0, routeDeclStart2) + updated.slice(routeDeclEnd2 + 1)
      }
    }

    const allIconNames = [
      'CheckCircle',
      'Bell',
      'Plug',
      'Rocket',
      'Github',
      'Building2',
      'MessageSquare',
    ]
    const importLineRegex = /import\s*\{([^}]*)\}\s*from\s*'lucide-react'/m
    const importMatch = updated.match(importLineRegex)
    if (importMatch) {
      const remaining = importMatch[1]
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => !allIconNames.includes(s.split(/\s+as\s+/)[0].trim()))
      if (remaining.length === 0) {
        updated = updated.replace(importLineRegex, '')
      } else {
        updated = updated.replace(
          importLineRegex,
          `import { ${remaining.join(', ')} } from 'lucide-react'`
        )
      }
    }

    updated = updated.replace(/<Rocket[^/]*\/>/g, '🚀')
    updated = updated.replace(/<Github[^/]*\/>/g, '')
  } else {
    updated = updated.replace(
      routeKeyLineRegex,
      `type RouteKey = ${keptKeys.map(k => `'${k}'`).join(' | ')}`
    )

    const routeEntryRegex = /^\s+(\w+):\s*\{[^}]*\},?\s*$/gm
    updated = updated.replace(routeEntryRegex, (match, key) => {
      if (keysToRemove.has(key)) return ''
      return match
    })

    const iconImportsToRemove = new Set<string>()
    for (const key of keysToRemove) {
      const iconMap: Record<string, string> = {
        todos: 'CheckCircle',
        notifications: 'Bell',
        chat: 'MessageSquare',
        websocket: 'Plug',
        tenants: 'Building2',
      }
      if (iconMap[key]) iconImportsToRemove.add(iconMap[key])
    }

    if (iconImportsToRemove.size > 0) {
      const importLineRegex = /import\s*\{([^}]*)\}\s*from\s*'lucide-react'/m
      updated = updated.replace(importLineRegex, (_match, imports: string) => {
        const cleanedImports = imports
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => {
            const name = s.split(/\s+as\s+/)[0].trim()
            return !iconImportsToRemove.has(name)
          })
          .join(', ')
        return `import { ${cleanedImports} } from 'lucide-react'`
      })
    }
  }

  await fs.writeFile(filePath, updated)
}

async function cleanClientComponentsIndex(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'src/client/components/index.ts')
  if (!(await fs.pathExists(filePath))) return

  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !config.modules.includes(m))

  const removedComponents = new Set<string>()
  for (const modKey of removedModules) {
    const mod = moduleRegistry[modKey]
    if (!mod) continue
    mod.files.clientComponents.forEach(c => {
      const name = c.replace(/\.(tsx|ts)$/, '')
      removedComponents.add(name)
    })
  }

  if (removedComponents.size === 0) return

  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')
  const filtered = lines.filter(line => {
    for (const comp of removedComponents) {
      if (
        line.includes(`/${comp}'`) ||
        line.includes(`/${comp}"`) ||
        line.includes(`'./${comp}'`) ||
        line.includes(`"./${comp}"`)
      )
        return false
    }
    return true
  })
  await fs.writeFile(filePath, filtered.join('\n'))
}

async function cleanCliModulesIndex(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'src/cli/modules/index.ts')
  if (!(await fs.pathExists(filePath))) return

  const allModules = Object.keys(moduleRegistry) as BackendModule[]
  const removedModules = allModules.filter(m => !config.modules.includes(m))

  const cliModuleMap: Record<string, string[]> = {
    todos: ['todo', 'registerTodoCommands'],
    notifications: ['notification', 'registerNotificationCommands'],
  }

  const removedImports = new Set<string>()
  const removedCalls = new Set<string>()
  for (const modKey of removedModules) {
    const mapping = cliModuleMap[modKey]
    if (!mapping) continue
    removedImports.add(mapping[0])
    removedCalls.add(mapping[1])
  }

  if (removedImports.size === 0) return

  const content = await fs.readFile(filePath, 'utf-8')
  let updated = content
  for (const imp of removedImports) {
    updated = updated.replace(new RegExp(`import[^\\n]*['"]\\.\\/${imp}['"][^\\n]*\\n?`, 'g'), '')
  }
  for (const call of removedCalls) {
    updated = updated.replace(new RegExp(`^[ \\t]*${call}\\([^)]*\\)\\s*\\n?`, 'gm'), '')
    updated = updated.replace(new RegExp(`\\b${call}\\b,?\\s*`, 'g'), '')
    updated = updated.replace(new RegExp(`,\\s*\\b${call}\\b`, 'g'), '')
  }
  updated = updated.replace(/\{\s*,/g, '{')
  updated = updated.replace(/,\s*\}/g, ' }')
  await fs.writeFile(filePath, updated)
}

async function cleanReferenceFiles(targetDir: string, config: ProjectConfig): Promise<void> {
  await cleanRouteRegistry(targetDir, config)
  await cleanDbSchemaIndex(targetDir, config)
  await cleanSharedSchemasIndex(targetDir, config)
  await cleanSharedModulesIndex(targetDir, config)
  await cleanClientApp(targetDir, config)
  await cleanOpsApp(targetDir, config)
  await cleanClientNavigation(targetDir, config)
  await cleanClientComponentsIndex(targetDir, config)
  await cleanCliModulesIndex(targetDir, config)
}

async function updateViteConfig(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'vite.config.ts')
  if (!(await fs.pathExists(filePath))) return

  let content = await fs.readFile(filePath, 'utf-8')

  if (!config.channels.includes('web')) {
    content = content.replace(/['"].\/index\.html['"],?\n?/g, '')
    content = content.replace(/input:\s*\{[^}]*index\.html[^}]*\},?\n?/g, '')
  }

  if (!config.channels.includes('ops')) {
    content = content.replace(/['"].\/ops\.html['"],?\n?/g, '')
    content = content.replace(/input:\s*\{[^}]*ops\.html[^}]*\},?\n?/g, '')
  }

  if (!config.backend) {
    content = content.replace(/import devServer from ['"]@hono\/vite-dev-server['"]\n?/g, '')
    content = content.replace(
      /import\s*\{[^}]*\}\s*from\s*['"][^'"]*vite-plugins['"]\s*;?\s*\n?/g,
      ''
    )
    content = content.replace(/\s*devServer\(\{[\s\S]*?\}\),?\n?/g, '')
    content = content.replace(/\s*websocketPlugin\(\),?\n?/g, '')
    content = content.replace(/\s*dbPlugin\(\),?\n?/g, '')
  }

  await fs.writeFile(filePath, content)

  if (!config.backend) {
    await fs.remove(path.join(targetDir, 'vite-plugins.ts'))
  }
}

async function updatePackageJson(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'package.json')
  if (!(await fs.pathExists(filePath))) return

  const pkg = await fs.readJson(filePath)
  pkg.name = path.basename(config.name)

  if (!config.channels.includes('cli')) {
    delete pkg.bin
  }

  const frontendDeps = new Set([
    'react',
    'react-dom',
    'react-router-dom',
    'antd',
    'zustand',
    '@ant-design/icons',
    'tailwindcss',
    'postcss',
    'autoprefixer',
  ])

  const backendDeps = new Set([
    'hono',
    'drizzle-orm',
    'better-auth',
    '@hono/node-server',
    '@hono/swagger-ui',
  ])

  const cloudflareDeps = new Set(['wrangler'])

  const nodeDeps = new Set(['@hono/node-server'])

  const selectedDeps: Record<string, string> = {}
  const selectedDevDeps: Record<string, string> = {}

  for (const modKey of config.modules) {
    const mod = moduleRegistry[modKey]
    if (!mod) continue
    Object.assign(selectedDeps, mod.dependencies)
    Object.assign(selectedDevDeps, mod.devDependencies)
  }

  if (pkg.dependencies) {
    const filtered: Record<string, string> = {}
    for (const [dep, ver] of Object.entries(pkg.dependencies)) {
      if (
        frontendDeps.has(dep) &&
        !config.channels.includes('web') &&
        !config.channels.includes('ops')
      )
        continue
      if (backendDeps.has(dep) && !config.backend) continue
      if (cloudflareDeps.has(dep) && !backendDeps.has(dep) && config.deploy === 'node') continue
      if (nodeDeps.has(dep) && config.deploy === 'cloudflare') continue
      filtered[dep] = ver as string
    }
    Object.assign(filtered, selectedDeps)
    pkg.dependencies = filtered
  }

  if (pkg.devDependencies) {
    const filtered: Record<string, string> = {}
    for (const [dep, ver] of Object.entries(pkg.devDependencies)) {
      if (
        frontendDeps.has(dep) &&
        !config.channels.includes('web') &&
        !config.channels.includes('ops')
      )
        continue
      if (backendDeps.has(dep) && !config.backend) continue
      if (cloudflareDeps.has(dep) && !backendDeps.has(dep) && config.deploy === 'node') continue
      if (nodeDeps.has(dep) && config.deploy === 'cloudflare') continue
      filtered[dep] = ver as string
    }
    Object.assign(filtered, selectedDevDeps)
    pkg.devDependencies = filtered
  }

  await fs.writeJson(filePath, pkg, { spaces: 2 })
}

async function updateWranglerToml(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'wrangler.toml')
  if (!(await fs.pathExists(filePath))) return

  let content = await fs.readFile(filePath, 'utf-8')
  const baseName = path.basename(config.name)
  const dbName = baseName.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') + '-db'
  const workerName = baseName
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!config.backend) {
    content = `name = "${workerName}"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist/client"
not_found_handling = "single-page-application"

[dev]
port = 8787
local_protocol = "http"
`
    await fs.writeFile(filePath, content)
    return
  }

  content = content.replace(/^name = ".*"/m, `name = "${workerName}"`)
  content = content.replace(/database_name = ".*"/g, `database_name = "${dbName}"`)

  await fs.writeFile(filePath, content)
}

async function handleCloudflareCleanup(targetDir: string, config: ProjectConfig): Promise<void> {
  if (config.deploy === 'cloudflare' || !config.backend) {
    await fs.remove(path.join(targetDir, 'docker-compose.yml'))
  }

  if (!config.backend) {
    await fs.remove(path.join(targetDir, 'Dockerfile'))
  }

  if (config.deploy === 'cloudflare') {
    await updateWranglerToml(targetDir, config)
  }

  if (config.deploy === 'node' && !config.backend) {
    await fs.remove(path.join(targetDir, 'wrangler.toml'))
  }

  if (config.deploy === 'node') {
    await fs.remove(path.join(targetDir, 'src/server/core/durable-objects'))
    await fs.remove(path.join(targetDir, 'src/server/core/runtime-cloudflare.ts'))
    await fs.remove(path.join(targetDir, 'src/server/db/driver-cloudflare.ts'))
    await fs.remove(path.join(targetDir, 'src/server/entries/cloudflare.ts'))

    const configPath = path.join(targetDir, 'src/server/config.ts')
    if (await fs.pathExists(configPath)) {
      let content = await fs.readFile(configPath, 'utf-8')
      content = content.replace(
        /\/\/\s*Cloudflare[\s\S]*?case\s+'cloudflare':[\s\S]*?break;\s*\n?/g,
        ''
      )
      content = content.replace(/\bdatabase\b\s*:\s*D1Database[^,\n]*,?\s*\n?/g, '')
      content = content.replace(/D1Database/g, 'never')
      content = content.replace(/\|\s*D1Database/g, '')
      await fs.writeFile(configPath, content)
    }

    const bindingsPath = path.join(targetDir, 'src/server/types/bindings.ts')
    if (await fs.pathExists(bindingsPath)) {
      let content = await fs.readFile(bindingsPath, 'utf-8')
      content = content.replace(/D1Database/g, 'never')
      content = content.replace(/DurableObjectNamespace/g, 'never')
      await fs.writeFile(bindingsPath, content)
    }

    const driverPath = path.join(targetDir, 'src/server/db/driver.ts')
    if (await fs.pathExists(driverPath)) {
      let content = await fs.readFile(driverPath, 'utf-8')
      content = content.replace(
        /import\s*\{\s*drizzle\s+as\s+drizzleD1\s*\}\s*from\s*['"]drizzle-orm\/d1['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(/type\s+D1Db\s*=\s*[^;]*;\s*\n?/g, '')
      content = content.replace(/\|\s*D1Db/g, '')
      content = content.replace(/D1Database/g, 'never')
      content = content.replace(
        /function\s+createD1Db[\s\S]*?^}/m,
        "function createD1Db(_config: DatabaseConfig): never { throw new Error('D1 not available') }"
      )
      await fs.writeFile(driverPath, content)
    }

    const coreIndexPath = path.join(targetDir, 'src/server/core/index.ts')
    if (await fs.pathExists(coreIndexPath)) {
      let content = await fs.readFile(coreIndexPath, 'utf-8')
      content = content.replace(
        /export\s*\{\s*RealtimeDurableObject\s*\}\s*from\s*['"][^'"]*RealtimeDO['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(
        /export\s*\{\s*CloudflareRuntimeAdapter[^}]*\}\s*from\s*['"][^'"]*runtime-cloudflare['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(/DurableObjectNamespace/g, 'never')
      content = content.replace(
        /import\s*\{\s*isCloudflare\s*\}\s*from\s*['"][^'"]*env['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(/isCloudflare/g, 'false')

      {
        const lines = content.split('\n')
        const marker = 'if (false && _env?.REALTIME_DO)'
        const startIdx = lines.findIndex(l => l.includes(marker))
        if (startIdx !== -1) {
          let depth = 0
          let endIdx = startIdx
          for (let i = startIdx; i < lines.length; i++) {
            for (const ch of lines[i]) {
              if (ch === '{') depth++
              if (ch === '}') depth--
            }
            if (depth === 0 && i > startIdx) {
              endIdx = i
              break
            }
          }
          lines.splice(startIdx, endIdx - startIdx + 1)
          content = lines.join('\n')
        }
      }

      content = content.replace(/let _env:[^\n]*\n/g, '')
      content = content.replace(/let _realtimeService:[^\n]*\n/g, '')
      content = content.replace(/export function setRealtimeEnv[\s\S]*?\n\}\s*\n/g, '')
      content = content.replace(
        /export function getRealtimeService\(\)[^{]*\{[\s\S]*?\n\}/,
        'export function getRealtimeService(): RealtimeService {\n  return createRealtimeService()\n}'
      )

      await fs.writeFile(coreIndexPath, content)

      const realtimeEnvMiddlewarePath = path.join(
        targetDir,
        'src/server/middleware/realtime-env.ts'
      )
      if (await fs.pathExists(realtimeEnvMiddlewarePath)) {
        let reContent = await fs.readFile(realtimeEnvMiddlewarePath, 'utf-8')
        reContent = reContent.replace(
          /import\s*\{\s*setRealtimeEnv\s*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
          ''
        )
        reContent = reContent.replace(/DurableObjectNamespace/g, 'never')
        reContent = reContent.replace(/const\s+env\s*=\s*c\.env[^\n]*\n?/g, '')
        reContent = reContent.replace(/if\s*\(env\)\s*\{[^}]*\}\s*\n?/g, '')
        reContent = reContent.replace(/return async \(c, next\)/, 'return async (_c, next)')
        await fs.writeFile(realtimeEnvMiddlewarePath, reContent)
      }

      const platformNotificationRoutes = path.join(
        targetDir,
        'src/platform/server/module-notification/routes/notification-routes.ts'
      )
      if (await fs.pathExists(platformNotificationRoutes)) {
        let content = await fs.readFile(platformNotificationRoutes, 'utf-8')
        content = content.replace(
          /const env = c\.env as \{ REALTIME_DO\?: DurableObjectNamespace \} \| undefined\s*\n\s*if \(env\?\.REALTIME_DO\) \{[\s\S]*?return stub\.fetch\(doRequest\)\s*\n\s*\}/,
          '// DurableObject not available in node deployment'
        )
        content = content.replace(/DurableObjectNamespace/g, 'never')
        await fs.writeFile(platformNotificationRoutes, content)
      }

      const notificationRoutesPath = path.join(
        targetDir,
        'src/server/module-notifications/routes/notification-routes.ts'
      )
      if (await fs.pathExists(notificationRoutesPath)) {
        let content = await fs.readFile(notificationRoutesPath, 'utf-8')
        content = content.replace(
          /const env = c\.env as \{ REALTIME_DO\?: DurableObjectNamespace \} \| undefined\s*\n\s*if \(env\?\.REALTIME_DO\) \{[\s\S]*?return stub\.fetch\(doRequest\)\s*\n\s*\}/,
          '// DurableObject not available in node deployment'
        )
        content = content.replace(/DurableObjectNamespace/g, 'never')
        await fs.writeFile(notificationRoutesPath, content)
      }
    }
  }
}

async function updateTsupConfig(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'tsup.config.ts')
  if (!(await fs.pathExists(filePath))) return

  let content = await fs.readFile(filePath, 'utf-8')

  const removeBlock = (src: string, marker: string): string => {
    const lines = src.split('\n')
    const markerIdx = lines.findIndex(l => l.includes(marker))
    if (markerIdx === -1) return src

    let objStart = markerIdx
    while (objStart > 0 && !lines[objStart].trimStart().startsWith('{')) {
      objStart--
    }

    let depth = 0
    let objEnd = objStart
    for (let i = objStart; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') depth++
        if (ch === '}') depth--
      }
      if (depth === 0) {
        objEnd = i
        break
      }
    }

    let result = lines.slice(0, objStart).join('\n') + '\n' + lines.slice(objEnd + 1).join('\n')
    result = result.replace(/,\s*,/g, ',')
    result = result.replace(/\[\s*\n?\s*,/g, '[')
    result = result.replace(/,(\s*\n?\s*\])/, '$1')
    return result
  }

  if (!config.channels.includes('cli')) {
    content = removeBlock(content, 'src/cli/index.ts')
  }

  if (config.deploy !== 'cloudflare' || !config.backend) {
    content = removeBlock(content, 'entries/cloudflare')
  }

  if (config.deploy !== 'node' || !config.backend) {
    content = removeBlock(content, 'entries/node')
  }

  await fs.writeFile(filePath, content)
}

async function updateTsconfig(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'tsconfig.json')
  if (!(await fs.pathExists(filePath))) return

  let content = await fs.readFile(filePath, 'utf-8')

  content = content.replace(/"bun-types"/g, '"__removed__"')

  if (config.deploy !== 'cloudflare') {
    content = content.replace(/"@cloudflare\/workers-types"/g, '"__removed__"')
  }
  content = content.replace(/"__removed__"\s*,\s*/g, '')
  content = content.replace(/,\s*"__removed__"/g, '')
  content = content.replace(/\[\s*"__removed__"\s*\]/g, '[]')

  if (!config.backend) {
    content = content.replace(/"types"\s*:\s*\[.*?\]/g, '"types": []')
  }

  await fs.writeFile(filePath, content)
}

async function updateDrizzleConfig(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'drizzle.config.ts')
  if (!(await fs.pathExists(filePath))) return

  if (config.database === 'mysql') {
    await fs.writeFile(
      filePath,
      `import { defineConfig } from 'drizzle-kit';\nimport { getDatabaseConfig } from './src/server/db/config';\n\nconst config = getDatabaseConfig();\n\nexport default defineConfig({\n  schema: './src/server/db/schema/index.ts',\n  out: './drizzle',\n  dialect: 'mysql',\n  dbCredentials: {\n    host: config.mysqlHost || 'localhost',\n    port: config.mysqlPort || 3306,\n    user: config.mysqlUser || 'root',\n    password: config.mysqlPassword || '',\n    database: config.mysqlDatabase || 'biomimic',\n  },\n});\n`
    )
  } else if (config.database === 'd1') {
    await fs.writeFile(
      filePath,
      `import { defineConfig } from 'drizzle-kit';\n\nexport default defineConfig({\n  schema: './src/server/db/schema/index.ts',\n  out: './drizzle',\n  dialect: 'sqlite',\n  driver: 'd1-http',\n});\n`
    )
  }
}

async function updateDbDriver(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'src/server/db/driver.ts')
  if (!(await fs.pathExists(filePath))) return

  if (config.database === 'mysql') {
    await fs.writeFile(
      filePath,
      `import { getDatabaseConfig, type DatabaseConfig } from '../config';\nimport * as schema from './schema';\nimport { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';\nimport mysql from 'mysql2/promise';\nimport { logger } from '../utils/logger';\n\ntype MysqlDb = ReturnType<typeof drizzleMysql<typeof schema>>;\ntype Db = MysqlDb;\n\nlet _db: Db | null = null;\nlet _pool: mysql.Pool | null = null;\n\nconst log = logger.db();\n\nexport async function getDb(): Promise<Db> {\n  if (_db) return _db;\n\n  const config = getDatabaseConfig();\n\n  log.debug({ driver: config.driver }, 'Creating database connection');\n\n  const { db, pool } = createMysqlDb(config);\n  _db = db as unknown as Db;\n  _pool = pool;\n\n  log.info({ driver: config.driver }, 'Database connected');\n  return _db;\n}\n\nexport function getRawClient() {\n  return _pool;\n}\n\nexport async function closeDb(): Promise<void> {\n  if (_pool) {\n    await _pool.end();\n    _pool = null;\n    _db = null;\n  }\n}\n\nexport async function runMigrations(): Promise<void> {\n  log.info({}, 'Running migrations...');\n}\n\nfunction createMysqlDb(config: DatabaseConfig): { db: MysqlDb; pool: mysql.Pool } {\n  const pool = mysql.createPool({\n    host: config.mysqlHost || 'localhost',\n    port: config.mysqlPort || 3306,\n    user: config.mysqlUser || 'root',\n    password: config.mysqlPassword || '',\n    database: config.mysqlDatabase || 'biomimic',\n  });\n  const db = drizzleMysql(pool, { schema, mode: 'default' }) as unknown as MysqlDb;\n  log.debug({}, 'MySQL database created');\n  return { db, pool };\n}\n`
    )
  }
}

async function updateDbSchemaForMysql(targetDir: string, config: ProjectConfig): Promise<void> {
  if (config.database !== 'mysql') return

  const schemaDir = path.join(targetDir, 'src/server/db/schema')
  if (!(await fs.pathExists(schemaDir))) return

  const files = await fs.readdir(schemaDir)
  for (const file of files) {
    if (!file.endsWith('.ts') || file === 'index.ts') continue
    const filePath = path.join(schemaDir, file)
    let content = await fs.readFile(filePath, 'utf-8')

    content = content.replace(
      /import\s*\{\s*sqliteTable,\s*integer,\s*text\s*\}\s*from\s*['"]drizzle-orm\/sqlite-core['"]\s*;?/g,
      "import { mysqlTable, int, varchar, mysqlEnum, timestamp } from 'drizzle-orm/mysql-core';"
    )
    content = content.replace(/sqliteTable/g, 'mysqlTable')
    content = content.replace(
      /integer\(\s*'(\w+)'\s*\)\.primaryKey\(\s*\{\s*autoIncrement:\s*true\s*\}\s*\)/g,
      "int('$1').primaryKey().autoincrement()"
    )
    content = content.replace(
      /integer\(\s*'(\w+)'\s*,\s*\{\s*mode:\s*'timestamp'\s*\}\s*\)\s*\n?\s*\.notNull\(\)\s*\n?\s*\.default\(\s*sql\s*`\(unixepoch\(\)\s*\*\s*1000\)`\s*\)/g,
      "timestamp('$1').notNull().default(sql`CURRENT_TIMESTAMP`)"
    )
    content = content.replace(/integer\(/g, 'int(')
    content = content.replace(
      /text\(\s*'(\w+)'\s*,\s*\{\s*enum:\s*(\w+)\s*\}\s*\)/g,
      "mysqlEnum('$1', $2)"
    )
    content = content.replace(/(\.\s*)text\(/g, '$1varchar(')

    const usedImports = ['mysqlTable', 'int', 'varchar', 'timestamp']
    if (content.includes('mysqlEnum(')) usedImports.push('mysqlEnum')
    const importLine = content.match(
      /import\s*\{[^}]+\}\s*from\s*['"]drizzle-orm\/mysql-core['"]\s*;?/
    )
    if (importLine) {
      content = content.replace(
        importLine[0],
        `import { ${usedImports.join(', ')} } from 'drizzle-orm/mysql-core';`
      )
    }

    await fs.writeFile(filePath, content)
  }

  const testsDir = path.join(targetDir, 'src/server/module-todos/__tests__')
  if (await fs.pathExists(testsDir)) {
    const testFiles = await fs.readdir(testsDir)
    for (const f of testFiles) {
      if (f.endsWith('.test.ts')) {
        const tf = path.join(testsDir, f)
        const tc = await fs.readFile(tf, 'utf-8')
        if (tc.includes('.execute({') || tc.includes('.rows')) {
          await fs.remove(tf)
        }
      }
    }
  }

  const serviceDir = path.join(targetDir, 'src/server/module-todos/services')
  if (await fs.pathExists(serviceDir)) {
    const todoServicePath = path.join(serviceDir, 'todo-service.ts')
    if (await fs.pathExists(todoServicePath)) {
      let content = await fs.readFile(todoServicePath, 'utf-8')

      content = content.replace(
        /const result = await db\s*\n?\s*\.insert\(todos\)\s*\n?\s*\.values\(\{[^}]+\}\)\s*\n?\s*\.returning\(\)\s*\n?\s*const row = result\[0\]\s*\n?\s*return\s*\{[^}]+\}/,
        `await db.insert(todos).values({
      title: input.title,
      description: input.description ?? null,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
  const rows = await db.select().from(todos).orderBy(desc(todos.id)).limit(1)
  const row = rows[0]
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }`
      )

      content = content.replace(
        /const result = await db\.update\(todos\)\.set\(updateData\)\.where\(eq\(todos\.id, id\)\)\.returning\(\)\s*\n?\s*if \(result\.length === 0\) return null\s*\n?\s*const row = result\[0\]/,
        `await db.update(todos).set(updateData).where(eq(todos.id, id))
  const rows = await db.select().from(todos).where(eq(todos.id, id))
  if (rows.length === 0) return null
  const row = rows[0]`
      )

      content = content.replace(
        /const result = await db\.delete\(todos\)\.where\(eq\(todos\.id, id\)\)\.returning\(\)\s*\n?\s*return result\.length > 0/,
        `const rows = await db.select({ id: todos.id }).from(todos).where(eq(todos.id, id))
  if (rows.length === 0) return false
  await db.delete(todos).where(eq(todos.id, id))
  return true`
      )

      content = content.replace(
        /const result = await db\s*\n?\s*\.insert\(todoAttachments\)\s*\n?\s*\.values\(\{[^}]+\}\)\s*\n?\s*\.returning\(\)\s*\n?\s*const row = result\[0\]/,
        `await db.insert(todoAttachments).values({
      todoId,
      fileName: uploadedFile.filename,
      originalName: uploadedFile.originalName,
      mimeType: uploadedFile.mimeType,
      size: uploadedFile.size,
      path: uploadedFile.path,
      uploadedBy: uploadedBy ?? null,
      createdAt: now,
    })
  const rows = await db.select().from(todoAttachments).orderBy(desc(todoAttachments.id)).limit(1)
  const row = rows[0]`
      )

      content = content.replace(/\.returning\(\)/g, '')

      await fs.writeFile(todoServicePath, content)
    }
  }
}

async function updateDockerCompose(targetDir: string, config: ProjectConfig): Promise<void> {
  const filePath = path.join(targetDir, 'docker-compose.yml')
  if (!(await fs.pathExists(filePath))) return

  if (config.database === 'mysql') {
    await fs.writeFile(
      filePath,
      `version: '3.8'\n\nservices:\n  app:\n    build: .\n    ports:\n      - '3010:3010'\n    environment:\n      - NODE_ENV=production\n      - DB_DRIVER=mysql\n      - MYSQL_HOST=mysql\n      - MYSQL_PORT=3306\n      - MYSQL_USER=root\n      - MYSQL_PASSWORD=root_password\n      - MYSQL_DATABASE=biomimic_app\n    depends_on:\n      mysql:\n        condition: service_healthy\n\n  mysql:\n    image: mysql:8.0\n    environment:\n      MYSQL_ROOT_PASSWORD: root_password\n      MYSQL_DATABASE: biomimic_app\n    ports:\n      - '3306:3306'\n    volumes:\n      - mysql-data:/var/lib/mysql\n    healthcheck:\n      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]\n      interval: 10s\n      timeout: 5s\n      retries: 5\n\nvolumes:\n  mysql-data:\n`
    )
  }
}

async function updateConfigFiles(targetDir: string, config: ProjectConfig): Promise<void> {
  await updateViteConfig(targetDir, config)
  await updatePackageJson(targetDir, config)
  await handleCloudflareCleanup(targetDir, config)
  await updateTsupConfig(targetDir, config)
  await updateTsconfig(targetDir, config)

  if (!config.backend) {
    await fs.remove(path.join(targetDir, 'drizzle.config.ts'))
    await fs.remove(path.join(targetDir, 'drizzle'))
  } else {
    await updateDrizzleConfig(targetDir, config)
    await updateDbDriver(targetDir, config)
    await updateDbSchemaForMysql(targetDir, config)
    await updateDockerCompose(targetDir, config)
  }
}

async function cleanOpsCrossModuleRefs(targetDir: string, config: ProjectConfig): Promise<void> {
  if (!config.channels.includes('ops')) return

  const opsAppPath = path.join(targetDir, 'src/ops/App.tsx')
  if (await fs.pathExists(opsAppPath)) {
    let content = await fs.readFile(opsAppPath, 'utf-8')

    if (!config.modules.includes('captcha')) {
      content = content.replace(/,\s*CaptchaModal/g, '')
      content = content.replace(/CaptchaModal\s*,\s*/g, '')
    }

    const hasProtectedRouteImport = /import[^'"]*ProtectedRoute/.test(content)
    if (!hasProtectedRouteImport && content.includes('<ProtectedRoute>')) {
      const firstImportEnd = content.indexOf('\n', content.indexOf('import '))
      content =
        content.slice(0, firstImportEnd + 1) +
        "import { ProtectedRoute } from './components'\n" +
        content.slice(firstImportEnd + 1)
    }

    await fs.writeFile(opsAppPath, content)
  }

  const opsComponentsIndex = path.join(targetDir, 'src/ops/components/index.ts')
  if (await fs.pathExists(opsComponentsIndex)) {
    let content = await fs.readFile(opsComponentsIndex, 'utf-8')

    if (!config.modules.includes('captcha')) {
      content = content.replace(
        /export\s*\{[^}]*CaptchaModal[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
    }
    if (!config.modules.includes('notifications')) {
      content = content.replace(
        /export\s*\{[^}]*NotificationDrawer[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
    }

    await fs.writeFile(opsComponentsIndex, content)
  }

  const headerPath = path.join(targetDir, 'src/ops/layouts/Header.tsx')
  if (await fs.pathExists(headerPath)) {
    let content = await fs.readFile(headerPath, 'utf-8')

    if (!config.modules.includes('notifications')) {
      content = content.replace(
        /import\s*\{[^}]*NotificationDrawer[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(
        /import\s*\{[^}]*useOpsNotifications[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(
        /const\s*\{[^}]*\}\s*=\s*\n?\s*useOpsNotifications\([^)]*\)\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(/<NotificationDrawer[\s\S]*?\/>/g, '')
      content = content.replace(/<NotificationBell[^/]*\/>/g, '')
      content = content.replace(
        /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[status,\s*connect\]\s*\)/g,
        ''
      )
      content = content.replace(
        /const\s*\[\s*drawerOpen,\s*setDrawerOpen\s*\]\s*=\s*useState\([^)]*\)\s*\n?/g,
        ''
      )
      content = content.replace(
        /import\s*\{[^}]*useEffect[^}]*\}\s*from\s*['"]react['"]\s*;?\s*\n?/g,
        m => {
          const cleaned = m
            .replace(/,?\s*useEffect/g, '')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, ' }')
          return cleaned.match(/\{\s*\}/) ? '' : cleaned
        }
      )
      content = content.replace(
        /import\s*\{[^}]*useState[^}]*\}\s*from\s*['"]react['"]\s*;?\s*\n?/g,
        m => {
          const cleaned = m
            .replace(/,?\s*useState/g, '')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, ' }')
          return cleaned.match(/\{\s*\}/) ? '' : cleaned
        }
      )
    }

    await fs.writeFile(headerPath, content)
  }

  const dashboardPath = path.join(targetDir, 'src/ops/pages/DashboardPage.tsx')
  if (await fs.pathExists(dashboardPath)) {
    let content = await fs.readFile(dashboardPath, 'utf-8')

    if (!config.modules.includes('notifications')) {
      content = content.replace(
        /import\s+type\s+\{\s*NotificationType\s*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(/NotificationType/g, 'string')
      content = content.replace(
        /import\s*\{[^}]*BellRing[^}]*\}\s*from\s*['"]lucide-react['"]\s*;?\s*\n?/g,
        m => {
          const cleaned = m
            .replace(/,?\s*'(?:BellRing|Bell)'[^,]*/g, '')
            .replace(/,?\s*BellRing/g, '')
            .replace(/,?\s*Bell(?![a-z])/g, '')
          return cleaned.match(/\{\s*\}/) ? '' : cleaned
        }
      )
      content = content.replace(
        /import\s*\{[^}]*\}\s*from\s*['"]lucide-react['"]\s*;?\s*\n?/g,
        m => {
          const cleaned = m
            .replace(/,?\s*BellRing/g, '')
            .replace(/,?\s*Bell(?![a-z])/g, '')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, ' }')
          return cleaned.match(/\{\s*\}/) ? '' : cleaned
        }
      )
      content = content.replace(/import\s*\{[^}]*\}\s*from\s*['"]antd['"]\s*;?\s*\n?/g, m => {
        const cleaned = m
          .replace(/,?\s*Select/g, '')
          .replace(/,?\s*Button/g, '')
          .replace(/\{\s*,/, '{')
          .replace(/,\s*\}/, ' }')
        return cleaned.match(/\{\s*\}/) ? '' : cleaned
      })
      content = content.replace(/const\s+\[sendingNotification[^\n]*\n?/g, '')
      content = content.replace(/const\s+\[notificationType[^\n]*\n?/g, '')
      content = content.replace(
        /const\s+handleSendTestNotification\s*=\s*async[\s\S]*?\n\s*\}\s*\n(?=\s*if)/g,
        ''
      )
      content = content.replace(
        /<div className="bg-white rounded-lg shadow-sm p-6">\s*\n\s*<div[\s\S]*?发送测试通知[\s\S]*?<\/div>\s*\n\s*<\/div>/g,
        ''
      )
      content = content.replace(/const\s+message\s*=\s*useMessage\(\)\s*\n?/g, '')
      content = content.replace(
        /import\s*\{[^}]*useMessage[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
    }

    await fs.writeFile(dashboardPath, content)
  }

  const apiClientPath = path.join(targetDir, 'src/ops/services/apiClient.ts')
  if (await fs.pathExists(apiClientPath)) {
    let content = await fs.readFile(apiClientPath, 'utf-8')

    if (!config.modules.includes('captcha')) {
      content = content.replace(
        /import\s*\{[^}]*[Cc]aptcha[^}]*\}\s*from\s*['"][^'"]*[Cc]aptcha[^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(
        /import\s*\{[^}]*useCaptchaStore[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(
        /useCaptchaStore\.getState\(\)\.show/g,
        'async (_config: { type: unknown; captchaUrl?: string }) => true'
      )
    }

    await fs.writeFile(apiClientPath, content)
  }
}

async function cleanServerCrossModuleRefs(targetDir: string, config: ProjectConfig): Promise<void> {
  if (!config.backend) return

  const adminServicePath = path.join(targetDir, 'src/server/module-ops/services/admin-service.ts')
  if (await fs.pathExists(adminServicePath)) {
    let content = await fs.readFile(adminServicePath, 'utf-8')

    if (!config.modules.includes('todos')) {
      content = content.replace(
        /import\s*\{\s*todos\s*\}\s*from\s*['"][^'"]*schema[^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(
        /import\s*\{[^}]*desc[^}]*\}\s*from\s*['"]drizzle-orm['"]\s*;?\s*\n?/g,
        m => {
          const cleaned = m
            .replace(/,?\s*desc/g, '')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, ' }')
          return cleaned.match(/\{\s*\}/) ? '' : cleaned
        }
      )
      content = content.replace(
        /import\s*\{[^}]*getRawClient[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        m => {
          const cleaned = m
            .replace(/,?\s*getRawClient/g, '')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, ' }')
          return cleaned.match(/\{\s*\}/) ? '' : cleaned
        }
      )
      content = content.replace(
        /export async function getSystemStats\(\)[\s\S]*?^}/m,
        `export async function getSystemStats(): Promise<SystemStats> {\n  return { totalTodos: 0, pendingTodos: 0, completedTodos: 0, lastUpdated: new Date().toISOString() }\n}`
      )
      content = content.replace(
        /export async function checkDatabaseHealth\(\)[\s\S]*?^}/m,
        `export async function checkDatabaseHealth(): Promise<HealthCheck> {\n  return { database: 'connected', timestamp: new Date().toISOString() }\n}`
      )
      content = content.replace(
        /export async function clearAllTodos[\s\S]*?^}/m,
        `export async function clearAllTodos(): Promise<{ deletedCount: number }> {\n  return { deletedCount: 0 }\n}`
      )
      content = content.replace(
        /export async function getRecentActivity[\s\S]*?^}/m,
        `export async function getRecentActivity(_limit?: number): Promise<Array<{id:number;title:string;status:string;updatedAt:string}>> {\n  return []\n}`
      )
      content = content.replace(
        /export async function getAllTodos[\s\S]*?^}/m,
        `export async function getAllTodos(): Promise<Array<{id:number;title:string;completed:boolean;createdAt:string}>> {\n  return []\n}`
      )
      content = content.replace(
        /import\s*\{[^}]*getDb[^}]*\}\s*from\s*['"][^'"]*db[^'"]*['"]\s*;?\s*\n?/g,
        m => {
          const cleaned = m
            .replace(/,?\s*getDb/g, '')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, ' }')
          return cleaned.match(/\{\s*\}/) ? '' : cleaned
        }
      )
      content = content.replace(
        /import\s*\{[^}]*toISOString[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        m => {
          const cleaned = m
            .replace(/,?\s*toISOString/g, '')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, ' }')
          return cleaned.match(/\{\s*\}/) ? '' : cleaned
        }
      )
    }

    if (!config.modules.includes('notifications')) {
      content = content.replace(
        /import\s+type\s*\{[^}]*\}\s*from\s*['"][^'"]*notifications[^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(
        /import\s*\{[^}]*\}\s*from\s*['"][^'"]*notifications[^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(/AppNotification/g, 'Record<string, unknown>')
      content = content.replace(/CreateNotificationInput/g, 'Record<string, unknown>')
      content = content.replace(/NotificationType/g, 'string')
    }

    await fs.writeFile(adminServicePath, content)
  }

  const opsNotificationRoutes = path.join(
    targetDir,
    'src/server/module-ops/routes/ops-notification-routes.ts'
  )
  if (await fs.pathExists(opsNotificationRoutes)) {
    if (!config.modules.includes('notifications')) {
      await fs.remove(opsNotificationRoutes)

      const opsRoutesPath = path.join(targetDir, 'src/server/module-ops/routes/ops-routes.ts')
      if (await fs.pathExists(opsRoutesPath)) {
        let content = await fs.readFile(opsRoutesPath, 'utf-8')
        content = content.replace(
          /import\s*\{[^}]*opsNotificationRoutes[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
          ''
        )
        content = content.replace(/\.route\(\s*'\/'\s*,\s*opsNotificationRoutes\s*\)/g, '')
        await fs.writeFile(opsRoutesPath, content)
      }
    }
  }

  if (!config.channels.includes('ops')) {
    const serverIndexPath = path.join(targetDir, 'src/server/index.ts')
    if (await fs.pathExists(serverIndexPath)) {
      let content = await fs.readFile(serverIndexPath, 'utf-8')
      content = content.replace(/,?\s*OpsApiType/g, '')
      await fs.writeFile(serverIndexPath, content)
    }
  }
}

async function handleMiddleware(targetDir: string, config: ProjectConfig): Promise<void> {
  if (!config.modules.includes('permission')) {
    const permissionDir = path.join(targetDir, 'src/platform/shared/permission')
    const auditDir = path.join(targetDir, 'src/platform/shared/audit')
    await fs.remove(permissionDir)
    await fs.remove(auditDir)

    const platformPermServerDir = path.join(targetDir, 'src/platform/server/module-permission')
    await fs.remove(platformPermServerDir)

    const platformAuthServerDir = path.join(targetDir, 'src/platform/server/module-auth')
    await fs.remove(platformAuthServerDir)

    await fs.remove(path.join(targetDir, 'src/platform/shared/auth/schemas.ts'))
    await fs.remove(path.join(targetDir, 'src/platform/shared/auth/types.ts'))

    const authIndexPath = path.join(targetDir, 'src/platform/shared/auth/index.ts')
    if (await fs.pathExists(authIndexPath)) {
      let content = await fs.readFile(authIndexPath, 'utf-8')
      content = content.replace(/export\s*\*\s*from\s*['"]\.\/schemas['"]\s*;?\s*\n?/g, '')
      content = content.replace(/export\s*\*\s*from\s*['"]\.\/types['"]\s*;?\s*\n?/g, '')
      await fs.writeFile(authIndexPath, content)
    }
  }

  if (!config.modules.includes('permission')) {
    const permissionPath = path.join(targetDir, 'src/server/middleware/permission.ts')
    if (await fs.pathExists(permissionPath)) {
      await fs.writeFile(
        permissionPath,
        `import type { Context, Next } from 'hono'\n\nexport async function permissionMiddleware(_c: Context, next: Next) {\n  await next()\n}\n`
      )
    }

    const auditLogPath = path.join(targetDir, 'src/server/middleware/audit-log.ts')
    if (await fs.pathExists(auditLogPath)) {
      await fs.writeFile(
        auditLogPath,
        `import type { Context, Next } from 'hono'\n\nexport async function auditLogMiddleware(_c: Context, next: Next) {\n  await next()\n}\n`
      )
    }

    const authMiddlewarePath = path.join(targetDir, 'src/server/middleware/auth.ts')
    if (await fs.pathExists(authMiddlewarePath)) {
      const authPassthrough = `import type { Context, Next } from 'hono'\n\nexport type AuthUser = { id: string; role: string; [key: string]: unknown }\nexport type AuthMiddlewareOptions = Record<string, unknown>\n\ndeclare module 'hono' {\n  interface ContextVariableMap {\n    authUser: AuthUser\n  }\n}\n\nexport const authMiddleware = () => async (c: Context, next: Next) => {\n  c.set('authUser', { id: 'anonymous', role: 'user' })\n  await next()\n}\nexport const requireSuperAdminMiddleware = () => async (_c: Context, next: Next) => { await next() }\nexport const requireCustomerServiceMiddleware = () => async (_c: Context, next: Next) => { await next() }\nexport const requirePermissionsMiddleware = (..._perms: string[]) => async (_c: Context, next: Next) => { await next() }\n`
      await fs.writeFile(authMiddlewarePath, authPassthrough)
    }

    const permUtilsPath = path.join(targetDir, 'src/server/utils/permission-utils.ts')
    if (await fs.pathExists(permUtilsPath)) {
      await fs.writeFile(permUtilsPath, `export {}\n`)
    }

    const authUtilsPath = path.join(targetDir, 'src/server/utils/auth.ts')
    if (await fs.pathExists(authUtilsPath)) {
      const authUtilsPassthrough = `import type { Context } from 'hono'\n\nexport const getAuthUser = (_c: Context) => ({ id: 'anonymous', role: 'user' as const })\nexport const getMockUsers = () => []\n`
      await fs.writeFile(authUtilsPath, authUtilsPassthrough)
    }

    const middlewareIndexPath = path.join(targetDir, 'src/server/middleware/index.ts')
    if (await fs.pathExists(middlewareIndexPath)) {
      let content = await fs.readFile(middlewareIndexPath, 'utf-8')
      content = content.replace(
        /export\s*\{\s*permissionMiddleware\s*\}\s*from\s*['"]\.\/permission['"]\s*;?\s*\n?/g,
        ''
      )
      await fs.writeFile(middlewareIndexPath, content)
    }

    const constPath = path.join(targetDir, 'src/shared/constants/index.ts')
    if (await fs.pathExists(constPath)) {
      let content = await fs.readFile(constPath, 'utf-8')
      content = content.replace(
        /export\s*\*\s*from\s*['"]@platform\/shared\/audit['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(
        /import\s*\{[^}]*\}\s*from\s*['"]@platform\/shared\/audit['"]\s*;?\s*\n?/g,
        ''
      )
      await fs.writeFile(constPath, content)
    }
  }

  const appPath = path.join(targetDir, 'src/server/app.ts')
  if (await fs.pathExists(appPath)) {
    let content = await fs.readFile(appPath, 'utf-8')

    if (!config.modules.includes('captcha')) {
      content = content.replace(
        /\s*\.use\(\s*\n?\s*'\/api\/admin\/\*'\s*,\s*\n?\s*captchaMiddleware\(\{[^}]*\}\)\s*\n?\s*\)/g,
        ''
      )
      content = content.replace(/import.*captchaMiddleware.*\n?/g, '')
    }

    if (!config.modules.includes('permission')) {
      content = content.replace(/.*auditLogMiddleware.*\n?/g, '')
      content = content.replace(/import.*auditLogMiddleware.*\n?/g, '')
    }

    if (!config.modules.includes('file')) {
      content = content.replace(/.*fileRoutes.*\n?/g, '')
    }

    if (!config.modules.includes('agent')) {
      content = content.replace(
        /.*authMiddleware\(\)\)\s*\n?\s*\.use\(\s*['"]\/api\/agents\/\*['"].*\n?/g,
        ''
      )
      content = content.replace(
        /\s*\.use\(\s*['"]\/api\/agents\/\*['"],\s*authMiddleware\(\)\s*\)\s*\n?/g,
        ''
      )
      content = content.replace(
        /\s*\.use\(\s*['"]\/api\/workspace\/\*['"],\s*authMiddleware\(\)\s*\)\s*\n?/g,
        ''
      )
      const authMiddlewareUsage = content.match(/authMiddleware/g)
      if (authMiddlewareUsage && authMiddlewareUsage.length <= 1) {
        content = content.replace(
          /import\s*\{[^}]*authMiddleware[^}]*\}\s*from\s*['"][^'"]*middleware['"]/g,
          match => {
            const cleaned = match
              .replace(/,?\s*authMiddleware/g, '')
              .replace(/\{\s*,/, '{')
              .replace(/,\s*\}/, ' }')
            return cleaned.match(/\{\s*\}/) ? '' : cleaned
          }
        )
      }
    }

    if (!config.channels.includes('ops')) {
      content = content.replace(
        /import\s*\{[^}]*opsApiRoutes[^}]*\}\s*from\s*['"][^'"]*route-registry['"]/g,
        match => {
          const cleaned = match
            .replace(/,?\s*opsApiRoutes/g, '')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, ' }')
          return cleaned.includes('{}') ? '' : cleaned
        }
      )
      content = content.replace(/.*\.route\([^)]*opsApiRoutes[^)]*\)\s*\n?/g, '')
      content = content.replace(/.*OpsApiType.*\n?/g, '')
    }

    await fs.writeFile(appPath, content)
  }
}

async function cleanPlatformSharedRefs(targetDir: string, config: ProjectConfig): Promise<void> {
  const indexPath = path.join(targetDir, 'src/platform/shared/index.ts')
  if (!(await fs.pathExists(indexPath))) return

  let content = await fs.readFile(indexPath, 'utf-8')

  if (!config.modules.includes('permission')) {
    content = content.replace(/export\s*\*\s*from\s*['"]\.\/permission['"]\s*;?\s*\n?/g, '')
    content = content.replace(/export\s*\*\s*from\s*['"]\.\/audit['"]\s*;?\s*\n?/g, '')

    const permissionDir = path.join(targetDir, 'src/platform/shared/permission')
    const auditDir = path.join(targetDir, 'src/platform/shared/audit')
    await fs.remove(permissionDir)
    await fs.remove(auditDir)

    const platformPermServerDir = path.join(targetDir, 'src/platform/server/module-permission')
    await fs.remove(platformPermServerDir)
  }

  if (!config.modules.includes('ops')) {
    const settingsDir = path.join(targetDir, 'src/platform/shared/settings')
    await fs.remove(settingsDir)
    const moduleSettingsDir = path.join(targetDir, 'src/platform/server/module-settings')
    await fs.remove(moduleSettingsDir)
  }

  await fs.writeFile(indexPath, content)

  const authSchemasPath = path.join(targetDir, 'src/platform/shared/auth/schemas.ts')
  if ((await fs.pathExists(authSchemasPath)) && !config.modules.includes('permission')) {
    let authContent = await fs.readFile(authSchemasPath, 'utf-8')
    authContent = authContent.replace(
      /import\s*type\s*\{[^}]*\}\s*from\s*['"]@platform\/shared\/permission['"]\s*;?\s*\n?/g,
      ''
    )
    await fs.writeFile(authSchemasPath, authContent)
  }

  const authTypesPath = path.join(targetDir, 'src/platform/shared/auth/types.ts')
  if ((await fs.pathExists(authTypesPath)) && !config.modules.includes('permission')) {
    let authContent = await fs.readFile(authTypesPath, 'utf-8')
    authContent = authContent.replace(
      /import\s*type\s*\{[^}]*\}\s*from\s*['"]@platform\/shared\/permission['"]\s*;?\s*\n?/g,
      ''
    )
    await fs.writeFile(authTypesPath, authContent)
  }
}

async function cleanServerDbCrossRefs(targetDir: string, config: ProjectConfig): Promise<void> {
  const initPath = path.join(targetDir, 'src/server/db/init.ts')
  if (await fs.pathExists(initPath)) {
    let content = await fs.readFile(initPath, 'utf-8')

    if (!config.modules.includes('permission')) {
      content = `import { getDb } from './driver'\nimport { logger } from '../utils/logger'\n\nconst log = logger.db()\n\nexport async function initializeDatabase() {\n  await getDb()\n  log.info({}, 'Initializing database...')\n  log.info({}, 'Database initialization complete!')\n}\n`
    } else {
      const removedSchemas = new Set<string>()
      if (!config.modules.includes('notifications')) removedSchemas.add('notifications')
      if (!config.modules.includes('todos')) {
        removedSchemas.add('todos')
        removedSchemas.add('todoAttachments')
      }
      if (!config.modules.includes('agent')) {
        removedSchemas.add('agents')
        removedSchemas.add('workspaces')
      }
      if (!config.modules.includes('tenant')) {
        removedSchemas.add('tenants')
        removedSchemas.add('tenantRoles')
        removedSchemas.add('tenantMembers')
        removedSchemas.add('tenantInvitations')
      }

      for (const schema of removedSchemas) {
        const camelName = schema.charAt(0).toLowerCase() + schema.slice(1)
        content = content.replace(new RegExp(`,?\\s*\\b${camelName}\\b`, 'g'), '')
        content = content.replace(new RegExp(`import[^\\n]*\\b${schema}\\b[^\\n]*\\n?`, 'g'), '')
      }
      content = content.replace(/\{\s*\}/g, '{}')
      content = content.replace(/,\s*\}/g, ' }')
      content = content.replace(/\{\s*,/g, '{')
    }

    await fs.writeFile(initPath, content)
  }

  const seedsPath = path.join(targetDir, 'src/server/db/seeds/index.ts')
  if (await fs.pathExists(seedsPath)) {
    if (!config.modules.includes('permission') && !config.modules.includes('tenant')) {
      await fs.writeFile(seedsPath, '')
    } else {
      let content = await fs.readFile(seedsPath, 'utf-8')

      if (!config.modules.includes('permission')) {
        content = content.replace(
          /export\s*\*\s*from\s*['"]\.\/permission-data['"]\s*;?\s*\n?/g,
          ''
        )
        await fs.remove(path.join(targetDir, 'src/server/db/seeds/permission-data.ts'))
      }

      if (!config.modules.includes('tenant')) {
        content = content.replace(/export\s*\*\s*from\s*['"]\.\/tenant-data['"]\s*;?\s*\n?/g, '')
        await fs.remove(path.join(targetDir, 'src/server/db/seeds/tenant-data.ts'))
      }

      await fs.writeFile(seedsPath, content)
    }
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
async function cleanServerUtilsCrossRefs(
  _targetDir: string,
  _config: ProjectConfig
): Promise<void> {}
/* eslint-enable @typescript-eslint/no-unused-vars */

async function cleanClientCrossRefs(targetDir: string, config: ProjectConfig): Promise<void> {
  if (!config.channels.includes('web')) return

  const authStorePath = path.join(targetDir, 'src/client/stores/authStore.ts')
  if (await fs.pathExists(authStorePath)) {
    let content = await fs.readFile(authStorePath, 'utf-8')

    if (!config.modules.includes('ops')) {
      content = content.replace(
        /import\s*(?:type\s+)?\{[^}]*\}\s*from\s*['"]@shared\/modules\/ops\/schemas['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(/AuthUserResponse/g, 'Record<string, unknown>')
    }
    if (!config.modules.includes('permission')) {
      content = content.replace(
        /import\s*(?:type\s+)?\{[^}]*\}\s*from\s*['"]@platform\/shared\/permission[^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
    }

    await fs.writeFile(authStorePath, content)
  }

  if (!config.modules.includes('chat')) {
    await fs.remove(path.join(targetDir, 'src/client/pages/WebSocketPage.tsx'))

    const appPath = path.join(targetDir, 'src/client/App.tsx')
    if (await fs.pathExists(appPath)) {
      let content = await fs.readFile(appPath, 'utf-8')
      content = content.replace(
        /import\s*\{[^}]*WebSocketPage[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(
        /<Route\s+path="\/websocket"\s+element=\{<WebSocketPage\s*\/>\}\s*\/>\s*\n?/g,
        ''
      )
      await fs.writeFile(appPath, content)
    }
  }

  const compIndexPath = path.join(targetDir, 'src/client/components/index.ts')
  if (await fs.pathExists(compIndexPath)) {
    let content = await fs.readFile(compIndexPath, 'utf-8')
    if (!config.modules.includes('chat')) {
      content = content.replace(
        /export\s*\{[^}]*MessageCard[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?\s*\n?/g,
        ''
      )
    }
    await fs.writeFile(compIndexPath, content)
  }

  if (!config.modules.includes('file') && config.modules.includes('agent')) {
    const chatAreaPath = path.join(targetDir, 'src/client/components/ChatArea.tsx')
    if (await fs.pathExists(chatAreaPath)) {
      let content = await fs.readFile(chatAreaPath, 'utf-8')
      content = content.replace(
        /import\s*\{\s*FilePreview\s*\}\s*from\s*['"]\.\/FilePreview['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(/const\s+selectedFile\s*=\s*useWorkspaceStore\([^)]*\)\s*\n?/g, '')
      content = content.replace(
        /const\s+setSelectedFile\s*=\s*useWorkspaceStore\([^)]*\)\s*\n?/g,
        ''
      )
      content = content.replace(
        /import\s*\{\s*useWorkspaceStore\s*\}\s*from\s*['"][^'"]*workspaceStore['"]\s*;?\s*\n?/g,
        ''
      )
      const lines = content.split('\n')
      const filtered = lines.filter(line => !/^\s*className=\{selectedFile/.test(line))
      content = filtered.join('\n')
      const fpBlockRe =
        /<div\s+className=\{`flex-1 overflow-y-auto\s*\$\{selectedFile[^}]*\}`\}\s*>[\s\S]*?<\/div>\s*\n/
      content = content.replace(fpBlockRe, '')
      content = content.replace(
        /const\s+handleClosePreview\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\}\s*\n?/g,
        ''
      )
      await fs.writeFile(chatAreaPath, content)
    }

    const workspacePanelPath = path.join(targetDir, 'src/client/components/WorkspacePanel.tsx')
    if (await fs.pathExists(workspacePanelPath)) {
      let content = await fs.readFile(workspacePanelPath, 'utf-8')
      content = content.replace(
        /import\s*\{\s*FileTree\s*\}\s*from\s*['"]\.\/FileTree['"]\s*;?\s*\n?/g,
        ''
      )
      content = content.replace(/<FileTree[^/]*\/>/g, '{/* file tree removed */}')
      const lines = content.split('\n')
      const filtered = lines.filter(line => {
        const trimmed = line.trim()
        if (/^const\s+loadingFiles\s*=/.test(trimmed)) return false
        if (/^const\s+setSelectedFile\s*=/.test(trimmed)) return false
        return true
      })
      content = filtered.join('\n')
      let depth = 0
      let inFunc = false
      let funcStart = -1
      const lines2 = content.split('\n')
      const toRemove: Set<number> = new Set()
      for (let i = 0; i < lines2.length; i++) {
        const trimmed = lines2[i].trim()
        if (
          /^const\s+handleRefresh\s*=\s*\(/.test(trimmed) ||
          /^const\s+handleSelectFile\s*=\s*\(/.test(trimmed)
        ) {
          inFunc = true
          funcStart = i
          depth = 0
        }
        if (inFunc) {
          for (const ch of lines2[i]) {
            if (ch === '{') depth++
            if (ch === '}') depth--
          }
          toRemove.add(i)
          if (depth === 0 && i > funcStart) {
            inFunc = false
          }
        }
      }
      const finalLines = lines2.filter((_, i) => !toRemove.has(i))
      content = finalLines.join('\n')
      await fs.writeFile(workspacePanelPath, content)
    }
  }

  if (!config.backend) {
    const apiClientPath = path.join(targetDir, 'src/client/services/apiClient.ts')
    if (await fs.pathExists(apiClientPath)) {
      await fs.remove(apiClientPath)
    }

    const apiClientIndexPath = path.join(targetDir, 'src/client/services/index.ts')
    if (await fs.pathExists(apiClientIndexPath)) {
      let content = await fs.readFile(apiClientIndexPath, 'utf-8')
      content = content.replace(/export\s*\*\s*from\s*['"]\.\/apiClient['"]\s*;?\s*\n?/g, '')
      await fs.writeFile(apiClientIndexPath, content)
    }
  }
}

async function cleanServerTestFiles(targetDir: string, config: ProjectConfig): Promise<void> {
  const testFilesToRemove: string[] = []

  if (!config.modules.includes('ops') || !config.channels.includes('ops')) {
    testFilesToRemove.push('src/server/middleware/__tests__/error-response-format.test.ts')
  }

  if (!config.modules.includes('ops') || !config.channels.includes('ops')) {
    testFilesToRemove.push(
      'src/server/module-ops/__tests__/admin-routes.test.ts',
      'src/server/module-ops/__tests__/admin-service.test.ts',
      'src/server/module-ops/__tests__/ticket-service.test.ts',
      'src/server/module-ops/__tests__/order-service.test.ts',
      'src/server/module-ops/__tests__/dispute-service.test.ts',
      'src/server/module-ops/__tests__/content-service.test.ts'
    )
  }

  if (!config.modules.includes('permission') || !config.channels.includes('ops')) {
    testFilesToRemove.push(
      'src/server/module-permission/__tests__/permission-routes.test.ts',
      'src/server/module-permission/__tests__/permission-service.test.ts',
      'src/server/module-permission/__tests__/permission-service-impl.test.ts',
      'src/server/module-permission/__tests__/role-routes.test.ts',
      'src/server/module-permission/__tests__/permission-middleware.test.ts',
      'src/server/middleware/__tests__/auth.test.ts',
      'src/server/middleware/__tests__/auth-simple.test.ts'
    )
  }

  if (!config.modules.includes('todos')) {
    testFilesToRemove.push('src/server/__tests__/integration/todos-api.test.ts')
  }

  if (!config.modules.includes('notifications')) {
    testFilesToRemove.push('src/server/module-ops/__tests__/admin-routes.test.ts')
  }

  if (!config.modules.includes('todos') || !config.modules.includes('notifications')) {
    testFilesToRemove.push('src/server/module-ops/__tests__/admin-service.test.ts')
  }

  if (!config.modules.includes('tenant')) {
    testFilesToRemove.push(
      'src/server/module-tenant/__tests__/tenant-routes.test.ts',
      'src/server/module-tenant/__tests__/tenant-service.test.ts'
    )
  }

  if (!config.modules.includes('permission') || !config.modules.includes('ops')) {
    testFilesToRemove.push(
      'src/client/components/__tests__/AuthButton.test.tsx',
      'src/client/stores/__tests__/authStore.test.ts'
    )
  }

  for (const f of testFilesToRemove) {
    const fp = path.join(targetDir, f)
    if (await fs.pathExists(fp)) {
      await fs.remove(fp)
    }
  }
}

async function handleTenantWithoutPermission(
  targetDir: string,
  config: ProjectConfig
): Promise<void> {
  if (!config.modules.includes('tenant') || config.modules.includes('permission')) return

  const permissionDir = path.join(targetDir, 'src/platform/shared/permission')
  await fs.ensureDir(permissionDir)

  await fs.writeFile(
    path.join(permissionDir, 'tenant-permissions.ts'),
    `export enum TenantPermission {
  MEMBER_VIEW = 'tenant:member:view',
  MEMBER_INVITE = 'tenant:member:invite',
  MEMBER_REMOVE = 'tenant:member:remove',
  MEMBER_ROLE_ASSIGN = 'tenant:member:role:assign',
  ROLE_VIEW = 'tenant:role:view',
  ROLE_CREATE = 'tenant:role:create',
  ROLE_EDIT = 'tenant:role:edit',
  ROLE_DELETE = 'tenant:role:delete',
  SETTINGS_VIEW = 'tenant:settings:view',
  SETTINGS_EDIT = 'tenant:settings:edit',
  DATA_VIEW = 'tenant:data:view',
  DATA_CREATE = 'tenant:data:create',
  DATA_EDIT = 'tenant:data:edit',
  DATA_DELETE = 'tenant:data:delete',
  DATA_EXPORT = 'tenant:data:export',
  DATA_IMPORT = 'tenant:data:import',
  BILLING_VIEW = 'tenant:billing:view',
  BILLING_MANAGE = 'tenant:billing:manage',
  AUDIT_VIEW = 'tenant:audit:view',
}

export const TENANT_PERMISSION_LABELS: Record<TenantPermission, string> = {} as Record<TenantPermission, string>

export const TENANT_PERMISSION_CATEGORIES = {} as Record<string, { label: string; permissions: TenantPermission[] }>
`
  )

  await fs.writeFile(
    path.join(permissionDir, 'tenant-role-templates.ts'),
    `import { TenantPermission } from './tenant-permissions'

export enum TenantRoleCode {
  ADMIN = 'tenant_admin',
  MEMBER = 'tenant_member',
  GUEST = 'tenant_guest',
}

export interface TenantRoleTemplate {
  code: TenantRoleCode
  name: string
  label: string
  description: string
  isSystem: boolean
  permissions: TenantPermission[]
}

export const TENANT_ROLE_TEMPLATES: TenantRoleTemplate[] = [
  {
    code: TenantRoleCode.ADMIN,
    name: 'tenant_admin',
    label: '租户管理员',
    description: '拥有租户内所有权限',
    isSystem: true,
    permissions: Object.values(TenantPermission),
  },
  {
    code: TenantRoleCode.MEMBER,
    name: 'tenant_member',
    label: '普通成员',
    description: '可访问租户数据',
    isSystem: true,
    permissions: [],
  },
  {
    code: TenantRoleCode.GUEST,
    name: 'tenant_guest',
    label: '访客',
    description: '只读权限',
    isSystem: true,
    permissions: [],
  },
]

export const PLAN_ROLE_LIMITS: Record<string, number> = {
  free: 3,
  starter: 5,
  pro: 10,
  enterprise: -1,
}
`
  )
}

async function removeEmptyDirs(dir: string): Promise<void> {
  if (!(await fs.pathExists(dir))) return

  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const fullPath = path.join(dir, entry.name)
    await removeEmptyDirs(fullPath)
  }

  const remaining = await fs.readdir(dir)
  if (remaining.length === 0) {
    await fs.remove(dir)
  }
}

export async function generateProject(
  config: ProjectConfig,
  useCurrentDir: boolean = false
): Promise<void> {
  const targetDir = useCurrentDir ? process.cwd() : path.resolve(process.cwd(), config.name)
  let createdTargetDir = false

  try {
    const spinner = ora()

    spinner.start('复制模板文件...')
    if (!useCurrentDir) {
      await fs.ensureDir(targetDir)
      createdTargetDir = true
    }
    await copyTemplate(targetDir)
    spinner.succeed(chalk.green('模板文件已复制'))

    spinner.start('删除未选模块文件...')
    await deleteModuleFiles(targetDir, config.modules)
    await deleteTestFilesForRemovedSources(targetDir, config.modules)
    spinner.succeed(chalk.green('未选模块文件已删除'))

    spinner.start('删除未选前端通道...')
    await deleteFrontendChannels(targetDir, config)
    spinner.succeed(chalk.green('未选前端通道已删除'))

    spinner.start('清理引用文件...')
    await cleanReferenceFiles(targetDir, config)
    spinner.succeed(chalk.green('引用文件已清理'))

    spinner.start('修改配置文件...')
    await updateConfigFiles(targetDir, config)
    spinner.succeed(chalk.green('配置文件已更新'))

    spinner.start('处理中间件...')
    await handleMiddleware(targetDir, config)
    spinner.succeed(chalk.green('中间件已处理'))

    spinner.start('清理跨模块引用...')
    await cleanOpsCrossModuleRefs(targetDir, config)
    await cleanServerCrossModuleRefs(targetDir, config)
    await cleanPlatformSharedRefs(targetDir, config)
    await cleanServerDbCrossRefs(targetDir, config)
    await cleanServerUtilsCrossRefs(targetDir, config)
    await cleanClientCrossRefs(targetDir, config)
    await cleanServerTestFiles(targetDir, config)
    spinner.succeed(chalk.green('跨模块引用已清理'))

    spinner.start('处理租户-权限依赖...')
    await handleTenantWithoutPermission(targetDir, config)
    spinner.succeed(chalk.green('租户-权限依赖已处理'))

    spinner.start('清理空目录...')
    await removeEmptyDirs(targetDir)
    spinner.succeed(chalk.green('空目录已清理'))

    console.log('')
    console.log(chalk.green('  ✓ 项目创建成功!'))
    console.log('')
    console.log(chalk.cyan('  下一步:'))
    console.log(chalk.white(`    cd ${config.name}`))
    console.log(chalk.white('    npm install'))
    console.log(chalk.white('    npm run dev'))
    console.log('')
  } catch (error) {
    console.error(
      chalk.red('  ✖ 创建项目失败:'),
      error instanceof Error ? error.message : String(error)
    )
    if (createdTargetDir) {
      try {
        await fs.remove(targetDir)
        console.log(chalk.yellow('  ↩ 已清理不完整的项目目录'))
      } catch {
        console.error(chalk.red('  ✖ 清理失败，请手动删除:'), targetDir)
      }
    }
    process.exit(1)
  }
}
