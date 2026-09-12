/**
 * Preset 门户 v2 —— 形态目录 + 身份×旅程故事板。
 * 交互：顶部导航切换 preset（hash 路由），详情页展示定位/模块/各身份的
 * 正向与逆向旅程分步截图；"进入在线站点"为显式按钮而非默认点击行为。
 * 截图来源：仓库 docs/PRESETS/screenshots/journeys/（raw.githubusercontent）。
 */
const RAW =
  'https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/journeys'
const DOC = 'https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS'

const PRESETS = [
  {
    id: 'saas',
    name: 'SaaS Multi-Tenant',
    zh: '多租户 SaaS',
    sub: 'saas',
    desc: '租户开通事务、成员邀请（7 天 token）、租户内角色、套餐配额、子域隔离、租户控制台。',
    modules: [
      'todos 待办',
      'notifications 通知/SSE',
      'file 文件',
      'captcha 验证码',
      'auth 认证',
      'tenant 多租户',
      'content 内容',
      'permission RBAC',
    ],
    journeys: [
      {
        role: '租户管理员',
        dir: '正向',
        steps: [
          { img: 'saas-j1-login', t: '登录控制台', d: '平台账号认证 + 自动选定所属租户' },
          { img: 'saas-j2-dashboard', t: '仪表盘', d: '成员数 / 活跃待办 / 内容统计' },
          { img: 'saas-j3-members', t: '成员管理', d: '成员列表与角色徽章' },
          { img: 'saas-j4-invite', t: '发起邀请', d: '邮箱 + 角色选择（配额在服务端校验）' },
          { img: 'saas-j5-invite-done', t: '邀请完成', d: '生成 7 天有效邀请链接' },
        ],
      },
      {
        role: '受邀成员',
        dir: '正向',
        steps: [
          { img: 'saas-j6-invite-landing', t: '邀请落地页', d: '公开脱敏详情：租户名 + 角色名' },
          { img: 'saas-j7-accept', t: '接受入组', d: '一键 Accept → 进入租户控制台' },
        ],
      },
      {
        role: '异常路径',
        dir: '逆向',
        steps: [
          { img: 'saas-r1-badtoken', t: '无效邀请', d: '伪造 token → 明确的 Invitation not found' },
          { img: 'saas-r2-loggedout', t: '未登录守卫', d: '直访受保护页 → 拦回登录页' },
        ],
      },
    ],
  },
  {
    id: 'fullstack',
    name: 'Fullstack Admin',
    zh: '全模块管理后台',
    sub: 'fullstack',
    desc: '13 模块最全形态：管理后台 + 多租户 + 插件市场 + 电商 + 内容，一套全有。',
    modules: [
      'admin 后台',
      'auth 认证',
      'plugin 插件市场',
      'tenant 多租户',
      'order 订单',
      'ticket 工单',
      'dispute 纠纷',
      'content 内容',
      'merchant 商家端',
      'permission RBAC',
      'chat WS',
      'notifications SSE',
      'file/captcha',
    ],
    journeys: [
      {
        role: '平台超管',
        dir: '正向',
        steps: [
          { img: 'fa-j1-login', t: '登录后台', d: '中文界面 + 快速登录通道' },
          { img: 'fa-j2-dashboard', t: '仪表盘', d: '总待办 / 待处理 / 已完成统计' },
          { img: 'fa-j3-users', t: '用户管理', d: '用户表格 + 角色徽章 + 分页' },
          { img: 'fa-j4-plugins', t: '插件治理', d: '插件列表与审核队列' },
        ],
      },
      {
        role: '异常路径',
        dir: '逆向',
        steps: [
          { img: 'fa-r1-loggedout', t: '登出态访问', d: '直访 /admin/users → 重定向回登录页' },
        ],
      },
    ],
  },
  {
    id: 'todo',
    name: 'Todo App',
    zh: '经典全栈',
    sub: 'todo',
    desc: 'todos + 聊天 + 通知 + 认证四模块，最贴近标准全栈应用的心智模型。',
    modules: ['todos 待办', 'chat WS 聊天', 'notifications SSE', 'auth 认证'],
    journeys: [
      {
        role: '访客',
        dir: '正向',
        steps: [
          { img: 'todo-j1-home', t: '首页列表', d: '10 条演示数据' },
          { img: 'todo-j2-add', t: '新增', d: '填标题点 Add → 列表即时更新' },
          { img: 'todo-j3-done', t: '完成', d: '状态下拉切换 completed' },
          { img: 'todo-j4-delete', t: '删除', d: '确认弹窗 → 条目移除' },
        ],
      },
      {
        role: '异常路径',
        dir: '逆向',
        steps: [{ img: 'todo-r1-empty', t: '空标题校验', d: '不填标题提交 → Zod 校验提示' }],
      },
    ],
  },
  {
    id: 'market',
    name: 'XBrowser Marketplace',
    zh: '插件市场',
    sub: 'market',
    desc: '插件上架/审核/安装/评价全生命周期 + 订单工单纠纷，最复杂的业务形态。',
    modules: [
      'plugin 插件全生命周期',
      'order 订单',
      'ticket 工单',
      'dispute 纠纷',
      'content 内容',
      'auth/permission',
    ],
    journeys: [
      {
        role: '访客',
        dir: '正向',
        steps: [
          { img: 'mk-j1-home', t: '市场首页', d: '分类侧栏 + 插件卡片' },
          { img: 'mk-j2-search', t: '搜索', d: '关键词过滤插件' },
          { img: 'mk-j3-install', t: '安装', d: '详情页 Install Plugin' },
        ],
      },
      {
        role: '异常路径',
        dir: '逆向',
        steps: [{ img: 'mk-r1-empty', t: '空结果态', d: '搜索不存在的词 → 明确空态' }],
      },
    ],
  },
  {
    id: 'shop',
    name: 'Ecommerce',
    zh: '电商交易',
    sub: 'shop',
    desc: '订单/购物车/工单/纠纷仲裁/内容的电商组合，含审批流与仲裁状态机。',
    modules: [
      'order 订单/购物车',
      'ticket 工单',
      'dispute 仲裁',
      'content 内容',
      'todos',
      'permission',
    ],
    journeys: [
      {
        role: '访客',
        dir: '正向',
        steps: [
          { img: 'shop-j1-contents', t: '内容中心', d: '首页内容卡片' },
          { img: 'shop-j2-filter', t: '分类筛选', d: '教程分类 → 过滤结果' },
        ],
      },
    ],
  },
  {
    id: 'forum',
    name: 'Forum',
    zh: '社区论坛',
    sub: 'forum',
    desc: '内容发布审核 + 公开浏览 + 权限 + 管理后台的社区组合。',
    modules: ['content 内容', 'auth 认证', 'permission RBAC', 'admin 后台', 'notifications'],
    journeys: [
      {
        role: '访客',
        dir: '正向',
        steps: [
          { img: 'forum-j1-list', t: '内容列表', d: '已发布内容卡片' },
          { img: 'forum-j2-detail', t: '内容详情', d: '正文 + 元信息 + ISR 渲染' },
        ],
      },
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    zh: '极简骨架',
    sub: 'minimal',
    desc: '只有 todos 一个业务模块的最小可用子集，验证部署链路与学习起点。',
    modules: ['todos 待办'],
    journeys: [
      {
        role: '访客',
        dir: '正向',
        steps: [{ img: 'min-j1-crud', t: 'CRUD 演示', d: '新增条目后的列表' }],
      },
    ],
  },
]

function render() {
  const hash = (location.hash || '').replace('#', '')
  const current = PRESETS.find(p => p.id === hash) || PRESETS[0]

  const chips = PRESETS.map(
    p =>
      `<button class="chip${p.id === current.id ? ' on' : ''}" onclick="location.hash='${p.id}'">${p.zh}</button>`
  ).join('')

  const journeys = current.journeys
    .map(
      j => `
      <section class="journey">
        <h3><span class="role">${j.role}</span><span class="dir ${j.dir === '正向' ? 'pos' : 'neg'}">${j.dir}</span></h3>
        <div class="steps">
          ${j.steps
            .map(
              (s, i) => `
            <div class="step">
              <img loading="lazy" src="${RAW}/${s.img}.png" alt="${s.t}" onerror="this.parentElement.classList.add('noimg');this.remove()">
              <div class="cap"><b>步骤 ${i + 1} · ${s.t}</b><span>${s.d}</span></div>
            </div>`
            )
            .join('')}
        </div>
      </section>`
    )
    .join('')

  const mods = current.modules.map(m => `<span class="mod">${m}</span>`).join('')

  return `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>create-fullstack-scaffold — 形态目录与旅程</title>
<style>
*{box-sizing:border-box;margin:0}
body{font-family:-apple-system,'PingFang SC',sans-serif;background:#0f172a;color:#e2e8f0}
.wrap{max-width:1180px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:24px}
.sub{color:#94a3b8;font-size:14px;margin:6px 0 18px}
nav{position:sticky;top:0;background:#0f172acc;backdrop-filter:blur(6px);display:flex;gap:8px;overflow-x:auto;padding:12px 0;border-bottom:1px solid #1e293b;z-index:5}
.chip{flex:0 0 auto;background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:999px;padding:7px 16px;font-size:13px;cursor:pointer}
.chip.on{background:#38bdf822;border-color:#38bdf8;color:#38bdf8}
.hero{margin:22px 0 8px}
.hero h2{font-size:20px;color:#38bdf8}
.hero h2 span{color:#94a3b8;font-size:14px;font-weight:400;margin-left:8px}
.hero p{color:#cbd5e1;font-size:14px;line-height:1.7;margin:8px 0}
.btns{display:flex;gap:10px;margin:12px 0 6px;flex-wrap:wrap}
.btn{background:#38bdf8;color:#0f172a;border-radius:8px;padding:9px 16px;font-size:14px;font-weight:600;text-decoration:none}
.btn.ghost{background:transparent;color:#38bdf8;border:1px solid #38bdf8}
.mods{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 24px}
.mod{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:5px 12px;font-size:12px;color:#cbd5e1}
.journey{margin:22px 0}
.journey h3{font-size:15px;margin-bottom:10px;display:flex;gap:8px;align-items:center}
.role{background:#334155;border-radius:6px;padding:3px 10px;font-size:12px}
.dir{border-radius:6px;padding:3px 10px;font-size:12px}
.dir.pos{background:#064e3b;color:#6ee7b7}
.dir.neg{background:#7f1d1d;color:#fca5a5}
.steps{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px}
.step{flex:0 0 300px;background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden}
.step img{width:100%;display:block;border-bottom:1px solid #334155;min-height:120px;background:#0b1220}
.step .cap{padding:10px 12px;display:flex;flex-direction:column;gap:4px}
.step .cap b{font-size:13px;color:#e2e8f0}
.step .cap span{font-size:12px;color:#94a3b8;line-height:1.5}
.step.noimg{border-style:dashed}
.links{margin-top:34px;display:flex;gap:16px;flex-wrap:wrap;border-top:1px solid #1e293b;padding-top:16px}
.links a{color:#38bdf8;text-decoration:none;font-size:13px}
</style></head><body>
<div class="wrap">
<h1>create-fullstack-scaffold</h1>
<p class="sub">React 18 + Hono RPC + Drizzle + Cloudflare Workers/D1 · 七形态在线目录 · 身份×旅程故事板（正向与逆向全覆盖）</p>
<nav>${chips}</nav>
<div class="hero">
  <h2>${current.name}<span>${current.zh}</span></h2>
  <p>${current.desc}</p>
  <div class="btns">
    <a class="btn" href="https://${current.sub}.lpm1.top" target="_blank" rel="noopener">进入在线站点 →</a>
    <a class="btn ghost" href="${DOC}/${current.id === 'fullstack' ? 'fullstack-admin' : current.id}.md" target="_blank" rel="noopener">形态文档（含验证清单）</a>
  </div>
  <div class="mods">${mods}</div>
</div>
${journeys}
<div class="links">
  <a href="https://github.com/dyyz1993/fullstack-scaffold/blob/master/MISSION-PACK.md" target="_blank" rel="noopener">📋 Mission Pack（Agent 提示词包）</a>
  <a href="https://github.com/dyyz1993/fullstack-scaffold/tree/master/docs/PRESETS" target="_blank" rel="noopener">📚 全部形态文档</a>
  <a href="https://www.npmjs.com/package/create-fullstack-scaffold" target="_blank" rel="noopener">⬇ npm</a>
  <a href="https://demo.lpm1.top" target="_blank" rel="noopener">▶ 全形态 Demo</a>
</div>
</div>
<script>window.onhashchange = function(){ document.body.innerHTML = render() }</script>
</body></html>`
}

export default {
  async fetch() {
    return new Response(render(), { headers: { 'content-type': 'text/html;charset=utf-8' } })
  },
}
