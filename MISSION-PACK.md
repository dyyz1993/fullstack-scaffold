# Mission Pack — 丢给任意 Agent 的即用提示词包

> 把下面【任务提示词】整段复制给任意 AI Agent（ion / Claude Code / Codex / ZCode…），
> 它会自主从 npm 拉取模板并完成任务。无需预装任何东西——只需 Agent 有网、能跑 shell。

## 包内资源地址

| 资源                                | 地址                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 模板（npm）                         | https://www.npmjs.com/package/create-fullstack-scaffold                                                  |
| 源码仓库                            | https://github.com/dyyz1993/fullstack-scaffold                                                           |
| 多租户 Skill（Agent 可下载）        | https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/skills/saas-multitenant/SKILL.md    |
| ISR/SSR Skill（Agent 可下载）       | https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/skills/cloudflare-hono-isr/SKILL.md |
| 在线 Demo（fullstack-admin 全形态） | https://demo.lpm1.top                                                                                    |
| 多租户形态文档（随 app 分发）       | 生成后在 `docs/SAAS-MULTITENANT-GUIDE.md`                                                                |

## 在线形态目录（全部可点）

| 门户                           | 地址                       |
| ------------------------------ | -------------------------- |
| 🗂 形态总览门户                | https://presets.lpm1.top   |
| 全模块后台                     | https://fullstack.lpm1.top |
| 经典 Todo                      | https://todo.lpm1.top      |
| 多租户 SaaS                    | https://saas.lpm1.top      |
| 电商（shop）                   | https://shop.lpm1.top      |
| 论坛                           | https://forum.lpm1.top     |
| 插件市场（market）             | https://market.lpm1.top    |
| 极简（minimal）                | https://minimal.lpm1.top   |
| 全形态 Demo（fullstack-admin） | https://demo.lpm1.top      |

> 七站点共用一个 D1 演示数据池；登录凭据见各 preset 文档验证清单。

## 模板速览

React 18 + Hono(OpenAPI RPC) + Drizzle ORM + SQLite/Cloudflare D1 + Vite。
8 种预设形态（fullstack-admin 最全 15 模块 / saas 多租户 / ecommerce / forum / xbrowser-marketplace / todo-app / minimal / cli-only），
自带单元+集成测试、ESLint 防线、多租户（开通/邀请/角色/配额/隔离）、ISR/SSR、三端管理台（admin/tenant/merchant）。

## 面向 Agent 的技能指令（可选前置）

如果你的 Agent 支持下载 Skill，先把多租户 Skill 拉下来再开始任务：

```
下载 https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/skills/saas-multitenant/SKILL.md 并遵循其中的操作规范与避坑清单。
```

---

## 【任务 A】零知识审计

```text
我在 npm 上刷到一个叫 create-fullstack-scaffold 的包，据说能生成全栈应用，但我对它一无所知。帮我做三件事：
1. 从 npm 官方源拉最新版，把它的【最全的形态】生成出来（选型你自己判断）；
2. 把应用装好依赖、初始化数据库、跑起来，确认健康检查和核心接口能用；
3. 给我一份简明审计报告：它包含哪些功能模块、每个模块暴露了哪些 API（按模块分组列出）、自带哪些演示数据（给出具体数字）、以及你觉得这个工具适合什么人用。报告写进当前目录 audit-report.md。
注意：不要手动执行 drizzle-kit push——模板自带迁移，启动时会自动建表。
```

## 【任务 B】真实开发（库存模块）

```text
用 npm 上的 create-fullstack-scaffold 最新版生成一个应用（形态你看着选，说明理由）。然后在这个应用里新增一个「库存管理」功能：
- 商品字段：名称、数量、单价；
- 支持新增、分页列表、修改数量、删除；
- 必须跟随项目已有的模块化结构（module-xxx 目录 + zod-openapi 路由 + service 分层 + 测试），先看懂再动手；
- 完成标准（缺一不可，逐项跑完并在 DEV-NOTES.md 贴出命令输出）：
  npx tsc --noEmit 0 错误；npx vitest run 全部通过；npm run build 成功；
  最后启动应用用 curl 演示一遍增删改查。
```

## 【任务 C】多租户实战（saas preset）

```text
从 npm 拉取 create-fullstack-scaffold 最新版，生成多租户 SaaS 应用（--preset saas），先阅读应用内的 docs/SAAS-MULTITENANT-GUIDE.md。然后依次完成并逐步记录：
1. 启动应用（自带迁移会自动建表+种子，包括平台超管 superadmin）；
2. 用超管身份开通一个租户（slug=acme，plan=pro），确认事务自动播种了 3 个系统角色且 owner 已入组；
3. 注册一个普通成员账号，作为租户管理员邀请它（观察返回的 7 天邀请 token），用公开接口查看邀请详情，再以该成员身份接受邀请；
4. 验证配额：把租户 maxUsers 降到当前成员数，再邀请新邮箱——应被 400 拦截；
5. 验证隔离：给两个不同租户各创建业务数据，确认互相不可见；
6. 打开 /tenant/login 与 /tenant/invite/<token>，确认租户控制台与邀请落地页可访问。
把全过程写成 TENANT-RUNBOOK.md（含每步的 HTTP 状态码）。
```

## 【任务 D】多智能体并行部署

```text
帮我同时准备两个差异最大的应用形态做对比演示（用 npm 上的 create-fullstack-scaffold 最新版，选型理由写清楚）。要求：
- 能并行就并行（可派多个工作者同时干）；
- 两个应用分别跑在本机不同端口，各自通过健康检查，并保持运行不要退出；
- 产出 MATRIX.md：两个访问地址、各自一句话定位、适用场景建议。
```

---

## 自动化验证（部署后必跑）

```bash
bash scripts/e2e-presets-portal.sh        # 36 项检查，PASS 36 / FAIL 0 才算通过
```

覆盖六大类：九站点健康 → 共享数据面（跨 preset 数据一致）→ 双认证登录链 → 门户内容 → 文档/Skill 分发 → 60 秒存活复检。
脚本无环境依赖（curl+python3），可在任意机器执行；退出码非 0 即存在失败，报告落盘 `${TMPDIR:-/tmp}/e2e-presets-report.txt`。

## 给 Agent 运营方的两条硬建议（实测教训）

1. 任务提示词里把验收写成**硬命令**（如“`npx tsc --noEmit` 0 错误才许停”），口头标准（“要三绿”）Agent 容易跳过验证直接报完成。
2. 部署/常驻服务的验收要加 **10 分钟以上存活监控**，健康检查一次通过不代表稳定。
