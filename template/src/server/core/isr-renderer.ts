/**
 * @framework-baseline cec621fae360ba2b
 *
 *
 * @framework-modify
 * @reason prettier 格式化与注释结构整理；body 改为可选字段
 * @impact 框架文件维护性修改，行为见测试
 */

/**
 * ISR HTML renderer — injects SSR body content AND meta tags into HTML template.
 * Full SSG mode: combines React SSR output with SEO meta tags.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface ISRPageMeta {
  title: string
  description: string
}

export interface ISRRenderOptions {
  /** Pre-built HTML template (from ASSETS or readFileSync) */
  template: string | null
  /** SSR body content (React renderToString output); omitted in meta-only mode */
  body?: string
  /** Meta tags */
  meta: ISRPageMeta
}

/**
 * Inject ISR content (SSR body + meta tags) into an HTML template.
 * If template is null, generates a minimal standalone HTML.
 */
export function renderISRPage(opts: ISRRenderOptions): string {
  const { template, body = '', meta } = opts
  const safeTitle = escapeHtml(meta.title)
  const safeDesc = escapeHtml(meta.description)

  if (template) {
    let html = template
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`)
    html = html.replace(/<meta\s+name="description"[^>]*>/, '')
    html = html.replace(/<meta\s+property="og:title"[^>]*>/, '')
    html = html.replace(/<meta\s+property="og:description"[^>]*>/, '')
    html = html.replace(
      '</head>',
      `    <meta name="description" content="${safeDesc}" />\n    <meta property="og:title" content="${safeTitle}" />\n    <meta property="og:description" content="${safeDesc}" />\n    <meta name="generator" content="ISR-SSG" />\n  </head>`
    )
    html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
    return html
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta name="generator" content="ISR-SSG" />
  </head>
  <body>
    <div id="root">${body}</div>
  </body>
</html>`
}
