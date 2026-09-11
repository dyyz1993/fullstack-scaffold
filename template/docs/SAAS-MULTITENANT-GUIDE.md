# SaaS 多租户形态指南（saas preset）

> 面向：用 `--preset saas` 生成多租户 SaaS 应用的开发者。
> 版本：v0.6.0 起全部链路真实可用（此前仅租户记录 CRUD）。

## 这套形态解决什么问题

给"一个平台服务多个客户组织"的场景提供开箱即用的骨架：

- 平台侧：超级管理员管理所有租户（CRUD/套餐/配额字段）
- 租户侧：每个租户有自己的管理员、成员、角色、数据
- 成员关系：邮件邀请（7 天 token 链接）→ 接受入组 → 按角色授权
- 数据隔离：业务数据带 `tenant_id`，按请求上下文过滤

## 适用场景

| 场景           | 例子                        | 用到的能力                 |
| -------------- | --------------------------- | -------------------------- |
| B2B 工具站     | 团队协作工具、项目管理 SaaS | 成员邀请 + 角色 + 数据隔离 |
| 内容平台多组织 | 各机构独立发内容的内容站    | 租户 + ISR 内容页 + 隔离   |
| 内部多部门系统 | 集团内各部门各看各的数据    | 租户识别 + 配额            |

## 不适用场景（诚实边界）

- **面向 C 端个人用户**（每人一个"空间"而非"组织"）：个人维度用 `user_id` 即可，租户模型是过度设计 → 用 `todo-app`/`forum` preset
- **需要真订阅计费**（Stripe/发票/试用期）：本模板只有 plan 字段 + 配额执行，**没有**账单表和支付集成；接 Stripe 属独立工程
- **需要组织级 SSO/SCIM**：认证是本地账号（bcrypt + JWT），没有 SAML/OIDC
- **强合规多租户**（SOC2 级审计/数据驻留）：审计日志是平台级的，尚无租户维度切分

## 核心概念与链路

```
平台超管(super_admin)         租户管理员(tenant_admin)        普通成员(tenant_member)
      │                              │                              │
      ├─ 平台级 CRUD 所有租户         ├─ 邀请成员(邮件+角色)           ├─ 按角色权限访问数据
      ├─ 租户套餐/配额字段            ├─ 改成员角色/移除              │
      └─ CLI 管理                    └─ 租户内自定义角色(按套餐限额)   │
```

**租户开通**（事务，三步原子）：`POST /api/tenants` → 建租户记录 + 播种 3 个系统角色
（admin 全权限 / member 读写 / guest 只读）+ owner 以 tenant_admin 入组。

**邀请加入**：`POST /tenants/:id/members/invite`（生成 7 天 token）→ 受邀人打开
`/tenant/invite/:token`（公开页，脱敏详情）→ 登录后 Accept → 事务内标记 accepted + 建成员。
两次配额校验：邀请时 + 接受时（防邀请期内名额被占满）。

**租户识别**：请求头 `X-Tenant-Slug` 或子域名（`xxx.example.com`）。中间件为
**可选上下文**语义：无标识 → 全局模式放行（平台级 API 照常）；slug 不存在 → 404。

**配额执行**（真实拦截，非展示）：

- 成员数：`tenants.max_users`，邀请与接受两处校验，超限 400
- 自定义角色数：`PLAN_ROLE_LIMITS`（free 3 / starter 5 / pro 10 / enterprise ∞）

## 快速上手

```bash
npx create-fullstack-scaffold my-saas --preset saas
cd my-saas && npm install && npx drizzle-kit push
npm run dev          # 首次启动自动建表+种子

# 平台超管（首启日志会打印一次凭据提醒）
#   账号 superadmin / 密码 admin123 —— 上线前务必改密

# 1) 超管开租户（或注册账号后自助登录建）
curl -X POST localhost:5173/api/tenants \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Acme","slug":"acme","plan":"pro"}'

# 2) 邀请成员（返回 7 天邀请链接）
curl -X POST localhost:5173/api/tenants/<id>/members/invite \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"email":"dev@acme.io","roleId":"<role-id>"}'

# 3) 受邀人打开 http://localhost:5173/tenant/invite/<token> → Accept → 进租户控制台
#    控制台入口：http://localhost:5173/tenant/login
```

CLI（免登录，平台管理视角）：

```bash
npx cfs tenant list                 # 租户列表
npx cfs tenant create --name Acme --slug acme --plan pro
npx cfs tenant roles --id <id>      # 看角色（拿 role-id）
npx cfs tenant members --id <id>    # 成员清单
npx cfs tenant invite --id <id> --email dev@acme.io --role-id <role-id>
```

## 数据模型

| 表                   | 用途         | 关键列                                                          |
| -------------------- | ------------ | --------------------------------------------------------------- |
| `tenants`            | 租户         | slug(唯一)/plan/max_users/status                                |
| `tenant_roles`       | 租户内角色   | tenant_id+code 唯一，permissions(JSON)，is_system               |
| `tenant_members`     | 成员归属     | user_id+tenant_id 唯一，软删(status='left')                     |
| `tenant_invitations` | 邀请         | token 唯一，7 天过期，状态机 pending→accepted/expired/cancelled |
| `todos.tenant_id`    | 业务数据归属 | nullable（无 tenant preset 的 preset 恒 null）                  |

## 已知边界（改进路线）

1. 成员 Account 展示依赖 `developers.id === tenant_members.user_id` 直等；dev token 用户显示原始 id
2. 移动端 375px 下租户控制台侧栏不收起
3. `contents` 表尚未接 tenant_id（内容模块在 saas preset 内仍是全局数据）
4. 审计日志无租户维度

## 部署注意

- **必须设置 `AUTH_SECRET_KEY`**（任意强随机串）——生产默认 key 会被启动警告
- `superadmin/admin123` 种子只在首启空库时创建，上线前立即改密
- 租户控制台是独立入口 `/tenant/*`（tenant.html），生产部署确认 `dist/client/tenant.html` 存在
