/**
 * @framework-baseline f51621ebf8da3453
 *
 * 此文件属于框架层代码。如需修改，请添加以下说明：
 *
 * @framework-modify
 * @reason [必填] 修改原因
 * @impact [必填] 影响范围
 */

/**
 * Module manifest — declarative description of a module's capabilities and dependencies.
 * Each module-xxx directory should have a module.ts that exports a ModuleManifest.
 */
export interface ModuleManifest {
  /** Unique module identifier (e.g., 'todos', 'chat', 'admin') */
  name: string

  /** Human-readable description */
  description: string

  /** Category for grouping in templates */
  category: 'core' | 'communication' | 'business' | 'system'

  /** Other module names this module depends on */
  dependsOn: string[]

  /** Route registration info */
  routes: {
    /** Routes mounted under client API (/api) */
    client?: {
      /** Import path to the route variable (relative to module dir) */
      importPath: string
      /** Exported variable name from the route file */
      exportName: string
    }
    /** Routes mounted under admin API (/api/admin) */
    admin?: {
      importPath: string
      exportName: string
    }[]
    /** Standalone routes (e.g., /files) */
    standalone?: {
      importPath: string
      exportName: string
      mountPath: string
    }
  }

  /** Shared schemas exported by this module */
  sharedSchemas?: {
    /** Directory path under shared/modules/ */
    path: string
    /** Additional shared module paths owned by this module (e.g., 'role', 'audit' for permission) */
    additionalPaths?: string[]
  }

  /** Client-facing pages (React) */
  clientPages?: {
    /** Page component name (also filename) */
    name: string
    /** Route path in the client router */
    route: string
  }[]

  /** Admin panel pages (React + Ant Design) */
  adminPages?: {
    name: string
    route: string
    /** Whether the page is public (no auth required) */
    isPublic?: boolean
    /** Required permission to access this page */
    requiredPermission?: string
  }[]

  /** Database schema files (Drizzle table definitions) */
  dbSchemas?: {
    /** Filename in server/db/schema/ (without .ts extension) */
    files: string[]
    /** Whether the module has seed data */
    hasSeed: boolean
  }

  /** Required npm dependencies (beyond what core provides) */
  dependencies?: Record<string, string>

  /** Client stores */
  clientStores?: string[]

  /** Middleware that this module provides (used by app.ts) */
  providesMiddleware?: {
    /** Middleware name */
    name: string
    /** Import path (from server/middleware/) */
    importPath: string
    /** Which routes it applies to */
    appliesTo: 'client-api' | 'admin-api' | 'all-api' | 'standalone'
  }[]

  /** Whether this module has SSE (Server-Sent Events) routes */
  hasSSE?: boolean

  /** Whether this module has WebSocket routes */
  hasWebSocket?: boolean
}

/** Type-safe module registry — maps module name to its manifest */
export type ModuleRegistry = Record<string, ModuleManifest>

/** Template preset — defines which modules a template includes */
export interface TemplatePreset {
  /** Preset identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Description shown in CLI */
  description: string
  /** Module names to include (order matters for registration) */
  modules: string[]
}
