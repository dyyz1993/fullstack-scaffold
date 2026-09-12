/**
 * Preset 门户页——列出全部形态的在线入口、文档与 Mission Pack。
 * 部署：npx wrangler deploy portal/worker.js --name preset-portal --assets portal
 */
export default {
  async fetch() {
    const presets = [
      {
        name: 'Fullstack Admin',
        zh: '全模块管理后台',
        sub: 'fullstack',
        desc: '15 模块全形态：管理后台 + 多租户 + 插件市场 + 电商 + 内容',
      },
      {
        name: 'Todo App',
        zh: '经典全栈起步',
        sub: 'todo',
        desc: 'todos + 聊天 + 通知 + 认证，最贴近标准全栈应用',
      },
      {
        name: 'SaaS Multi-Tenant',
        zh: '多租户 SaaS',
        sub: 'saas',
        desc: '租户开通 / 成员邀请 / 配额 / 子域隔离 / 租户控制台',
      },
      {
        name: 'Ecommerce',
        zh: '电商交易',
        sub: 'shop',
        desc: '订单购物车 / 工单审批流 / 纠纷仲裁 / 内容',
      },
      {
        name: 'Forum',
        zh: '社区论坛',
        sub: 'forum',
        desc: '内容发布审核 + 公开浏览 + 权限 + 后台',
      },
      {
        name: 'XBrowser Marketplace',
        zh: '插件市场',
        sub: 'market',
        desc: '插件上架/审核/安装/评价全生命周期',
      },
      { name: 'Minimal', zh: '极简单模块', sub: 'minimal', desc: '只有 todos 的最小可用骨架' },
    ]

    const RAW =
      'https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots'
    const shots = {
      fullstack: 'fullstack-dashboard',
      todo: 'todo-home',
      saas: 'saas-tenant-dashboard',
      shop: 'shop-home',
      forum: 'forum-home',
      market: 'market-home',
      minimal: 'minimal-home',
    }

    const cards = presets
      .map(
        p => `<a class="card" href="https://${p.sub}.lpm1.top" target="_blank" rel="noopener">
        <h2>${p.name}<span>${p.zh}</span></h2>
        <p>${p.desc}</p>
        <img loading="lazy" src="${RAW}/${shots[p.sub] || 'portal'}.png" alt="${p.name} screenshot" style="width:100%;border-radius:8px;margin-bottom:10px;border:1px solid #334155">
        <code>https://${p.sub}.lpm1.top</code>
      </a>`
      )
      .join('\n')
    const html = `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>create-fullstack-scaffold — 形态目录</title>
<style>
*{box-sizing:border-box;margin:0}
body{font-family:-apple-system,'PingFang SC',sans-serif;background:#0f172a;color:#e2e8f0;padding:40px 24px;max-width:1200px;margin:0 auto}
h1{font-size:28px;margin-bottom:8px}
.sub{color:#94a3b8;margin-bottom:32px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.card{display:block;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;text-decoration:none;color:inherit;transition:.15s}
.card:hover{border-color:#38bdf8;transform:translateY(-2px)}
.card h2{font-size:17px;color:#38bdf8;margin-bottom:6px}
.card h2 span{color:#94a3b8;font-size:13px;margin-left:8px;font-weight:400}
.card p{color:#cbd5e1;font-size:13px;line-height:1.6;margin-bottom:10px}
.card code{font-size:11px;color:#64748b}
.links{margin-top:28px;display:flex;gap:16px;flex-wrap:wrap}
.links a{color:#38bdf8;text-decoration:none;font-size:14px}
</style></head><body>
<h1>create-fullstack-scaffold</h1>
<p class="sub">React 18 + Hono RPC + Drizzle ORM + Cloudflare Workers/D1 · 7 种在线形态 · 全部共享同一演示数据池</p>
<div class="grid">${cards}</div>
<div class="links">
<a href="https://demo.lpm1.top" target="_blank" rel="noopener">▶ 全形态 Demo（fullstack-admin）</a>
<a href="https://github.com/dyyz1993/fullstack-scaffold/tree/master/docs/PRESETS" target="_blank" rel="noopener">📚 形态文档（含验证清单）</a>
<a href="https://github.com/dyyz1993/fullstack-scaffold/blob/master/MISSION-PACK.md" target="_blank" rel="noopener">📋 Mission Pack（丢给 AI Agent 的提示词包）</a>
<a href="https://www.npmjs.com/package/create-fullstack-scaffold" target="_blank" rel="noopener">⬇ npm</a>
</div>
</body></html>`
    return new Response(html, { headers: { 'content-type': 'text/html;charset=utf-8' } })
  },
}
