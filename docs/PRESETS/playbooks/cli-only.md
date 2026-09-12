# CLI Only — Test Playbook

> 站点：
> 身份数：1
> 每个身份列出：操作步骤 → 验证 → 截图 → 选择器

---

## CLI 用户（唯一身份）

**凭据**: `通过 CLI 登录`

**案例数**: 2

### CLI 命令

**步骤**:

1. npm run cli -- --help
2. 运行 todos list 等命令

**验证**: 命令输出正常

### API 调用

**步骤**:

1. curl http://localhost:3010/api/todos

**验证**: API 返回 JSON 数据

---
