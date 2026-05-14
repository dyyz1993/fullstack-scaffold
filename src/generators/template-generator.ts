import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface ModuleManifest {
  name: string
  description: string
  category: 'core' | 'communication' | 'business' | 'system'
  dependsOn: string[]
  routes: {
    client?:
      | { importPath: string; exportName: string }
      | { importPath: string; exportName: string }[]
    admin?: { importPath: string; exportName: string }[]
    standalone?: { importPath: string; exportName: string; mountPath: string }
  }
  sharedSchemas?: { path: string; additionalPaths?: string[] }
  clientPages?: { name: string; route: string }[]
  adminPages?: {
    name: string
    route: string
    isPublic?: boolean
    requiredPermission?: string
  }[]
  dbSchemas?: { files: string[]; hasSeed: boolean }
  dependencies?: Record<string, string>
  clientStores?: string[]
  providesMiddleware?: {
    name: string
    importPath: string
    appliesTo: string
  }[]
  hasSSE?: boolean
  hasWebSocket?: boolean
}

export interface TemplatePreset {
  id: string
  name: string
  description: string
  modules: string[]
}

export interface ResolvedPreset {
  preset: TemplatePreset
  modules: Map<string, ModuleManifest>
  hasAdmin: boolean
  hasClient: boolean
  hasSSE: boolean
  hasWebSocket: boolean
  hasPermission: boolean
  hasCaptcha: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TsImportFn = (id: string, opts: { parentURL: string }) => Promise<any>

let tsImportFn: TsImportFn | undefined

async function getTsImport(): Promise<TsImportFn> {
  if (tsImportFn) return tsImportFn
  const { tsImport } = await import('tsx/esm/api')
  tsImportFn = tsImport
  return tsImportFn
}

export async function loadManifests(templateDir: string): Promise<Map<string, ModuleManifest>> {
  const tsImport = await getTsImport()
  const serverDir = join(templateDir, 'src', 'server')
  const modules = new Map<string, ModuleManifest>()

  const entries = readdirSync(serverDir)
  const moduleDirs = entries.filter(
    e => e.startsWith('module-') && statSync(join(serverDir, e)).isDirectory()
  )

  const parentURL = pathToFileURL(join(serverDir, 'dummy.ts')).href

  for (const dir of moduleDirs) {
    const manifestPath = join(serverDir, dir, 'module.ts')
    if (!existsSync(manifestPath)) continue

    try {
      const mod = await tsImport(manifestPath, { parentURL })
      const manifest: ModuleManifest = mod.default
      if (!manifest || !manifest.name) {
        console.error(`❌ Invalid manifest in ${dir}: missing name`)
        continue
      }
      modules.set(manifest.name, manifest)
    } catch (err) {
      console.error(`❌ Failed to load manifest from ${dir}:`, err)
    }
  }

  return modules
}

export async function loadPresets(templateDir: string): Promise<TemplatePreset[]> {
  const configPath = join(templateDir, 'modules.config.ts')
  if (!existsSync(configPath)) {
    return [getDefaultPreset()]
  }

  try {
    const tsImport = await getTsImport()
    const parentURL = pathToFileURL(configPath).href
    const mod = await tsImport(configPath, { parentURL })
    if (mod.TEMPLATE_PRESETS) {
      return mod.TEMPLATE_PRESETS
    }
  } catch (err) {
    console.error('❌ Failed to load presets:', err)
  }

  return [getDefaultPreset()]
}

function getDefaultPreset(): TemplatePreset {
  return {
    id: 'fullstack-admin',
    name: 'Full Admin',
    description: 'All modules included',
    modules: [
      'todos',
      'chat',
      'notifications',
      'file',
      'captcha',
      'permission',
      'admin',
      'order',
      'ticket',
      'dispute',
      'content',
    ],
  }
}

export function resolvePreset(
  preset: TemplatePreset,
  allManifests: Map<string, ModuleManifest>
): ResolvedPreset {
  const modules = new Map<string, ModuleManifest>()

  const toProcess = [...preset.modules]
  const processed = new Set<string>()

  while (toProcess.length > 0) {
    const name = toProcess.shift()!
    if (processed.has(name)) continue
    processed.add(name)

    const manifest = allManifests.get(name)
    if (manifest) {
      modules.set(name, manifest)
      for (const dep of manifest.dependsOn) {
        if (!processed.has(dep)) {
          toProcess.push(dep)
        }
      }
    }
  }

  let hasSSE = false
  let hasWebSocket = false
  let hasAdmin = false

  for (const manifest of modules.values()) {
    if (manifest.hasSSE) hasSSE = true
    if (manifest.hasWebSocket) hasWebSocket = true
    if (manifest.adminPages && manifest.adminPages.length > 0) hasAdmin = true
    if (manifest.routes.admin && manifest.routes.admin.length > 0) hasAdmin = true
  }

  return {
    preset,
    modules,
    hasAdmin,
    hasClient: true,
    hasSSE,
    hasWebSocket,
    hasPermission: modules.has('permission'),
    hasCaptcha: modules.has('captcha'),
  }
}

export function getModuleDirectories(resolved: ResolvedPreset): string[] {
  const dirs: string[] = []
  for (const [name] of resolved.modules) {
    dirs.push(`module-${name}`)
  }
  return dirs
}

export function getSharedModuleDirs(resolved: ResolvedPreset): string[] {
  const dirs: string[] = []
  for (const [, manifest] of resolved.modules) {
    if (manifest.sharedSchemas) {
      dirs.push(manifest.sharedSchemas.path)
    }
  }
  return dirs
}

export function getDbSchemaFiles(resolved: ResolvedPreset): string[] {
  const files: string[] = []
  for (const [, manifest] of resolved.modules) {
    if (manifest.dbSchemas) {
      files.push(...manifest.dbSchemas.files)
    }
  }
  return files
}

export function getClientPages(resolved: ResolvedPreset): { name: string; route: string }[] {
  const pages: { name: string; route: string }[] = []
  for (const [, manifest] of resolved.modules) {
    if (manifest.clientPages) {
      pages.push(...manifest.clientPages)
    }
  }
  return pages
}

export function getAdminPages(resolved: ResolvedPreset): ModuleManifest['adminPages'] {
  const pages: ModuleManifest['adminPages'] = []
  for (const [, manifest] of resolved.modules) {
    if (manifest.adminPages) {
      pages.push(...manifest.adminPages)
    }
  }
  return pages
}

export function getClientStores(resolved: ResolvedPreset): string[] {
  const stores: string[] = []
  for (const [, manifest] of resolved.modules) {
    if (manifest.clientStores) {
      stores.push(...manifest.clientStores)
    }
  }
  return stores
}

export function getDefaultRoute(resolved: ResolvedPreset): string {
  const pages = getClientPages(resolved)
  if (pages.length > 0) {
    return pages[0].route
  }
  return '/'
}
