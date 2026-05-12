/**
 * Filters package.json dependencies based on the resolved preset.
 * Removes module-specific packages that aren't needed.
 */
import type { ResolvedPreset } from './template-generator'

/** Packages only needed by specific modules */
const MODULE_PACKAGES: Record<string, string[]> = {
  admin: ['bcryptjs'],
}

/** Packages needed by the admin panel UI */
const ADMIN_PANEL_PACKAGES = ['antd']

/** Packages needed by the CLI app (xcli-core based) */
const CLI_PACKAGES = ['commander'] // legacy, removed from template

/** Packages that are never imported (unused) */
const UNUSED_PACKAGES = ['lodash-es', 'chalk', 'mysql2']

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

  // Remove module-specific packages
  for (const [module, packages] of Object.entries(MODULE_PACKAGES)) {
    if (!resolved.modules.has(module)) {
      for (const pkg of packages) {
        packagesToRemove.add(pkg)
      }
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
    result.devDependencies = devDeps
  }

  return result
}
