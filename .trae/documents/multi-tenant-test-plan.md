# 多租户功能测试计划

## 当前状态

### ✅ 已完成
- **后端租户模块**：路由、服务、测试都已实现
- **数据库 Schema**：tenants, tenant_roles, tenant_members, tenant_invitations 表已定义
- **前端租户功能**：TenantPage、tenantStore、tenantApi 已实现
- **路由注册**：tenantRoutes 已注册到 clientApiRoutes 和 adminApiRoutes

### 测试步骤

## 1. 数据库准备
```bash
# 推送数据库 schema 到数据库
npm run db:push
```

## 2. 启动开发服务器
```bash
npm run dev
```

## 3. 功能测试清单

### 3.1 租户管理
- [ ] 访问 `/tenants` 页面
- [ ] 创建新租户（填写名称、标识、套餐）
- [ ] 查看租户列表
- [ ] 切换当前租户

### 3.2 成员管理
- [ ] 查看成员列表
- [ ] 邀请新成员（填写邮箱、选择角色）
- [ ] 复制邀请链接

### 3.3 角色管理
- [ ] 查看角色列表
- [ ] 查看系统默认角色（管理员、成员、访客）
- [ ] 查看角色权限

### 3.4 租户设置
- [ ] 查看租户基本信息
- [ ] 查看套餐和状态

## 4. API 测试（可选）

使用 curl 或 Postman 测试 API 端点：

```bash
# 获取租户列表（需要认证 token）
curl -H "Authorization: Bearer <token>" http://localhost:5173/api/tenants

# 创建租户
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试公司","slug":"test-company","plan":"free"}' \
  http://localhost:5173/api/tenants
```

## 5. 注意事项

1. **认证要求**：所有租户 API 都需要用户认证（除了获取邀请详情）
2. **数据库**：确保 MySQL 数据库已启动并可连接
3. **环境变量**：检查 `.env` 文件中的数据库配置

## 预期结果

- 租户页面正常加载
- 可以创建租户并自动成为管理员
- 可以看到系统默认创建的角色（管理员、成员、访客）
- 可以邀请成员并生成邀请链接
