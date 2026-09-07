import { describe, it, expect, beforeAll } from 'vitest'
import { transform } from 'esbuild'
import { loadManifests, loadPresets, resolvePreset } from '../../generators/template-generator'
import { generateRpcSurface } from '../../generators/rpc-surface'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.join(__dirname, '../../../template')

/**
 * rpc-surface 生成物语法回归：
 * todo-app 验证链暴露不了带连字符的段（'generate-url' 等只在 file 模块出现），
 * 生成器曾在属性访问位输出 client.'generate-url'（非法语法），fullstack-admin
 * 构建时才爆炸。这里用 esbuild 对全部 preset 的生成物做解析级断言。
 */
describe('generateRpcSurface output is valid TS for every preset', () => {
  let allManifests: Map<string, any>
  let presets: any[]

  beforeAll(async () => {
    allManifests = await loadManifests(TEMPLATE_DIR)
    presets = await loadPresets(TEMPLATE_DIR)
  })

  const readRouteFile = (relPath: string): string | null => {
    const full = path.join(TEMPLATE_DIR, 'src/server', `${relPath}.ts`)
    try {
      return readFileSync(full, 'utf-8')
    } catch {
      return null
    }
  }

  for (const presetId of [
    'minimal',
    'todo-app',
    'fullstack-admin',
    'ecommerce',
    'saas',
    'forum',
    'xbrowser-marketplace',
    'cli-only',
  ]) {
    it(`${presetId}: generated facade parses`, async () => {
      const preset = presets.find(p => p.id === presetId)
      const resolved = resolvePreset(preset!, allManifests)
      const content = generateRpcSurface(resolved, readRouteFile)

      // 不允许属性访问位出现引号段（client.'x-y' 语法错误）
      expect(content).not.toMatch(/\.\s*'/)

      await transform(content, { loader: 'ts' }) // 语法非法时抛错
    })
  }
})
