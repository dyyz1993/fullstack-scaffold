/**
 * Filters package.json dependencies based on the resolved preset.
 * Removes module-specific packages that aren't needed.
 */
import type { ResolvedPreset } from './template-generator'

/** Packages only needed by specific modules */
const MODULE_PACKAGES: Record<string, string[]> = {
  admin: ['bcryptjs'],
  auth: ['bcryptjs'],
}

/** Packages needed by the admin panel UI */
const ADMIN_PANEL_PACKAGES = ['antd']

/** Packages needed by the CLI app (xcli-core based) */
const CLI_PACKAGES = ['commander'] // legacy, removed from template

/** Packages that are never imported (unused) */
const UNUSED_PACKAGES = ['lodash-es', 'chalk', 'mysql2']

/** Packages only needed by the web client (React frontend) */
const CLIENT_PACKAGES = [
  'react',
  'react-dom',
  'react-helmet-async',
  'react-router-dom',
  'lucide-react',
  'zustand',
]

/** Dev packages only needed when a web client is present */
const CLIENT_DEV_PACKAGES = [
  '@vitejs/plugin-react',
  '@testing-library/react',
  '@testing-library/jest-dom',
  '@testing-library/dom',
  'vite',
  'jsdom',
  'tailwindcss',
  '@tailwindcss/postcss',
  'postcss',
  'autoprefixer',
  '@playwright/test',
  'playwright',
  '@prerenderer/renderer-jsdom',
  '@prerenderer/renderer-puppeteer',
  '@prerenderer/rollup-plugin',
  'eventsource',
]

/** Type packages only needed when a web client is present */
const CLIENT_TYPE_PACKAGES = ['@types/react', '@types/react-dom']

/**
 * Filter package.json dependencies for the given preset
 * Returns a new package.json object with filtered deps
 */
export function filterPackageJson(
  pkg: Record<string, unknown>,
  resolved: ResolvedPreset
): Record<string, unknown> {
  const result = { ...pkg }

  // Collect packages to remove
  const packagesToRemove = new Set<string>(UNUSED_PACKAGES)

  // Remove module-specific packages only if ALL modules requiring it are absent
  const packageToModules: Record<string, string[]> = {}
  for (const [module, packages] of Object.entries(MODULE_PACKAGES)) {
    for (const pkg of packages) {
      if (!packageToModules[pkg]) packageToModules[pkg] = []
      packageToModules[pkg].push(module)
    }
  }

  for (const [pkg, modules] of Object.entries(packageToModules)) {
    if (!modules.some(m => resolved.modules.has(m))) {
      packagesToRemove.add(pkg)
    }
  }

  // Remove admin panel packages if no admin module
  if (!resolved.modules.has('admin')) {
    for (const pkg of ADMIN_PANEL_PACKAGES) {
      packagesToRemove.add(pkg)
    }
  }

  // Remove CLI legacy packages (commander was replaced by xcli-core)
  // commander is no longer in template dependencies, but guard against it
  for (const pkg of CLI_PACKAGES) {
    packagesToRemove.add(pkg)
  }

  // Remove client packages if no web client
  if (!resolved.hasClient) {
    for (const pkg of CLIENT_PACKAGES) {
      packagesToRemove.add(pkg)
    }
  }

  // Filter dependencies
  if (result.dependencies && typeof result.dependencies === 'object') {
    const deps = { ...(result.dependencies as Record<string, string>) }
    for (const pkg of packagesToRemove) {
      delete deps[pkg]
    }
    result.dependencies = deps
  }

  // Filter devDependencies — remove admin-only test packages
  if (result.devDependencies && typeof result.devDependencies === 'object') {
    const devDeps = { ...(result.devDependencies as Record<string, string>) }
    if (!resolved.modules.has('admin')) {
      delete devDeps['@testing-library/user-event']
    }
    if (!resolved.hasClient) {
      for (const pkg of CLIENT_DEV_PACKAGES) {
        delete devDeps[pkg]
      }
      for (const pkg of CLIENT_TYPE_PACKAGES) {
        delete devDeps[pkg]
      }
    }
    result.devDependencies = devDeps
  }

  // Adjust scripts for cli-only preset
  if (!resolved.hasClient && result.scripts && typeof result.scripts === 'object') {
    const scripts = { ...(result.scripts as Record<string, string>) }

    // Override dev to start server directly instead of vite
    scripts['dev'] = 'NODE_ENV=development node --import tsx src/server/entries/node.ts'
    scripts['build'] = 'npm run build:server && npm run build:cli'
    scripts['build:all'] = 'npm run build:server && npm run build:cli'
    delete scripts['build:client']
    delete scripts['build:cloudflare']
    delete scripts['preview']
    delete scripts['dev:todo']
    delete scripts['dev:plugin']
    delete scripts['dev:ecommerce']
    delete scripts['dev:community']
    delete scripts['dev:saas']
    delete scripts['dev:cf']
    delete scripts['deploy:cf']
    delete scripts['test:e2e']
    delete scripts['test:e2e:ui']
    delete scripts['test:e2e:debug']
    delete scripts['test:full']

    result.scripts = scripts
  }

  return result
}
