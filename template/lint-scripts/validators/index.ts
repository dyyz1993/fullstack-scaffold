/**
 * 通用验证器的类型定义
 */

// ============================================
// TODO/FIXME 验证配置
// ============================================
export interface TodosConfig {
  keywords: string[]
  allowedPattern: RegExp
  ignoreDirs: string[]
  checkDirs: string[]
}

export interface TodoError {
  file: string
  line: number
  keyword: string
  content: string
}

// ============================================
// 敏感信息检测配置
// ============================================
export interface PatternRule {
  pattern: RegExp
  message: string
  excludePattern?: RegExp
}

export interface SensitiveConfig {
  patterns: PatternRule[]
  ignorePatterns?: RegExp[]
  fileExtensions: string[]
  checkDirs: string[]
}

export interface SensitiveError {
  file: string
  line: number
  message: string
  content: string
}

// ============================================
// 导入路径验证配置
// ============================================
export type ModuleName = string

export interface ImportsConfig {
  modules: readonly ModuleName[]
  srcDir: string
  aliases: Record<string, string>
  minCrossModuleDepth: number
  ignoreDirs: string[]
  checkDirs: string[]
}

export interface ImportError {
  file: string
  importPath: string
  suggestion: string
}

// ============================================
// 服务端 RPC 验证配置
// ============================================
export interface ServerRPCConfig {
  checkDirs: string[]
  ignoreDirs: string[]
  requireChainSyntax: boolean
  requireTypeExport: boolean
}

export interface ServerRPCError {
  file: string
  line: number
  message: string
  suggestion: string
}

// ============================================
// 客户端 RPC 验证配置
// ============================================
export interface ClientRPCConfig {
  checkDirs: string[]
  ignoreDirs: string[]
  requireAPIClient: boolean
  forbidDirectFetch: boolean
}

export interface ClientRPCError {
  file: string
  line: number
  message: string
  suggestion: string
}

// ============================================
// 目录结构验证配置
// ============================================
export interface DirectoryRule {
  pattern: string
  requiredDir: string
  description?: string
}

export interface ForbiddenLocation {
  pattern: string
  forbiddenDirs: string[]
  message: string
  suggestion: string
}

export interface DirectoryStructureConfig {
  rules: DirectoryRule[]
  forbiddenLocations?: ForbiddenLocation[]
  ignoreDirs: string[]
  allowedRootFiles?: string[]
}

export interface DirectoryError {
  file: string
  expectedDir: string
  actualDir: string
}

export interface ForbiddenError {
  file: string
  message: string
  suggestion: string
}
