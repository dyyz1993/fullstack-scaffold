/**
 * SSR 渲染桥（本文件在模板中为全量版；CLI 脚手架时按 preset 重新生成：
 * cli-only 等无 client 的 preset 导出 null，避免悬空导入）。
 */
import { renderSSR as renderSSRImpl } from '@client/entry-server'

// data 由 ISR registry fetch 提供（形状随模块而异），renderSSR 内部自取所需字段
export function renderSSR(pathname: string, data: unknown): { html: string } {
  return renderSSRImpl(pathname, data as Parameters<typeof renderSSRImpl>[1])
}
