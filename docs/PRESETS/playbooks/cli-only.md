# CLI Only — Test Playbook

> 站点：
> 身份数：1
> 每个身份列出：操作步骤 → 验证 → 截图 → 选择器

---

## CLI 用户（唯一身份）

**凭据**: `通过 CLI 登录`

**案例数**: 8

### CLI 命令

**步骤**:

1. npm run cli -- --help
2. 运行 todos list 等命令

**验证**: 命令输出正常

**截图**: ![CLI 命令](../screenshots/matrix/cli-only/cli-01-commands.txt)

### API 调用

**步骤**:

1. curl http://localhost:3010/api/todos

**验证**: API 返回 JSON 数据

**截图**: ![API 调用](../screenshots/matrix/cli-only/cli-02-api-call.txt)

### 未知命令报错（逆向）

**步骤**:

1. npm run cli -- not-a-real-command

**验证**: 输出未知命令错误与用法提示，非静默成功

**截图**: ![未知命令报错（逆向）](../screenshots/matrix/cli-only/cli-03-unknown-command.txt)

### 访问不存在 API（逆向）

**步骤**:

1. curl http://localhost:3010/api/not-exist

**验证**: 返回 404，不泄露堆栈

**截图**: ![访问不存在 API（逆向）](../screenshots/matrix/cli-only/cli-04-api-not-exist.txt)

### todos add→list→delete CLI 闭环（正向链）

**步骤**:

1. npm run cli -- todos add "qa-e2e-chain-item"
2. npm run cli -- todos list
3. npm run cli -- todos delete <id>

**验证**: list 输出包含新条目，删除后再 list 不再出现

**截图**: ![todos add→list→delete CLI 闭环（正向链）](../screenshots/matrix/cli-only/cli-05-loop.txt)

### CLI help 探测（正向）

**步骤**:

1. npm run cli -- --help
2. npm run cli -- todos --help

**验证**: 两级用法输出完整（命令列表与子命令说明），退出码 0

**截图**: ![CLI help 探测（正向）](../screenshots/matrix/cli-only/cli-06-help-probe.txt)

### 伪造 Bearer token 调写接口（逆向）

**步骤**:

1. curl -X POST -H "Authorization: Bearer fake-token123" http://localhost:3010/api/todos

**验证**: 返回 401，不产生任何待办数据

**截图**: ![伪造 Bearer token 调写接口（逆向）](../screenshots/matrix/cli-only/cli-07-fake-token.txt)

### API 非法 payload 批量探测（逆向）

**步骤**:

1. POST /api/todos 依次提交三种 payload：空标题 {"title":""}、超长 256+ 字符标题、<script>alert(1)</script> 注入标题

**验证**: 每个 payload 均被 400/422 拒绝（或记录转义存储行为），绝不 500 不崩溃

**截图**: ![API 非法 payload 批量探测（逆向）](../screenshots/matrix/cli-only/cli-08-payloads.txt)

---
