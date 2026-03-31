# Sandbox 完整解决方案

## 📊 调研总结

### 截图中的 11 个 Sandbox

| #   | Provider                   | Isolation           | 主要特点                  |
| --- | -------------------------- | ------------------- | ------------------------- |
| 1   | Vercel Sandbox             | Firecracker microVM | 已在你的技术栈中          |
| 2   | E2B                        | Firecracker microVM | AI Agent 最流行           |
| 3   | Upstash Box                | Node runtime        | Claude Code 内置          |
| 4   | Daytona                    | Docker/OCI          | 开源，持久化状态          |
| 5   | Fly.io Sprites             | Firecracker microVM | 100GB NVMe                |
| 6   | Modal                      | gVisor              | Python 优先，GPU 支持     |
| 7   | Cloudflare Dynamic Workers | V8 isolates         | 仅 JS/TS，比容器快 100 倍 |
| 8   | Blaxel                     | microVM             | 最快冷启动                |
| 9   | Northflank                 | Kata microVM        | BYOC，企业级              |
| 10  | Freestyle                  | KVM (full VM)       | 完全 root 访问            |
| 11  | Runloop                    | VM-based            | "Dev environment as API"  |

---

## 🚀 已在项目中的 Sandbox（立即可用）

### 1. @anthropic-ai/sandbox-runtime (v0.0.42)

#### 安装状态：✅ 已安装

**位置：** `template/src/server/module-agent/services/sandbox-bash.ts`

#### 快速测试

```bash
cd /Users/xuyingzhou/Project/create-biomimic-app/template

# 1. 测试简单命令
npx srt "echo 'Hello from Anthropic Sandbox!'"

# 2. 创建配置并测试网络
cat &gt; ~/.srt-settings.json &lt;&lt; 'EOF'
{
  "network": { "allowedDomains": ["example.com"], "deniedDomains": [] },
  "filesystem": { "allowWrite": [".", "/tmp"], "denyRead": ["~/.ssh"] }
}
EOF

# 3. 测试允许的网络
npx srt "curl -s -I https://example.com | head -n 1"

# 4. 测试被阻止的网络
npx srt "curl -s -I https://google.com --connect-timeout 3"
```

#### 作为库使用

项目中已有的集成代码：`template/src/server/module-agent/services/sandbox-bash.ts:1`

```typescript
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'

// 初始化
const config = {
  filesystem: { allowWrite: [workspacePath], denyRead: ['~/.ssh'] },
  network: { allowedDomains: ['example.com'] },
}
await SandboxManager.initialize(config)

// 包装命令
const wrapped = await SandboxManager.wrapWithSandbox('ls -la')
```

---

### 2. vm2 (v3.10.5)

#### 安装状态：✅ 已安装

**位置：** `template/package.json:88`

#### 快速测试

```bash
cd /Users/xuyingzhou/Project/create-biomimic-app/template

# 创建测试文件
cat &gt; test-vm2.js &lt;&lt; 'EOF'
const { NodeVM } = require('vm2');

const vm = new NodeVM({
  console: 'inherit',
  sandbox: { name: 'Test', multiply: (a,b) =&gt; a*b }
});

console.log('2 + 2 =', vm.run('2 + 2'));
console.log('Context:', vm.run('{greeting: "Hello, " + name, product: multiply(5,10)}'));
EOF

# 运行（注意：项目是 ES module，需要修改）
echo '测试文件已创建，请根据项目类型调整导入方式'
rm test-vm2.js
```

---

## 📦 可安装的 Sandbox

### 3. E2B

#### 安装

```bash
npm install @e2b/code-interpreter
# 或
npm install e2b
```

#### 基础用法

```javascript
import { Sandbox } from '@e2b/code-interpreter'

// 需要先设置: export E2B_API_KEY="your-key"
const sandbox = await Sandbox.create()
const execution = await sandbox.runCode('print("Hello!")')
console.log(execution.text)
await sandbox.close()
```

**获取 API Key：** https://e2b.dev

---

### 4. Cloudflare Workers

#### 安装

```bash
npm install -g wrangler
```

#### 基础用法

```bash
wrangler login
wrangler init my-worker
wrangler dev  # 本地开发
wrangler deploy  # 部署
```

---

## 🎯 推荐方案

### 当前项目最佳实践

**继续使用现有的架构：**

1. **@anthropic-ai/sandbox-runtime** - 用于 bash 命令和系统操作（已完善集成）
2. **vm2** - 用于 JavaScript 代码执行（按需启用）

### 扩展建议

如需更多功能，可考虑：

| 场景            | 推荐 Sandbox                  |
| --------------- | ----------------------------- |
| AI Agent 云沙箱 | E2B                           |
| 边缘计算        | Cloudflare Workers            |
| 本地开发        | @anthropic-ai/sandbox-runtime |
| JS 代码执行     | vm2                           |

---

## 📝 文档文件

- `sandbox-demo.md` - 详细安装和用法演示
- `SANDBOX_SOLUTION.md` (本文件) - 完整解决方案
