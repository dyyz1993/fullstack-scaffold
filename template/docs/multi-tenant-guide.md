# 多租户系统操作手册

## 一、系统架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   租户选择页面   │  │   租户管理页面   │  │   成员管理页面   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API 层                                    │
│  /api/tenants/*                                                 │
│  /api/tenants/:tenantId/roles/*                                 │
│  /api/tenants/:tenantId/members/*                               │
│  /api/tenants/invitations/*                                     │
└─────────────────────────────────────────────────────────────────┘
```

## 二、API 端点列表

### 租户管理

| 方法   | 路径                     | 说明                       | 认证 |
| ------ | ------------------------ | -------------------------- | ---- |
| GET    | `/api/tenants`           | 获取当前用户所属的租户列表 | ✅   |
| POST   | `/api/tenants`           | 创建新租户                 | ✅   |
| GET    | `/api/tenants/:tenantId` | 获取租户详情               | ✅   |
| PUT    | `/api/tenants/:tenantId` | 更新租户信息               | ✅   |
| DELETE | `/api/tenants/:tenantId` | 删除租户（软删除）         | ✅   |

### 租户角色管理

| 方法   | 路径                                   | 说明             | 认证 |
| ------ | -------------------------------------- | ---------------- | ---- |
| GET    | `/api/tenants/:tenantId/roles`         | 获取租户角色列表 | ✅   |
| POST   | `/api/tenants/:tenantId/roles`         | 创建自定义角色   | ✅   |
| PUT    | `/api/tenants/:tenantId/roles/:roleId` | 更新角色         | ✅   |
| DELETE | `/api/tenants/:tenantId/roles/:roleId` | 删除角色         | ✅   |

### 租户成员管理

| 方法   | 路径                                       | 说明         | 认证 |
| ------ | ------------------------------------------ | ------------ | ---- |
| GET    | `/api/tenants/:tenantId/members`           | 获取成员列表 | ✅   |
| POST   | `/api/tenants/:tenantId/members/invite`    | 邀请成员     | ✅   |
| PUT    | `/api/tenants/:tenantId/members/:memberId` | 更新成员角色 | ✅   |
| DELETE | `/api/tenants/:tenantId/members/:memberId` | 移除成员     | ✅   |

### 邀请管理

| 方法 | 路径                                     | 说明         | 认证 |
| ---- | ---------------------------------------- | ------------ | ---- |
| GET  | `/api/tenants/invitations/:token`        | 获取邀请详情 | ❌   |
| POST | `/api/tenants/invitations/:token/accept` | 接受邀请     | ✅   |

## 三、操作流程

### 流程 1：创建租户

```
用户登录 → 创建租户 → 自动成为租户管理员 → 可以邀请成员
```

**步骤：**

1. 用户登录系统（获取 token）
2. 调用创建租户 API
3. 系统自动创建 3 个默认角色（管理员、成员、访客）
4. 创建者自动成为租户管理员

### 流程 2：邀请成员

```
租户管理员 → 邀请成员 → 发送邀请链接 → 成员接受邀请 → 加入租户
```

**步骤：**

1. 租户管理员调用邀请 API
2. 系统生成邀请 token（7天有效期）
3. 将邀请链接发送给被邀请人
4. 被邀请人访问邀请链接查看详情
5. 被邀请人登录后接受邀请

### 流程 3：角色管理

```
租户管理员 → 查看角色 → 创建/编辑角色 → 分配权限
```

**注意：** 不同套餐有角色数量限制：

- free: 3 个角色
- starter: 5 个角色
- pro: 10 个角色
- enterprise: 无限制

## 四、使用 cURL 测试

### 1. 创建租户

```bash
# 替换 YOUR_TOKEN 为实际的认证 token
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "我的公司",
    "slug": "my-company",
    "plan": "pro"
  }'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "tenant_abc123",
    "code": "my-company",
    "name": "我的公司",
    "slug": "my-company",
    "plan": "pro",
    "status": "active",
    "ownerId": "user_xxx",
    "createdAt": 1700000000000
  }
}
```

### 2. 获取用户所属租户

```bash
curl -X GET http://localhost:3000/api/tenants \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 获取租户角色

```bash
curl -X GET http://localhost:3000/api/tenants/tenant_abc123/roles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "tr_demo_tenant_admin",
        "tenantId": "tenant_abc123",
        "code": "tenant_admin",
        "name": "tenant_admin",
        "label": "租户管理员",
        "permissions": "[\"tenant:member:view\",\"tenant:member:invite\",...]",
        "isSystem": true
      },
      {
        "id": "tr_demo_tenant_member",
        "code": "tenant_member",
        "label": "普通成员",
        ...
      }
    ]
  }
}
```

### 4. 邀请成员

```bash
curl -X POST http://localhost:3000/api/tenants/tenant_abc123/members/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "newuser@example.com",
    "roleId": "tr_demo_tenant_member"
  }'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "inv_xxx",
    "tenantId": "tenant_abc123",
    "email": "newuser@example.com",
    "token": "abc123def456...",
    "status": "pending",
    "expiresAt": 1700604800000
  }
}
```

### 5. 查看邀请详情（无需登录）

```bash
curl -X GET http://localhost:3000/api/tenants/invitations/abc123def456
```

### 6. 接受邀请

```bash
curl -X POST http://localhost:3000/api/tenants/invitations/abc123def456/accept \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. 获取租户成员

```bash
curl -X GET http://localhost:3000/api/tenants/tenant_abc123/members \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8. 创建自定义角色

```bash
curl -X POST http://localhost:3000/api/tenants/tenant_abc123/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "project_manager",
    "name": "project_manager",
    "label": "项目经理",
    "description": "管理项目的成员",
    "permissions": [
      "tenant:member:view",
      "tenant:role:view",
      "tenant:data:view",
      "tenant:data:create",
      "tenant:data:edit"
    ]
  }'
```

### 9. 更新成员角色

```bash
curl -X PUT http://localhost:3000/api/tenants/tenant_abc123/members/tm_xxx \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "roleId": "tr_demo_tenant_admin"
  }'
```

### 10. 移除成员

```bash
curl -X DELETE http://localhost:3000/api/tenants/tenant_abc123/members/tm_xxx \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 五、前端集成建议

### 1. 租户选择/切换组件

```tsx
// components/TenantSelector.tsx
import { useState, useEffect } from 'react'

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
}

export function TenantSelector() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [currentTenant, setCurrentTenant] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tenants', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(res => res.json())
      .then(data => setTenants(data.data.tenants))
  }, [])

  return (
    <select value={currentTenant || ''} onChange={e => setCurrentTenant(e.target.value)}>
      {tenants.map(t => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  )
}
```

### 2. 租户上下文

```tsx
// contexts/TenantContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react'

interface TenantContextType {
  tenantId: string | null
  setTenantId: (id: string) => void
  hasPermission: (permission: string) => boolean
}

const TenantContext = createContext<TenantContextType | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])

  const hasPermission = (permission: string) => {
    return permissions.includes(permission)
  }

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId, hasPermission }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)!
```

### 3. 权限守卫组件

```tsx
// components/TenantPermissionGuard.tsx
import { useTenant } from '../contexts/TenantContext'

interface Props {
  permission: string
  children: React.ReactNode
}

export function TenantPermissionGuard({ permission, children }: Props) {
  const { hasPermission } = useTenant()

  if (!hasPermission(permission)) {
    return null
  }

  return <>{children}</>
}

// 使用示例
;<TenantPermissionGuard permission="tenant:member:invite">
  <button>邀请成员</button>
</TenantPermissionGuard>
```

## 六、数据库迁移

在测试之前，需要运行数据库迁移：

```bash
cd template
npm run db:migrate
```

或者使用 push 直接同步：

```bash
npm run db:push
```

## 七、测试流程清单

- [ ] 1. 启动开发服务器 `npm run dev`
- [ ] 2. 登录获取 token
- [ ] 3. 创建租户
- [ ] 4. 查看默认角色
- [ ] 5. 邀请成员
- [ ] 6. 查看邀请详情
- [ ] 7. 接受邀请
- [ ] 8. 查看成员列表
- [ ] 9. 创建自定义角色
- [ ] 10. 更新成员角色
- [ ] 11. 移除成员
- [ ] 12. 删除租户

## 八、常见问题

### Q1: 如何获取认证 token？

A: 使用现有的登录接口，登录成功后会返回 token。

### Q2: 邀请链接格式是什么？

A: `https://your-domain.com/invite/{token}`

### Q3: 如何判断用户在租户中的角色？

A: 调用 `/api/tenants/:tenantId/members` 获取成员列表，查看当前用户的 roleId。

### Q4: 系统角色可以删除吗？

A: 不可以，系统角色（isSystem: true）无法删除，只能编辑权限。

### Q5: 一个用户可以属于多个租户吗？

A: 可以，用户可以在多个租户中拥有不同的角色。
