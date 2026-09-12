# Minimal — 极简单模块

> 只有 todos 一个业务模块的极简形态。

- **在线演示**：https://minimal.lpm1.top
- **模块数**：1
- **身份数**：1
- **文档**: [GitHub](https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/minimal.md)

## 界面速览

![minimal-home](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/minimal-home.png)

## 适用 / 不适用

- **适用**：验证部署链路；作为从零学习模板结构的起点。
- **不适用**：任何真实业务。

## 用户角色与权限（1 种身份）

### 游客（未登录）

可直接操作 todos（无认证模块）
**凭据**: `无需登录`

**能做**:

- ✓ 浏览 todos 列表
- ✓ 新增/修改/删除 todos

**不能做**:

- ✗ —（此形态无认证/权限模块）

## 模块清单

| 模块    | 职责                                           |
| ------- | ---------------------------------------------- |
| `todos` | Todo CRUD with file attachments and CSV export |

## API 面

**todos**（5 条）：

- `OPENAPI /todos`
- `OPENAPI /todos/{id}`
- `OPENAPI /todos/{id}/attachments`
- `OPENAPI /todos/{id}/with-attachments`
- `OPENAPI /todos/{todoId}/attachments/{attachmentId}`

## 验证清单

- `curl https://minimal.lpm1.top/health` → 200
- GET /api/todos → 200

> 由 `scripts/generate-preset-docs.ts` 生成。
