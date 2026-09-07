import type { ResolvedPreset } from './template-generator'

/**
 * 生成 src/server/isr-modules.ts：按 preset 汇总各模块的 ISR 注册副作用导入。
 *
 * 背景：entries/cloudflare.ts 曾静态 import '@server/module-todos/isr' 与
 * '@server/module-content/isr'，preset 裁掉 content 后 CF 构建（esbuild）与
 * tsc 均因悬空导入失败。生成器只为"选中且存在 isr.ts 的模块"生成导入。
 */
export function generateIsrModules(
  resolved: ResolvedPreset,
  moduleFileExists: (moduleName: string, relPath: string) => boolean
): string {
  const imports: string[] = []

  for (const [moduleName] of [...resolved.modules.entries()]) {
    if (moduleFileExists(moduleName, 'isr.ts')) {
      imports.push(`import '@server/module-${moduleName}/isr'`)
    }
  }

  return `/**
 * ISR 模块注册汇总（本文件由 CLI 生成，勿手改）。
 * 生成器: src/generators/isr-modules.ts
 *
 * 按 preset 只导入选中模块的 ISR 注册副作用；未被裁剪风险的单一入口
 * 由 entries/cloudflare.ts import 本文件。
 */

${imports.join('\n')}
`
}
