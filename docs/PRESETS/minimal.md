# Minimal — 极简单模块

> 只有 todos 一个业务模块的极简形态，脚手架的最小可用子集。

- **在线演示**：https://minimal.lpm1.top
- **模块数**：1
- **官方文档**：https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/minimal.md

## 界面速览

![minimal-home](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/minimal-home.png)

## 适用 / 不适用

- **适用**：验证部署链路；作为从零学习模板结构的起点。
- **不适用**：任何真实业务（它就是最小骨架）。

## 模块清单

| 模块    | 职责                                           |
| ------- | ---------------------------------------------- |
| `todos` | Todo CRUD with file attachments and CSV export |

## API 面

**todos**（9 条）：

- `OPENAPI /todos`
- `OPENAPI /todos/{id}`
- `OPENAPI /todos`
- `OPENAPI /todos/{id}`
- `OPENAPI /todos/{id}`
- `OPENAPI /todos/{id}/attachments`
- `OPENAPI /todos/{id}/attachments`
- `OPENAPI /todos/{id}/with-attachments`
- `OPENAPI /todos/{todoId}/attachments/{attachmentId}`

## 验证清单（部署后逐条执行）

- `curl https://minimal.lpm1.top/health` → 200 `{"status":"ok"}`
- GET /api/todos → 200 种子数据
- 登录凭据（如适用）：`superadmin / 123456`（admin mock）；saas 控制台 `superadmin / admin123`

> 本文档由 `scripts/generate-preset-docs.ts` 生成——结构化部分来自模块清单，改动模块后请重新生成。
