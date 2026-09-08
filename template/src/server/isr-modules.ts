/**
 * ISR 模块注册汇总（单一入口，供 entries/cloudflare.ts 引用）。
 *
 * 本文件在模板仓库中为全量版本；CLI 脚手架时会按 preset 重新生成
 * （src/generators/isr-modules.ts），只保留选中模块的导入，
 * 避免 content 等模块被裁剪后悬空导入导致 CF 构建/tsc 失败。
 */

import '@server/module-todos/isr'
import '@server/module-content/isr'
