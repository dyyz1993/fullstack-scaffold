# CLI Only — Test Playbook

> 站点：
> 身份数：1
> 每个身份列出：操作步骤 → 验证 → 截图 → 选择器

---

## CLI 用户（唯一身份）

**凭据**: `通过 CLI 登录`

**案例数**: 4

### CLI 命令

**步骤**:

1. npm run cli -- --help
2. 运行 todos list 等命令

**验证**: 命令输出正常

### API 调用

**步骤**:

1. curl http://localhost:3010/api/todos

**验证**: API 返回 JSON 数据

### 未知命令报错（逆向）

**步骤**:

1. npm run cli -- not-a-real-command

**验证**: 输出未知命令错误与用法提示，非静默成功

### 访问不存在 API（逆向）

**步骤**:

1. curl http://localhost:3010/api/not-exist

**验证**: 返回 404，不泄露堆栈

---
