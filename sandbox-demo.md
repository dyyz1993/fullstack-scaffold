# Sandbox 安装与基础用法演示

## 目录

1. [已在项目中的 Sandbox](#已在项目中的-sandbox)
   - [1. @anthropic-ai/sandbox-runtime](#1-anthropic-aisandbox-runtime)
   - [2. vm2](#2-vm2)
2. [可安装测试的 Sandbox](#可安装测试的-sandbox)
   - [3. E2B](#3-e2b)
   - [4. Cloudflare Workers Sandbox](#4-cloudflare-workers-sandbox)

---

## 已在项目中的 Sandbox

### 1. @anthropic-ai/sandbox-runtime

#### 安装状态：✅ 已安装在项目中

**当前版本：** v0.0.42

#### 基础用法

##### 方式一：CLI 使用 (srt 命令)

```bash
# 创建配置文件
cat &gt; ~/.srt-settings.json &lt;&lt; 'EOF'
{
  "network": {
    "allowedDomains": ["example.com"],
    "deniedDomains": []
  },
  "filesystem": {
    "denyRead": ["~/.ssh"],
    "allowWrite": [".", "/tmp"],
    "denyWrite": [".env"]
  }
}
EOF

# 运行简单命令
npx srt "echo 'Hello from Sandbox!'"

# 测试网络访问（允许的域名）
npx srt "curl -s https://example.com"

# 测试网络访问（被阻止的域名）
npx srt "curl -s https://google.com"
```

##### 方式二：作为库使用

```typescript
// sandbox-demo-anthropic.ts
import { SandboxManager, type SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime'
import { spawn } from 'child_process'

async function demo() {
  const config: SandboxRuntimeConfig = {
    filesystem: {
      denyRead: ['~/.ssh'],
      allowRead: [],
      allowWrite: ['.', '/tmp'],
      denyWrite: ['.env'],
    },
    network: {
      allowedDomains: ['example.com'],
      deniedDomains: [],
    },
  }

  await SandboxManager.initialize(config)

  const command = await SandboxManager.wrapWithSandbox('echo "Hello, World!"')
  const child = spawn(command, { shell: true, stdio: 'inherit' })

  child.on('exit', async () =&gt; {
    await SandboxManager.reset()
  })
}

demo()
```

**运行：**

```bash
cd template
npx tsx sandbox-demo-anthropic.ts
```

---

### 2. vm2

#### 安装状态：✅ 已安装在项目中

**当前版本：** v3.10.5

#### 基础用法

```typescript
// sandbox-demo-vm2.ts
import { NodeVM, VMScript } from 'vm2'

console.log('=== vm2 Sandbox Demo ===\n')

// 1. 基础用法
console.log('1. 简单代码执行：')
const vm = new NodeVM({
  console: 'inherit',
  sandbox: {},
  require: {
    external: false,
    builtin: ['path'],
  },
})

const result = vm.run('2 + 2', 'vm.js')
console.log(`   2 + 2 = ${result}\n`)

// 2. 带沙箱上下文
console.log('2. 带沙箱上下文：')
const vmWithContext = new NodeVM({
  console: 'inherit',
  sandbox: {
    name: 'Test User',
    multiply: (a: number, b: number) =&gt; a * b,
  },
})

const contextResult = vmWithContext.run(`
  const greeting = "Hello, " + name;
  const product = multiply(5, 10);
  { greeting, product };
`, 'vm.js')
console.log(`   结果: ${JSON.stringify(contextResult)}\n`)

// 3. 安全限制测试
console.log('3. 安全限制测试：')
try {
  vm.run('require("fs")', 'vm.js')
  console.log('   ⚠️  可能存在安全漏洞！')
} catch (err) {
  console.log(`   ✅ 安全限制正常: ${(err as Error).message}`)
}
```

**运行：**

```bash
cd template
npx tsx sandbox-demo-vm2.ts
```

---

## 可安装测试的 Sandbox

### 3. E2B

#### 安装

```bash
# JavaScript/TypeScript SDK
npm install @e2b/code-interpreter

# 或完整 SDK
npm install e2b
```

#### 基础用法

```typescript
// sandbox-demo-e2b.ts
import { Sandbox } from '@e2b/code-interpreter'

async function demoE2B() {
  console.log('=== E2B Sandbox Demo ===\n')

  // 需要先设置 E2B_API_KEY 环境变量
  // export E2B_API_KEY="your-api-key-here"

  try {
    // 创建沙箱
    console.log('1. 创建沙箱...')
    const sandbox = await Sandbox.create()
    console.log('   ✅ 沙箱创建成功\n')

    // 执行代码
    console.log('2. 执行 Python 代码...')
    const execution = await sandbox.runCode('print("Hello from E2B!")')
    console.log(`   输出: ${execution.text}\n`)

    // 关闭沙箱
    console.log('3. 关闭沙箱...')
    await sandbox.close()
    console.log('   ✅ 沙箱已关闭')
  } catch (err) {
    console.log('❌ 需要 E2B API Key 才能运行此演示')
    console.log('获取 API Key: https://e2b.dev')
  }
}

demoE2B()
```

**获取 API Key：** 访问 https://e2b.dev 注册获取

---

### 4. Cloudflare Workers Sandbox

#### 安装

```bash
# 本地测试工具
npm install -g cloudflare-workers-sandbox

# 或使用 wrangler (官方 CLI)
npm install -g wrangler
```

#### 基础用法

##### 使用 wrangler (推荐)

```bash
# 1. 登录 Cloudflare
wrangler login

# 2. 创建新项目
wrangler init my-worker

# 3. 编写 Worker 代码
cat &gt; src/index.ts &lt;&lt; 'EOF'
export default {
  async fetch(request: Request): Promise&lt;Response&gt; {
    return new Response('Hello from Cloudflare Workers!', {
      headers: { 'content-type': 'text/plain' },
    })
  },
}
EOF

# 4. 本地开发
wrangler dev

# 5. 部署
wrangler deploy
```

##### 使用 cloudflare-workers-sandbox

```javascript
// sandbox-demo-cf-worker.js
const { createSandbox } = require('cloudflare-workers-sandbox')

async function demoCFWorker() {
  console.log('=== Cloudflare Workers Sandbox Demo ===\n')

  const sandbox = createSandbox()

  // 定义 Worker
  const workerCode = `
    addEventListener('fetch', event =&gt; {
      event.respondWith(handleRequest(event.request))
    })

    async function handleRequest(request) {
      return new Response('Hello from CF Worker Sandbox!', {
        headers: { 'content-type': 'text/plain' }
      })
    }
  `

  // 在沙箱中运行
  sandbox.evaluate(workerCode)

  // 模拟请求
  const response = await sandbox.dispatchFetch('http://localhost/')
  const text = await response.text()
  console.log('响应:', text)
}

demoCFWorker()
```

---

## 快速开始指南

### 在当前项目中测试已有的 Sandbox

```bash
# 进入 template 目录
cd /Users/xuyingzhou/Project/create-biomimic-app/template

# 1. 测试 @anthropic-ai/sandbox-runtime CLI
npx srt "echo 'Testing anthropic sandbox!'"

# 2. 创建 vm2 测试文件并运行
cat &gt; test-vm2.ts &lt;&lt; 'EOF'
import { NodeVM } from 'vm2'
const vm = new NodeVM({ console: 'inherit' })
vm.run('console.log("Hello from vm2!")')
EOF
npx tsx test-vm2.ts
rm test-vm2.ts
```

---

## 总结

| Sandbox                       | 安装难度  | 需要 API Key | 本地可测试 | 推荐场景            |
| ----------------------------- | --------- | ------------ | ---------- | ------------------- |
| @anthropic-ai/sandbox-runtime | ⭐ 简单   | ❌ 不需要    | ✅ 是      | 本地 AI Agent 开发  |
| vm2                           | ⭐ 简单   | ❌ 不需要    | ✅ 是      | JavaScript 代码执行 |
| E2B                           | ⭐⭐ 中等 | ✅ 需要      | ⚠️ 部分    | AI Agent 云沙箱     |
| Cloudflare Workers            | ⭐⭐ 中等 | ✅ 需要      | ✅ 是      | 边缘计算            |
