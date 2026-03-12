/**
 * 限制 routes 和 services 目录结构
 *
 * 规则：
 * 1. src/server/routes/ 和 src/server/services/ 目录下只允许直接放置文件
 * 2. 不允许创建子目录
 * 3. 文件命名必须以 -routes.ts 或 -service.ts 结尾
 *
 * 原因：
 * - 保持目录结构扁平，便于查找
 * - 模块化的路由和服务应该放在 module-* 目录下
 * - 避免过度嵌套导致导入路径过长
 *
 * 参考: .claude/rules/20-server-api.md
 */

export const flatRoutesServices = {
  meta: {
    type: 'problem',
    docs: {
      description: '限制 routes 和 services 目录结构为扁平结构',
      recommended: true,
    },
    messages: {
      noSubdirectory: `禁止在 routes/services 目录下创建子目录。

当前路径：{{filepath}}

routes/ 和 services/ 目录只允许直接放置文件，不允许创建子目录。

📋 规则文档: .claude/rules/20-server-api.md

🚀 快速创建模块:
  npm run create:module <name>    创建完整模块（路由+服务+测试）
  npm run create:route <name>     创建路由文件
  npm run create:service <name>   创建服务文件

示例：
❌ src/server/routes/admin/captcha-routes.ts
✅ src/server/routes/captcha-routes.ts
✅ src/server/module-admin/routes/admin-routes.ts
`,
      invalidFileName: `文件命名不符合规范。

当前文件：{{filename}}

routes/ 目录下的文件必须以 -routes.ts 结尾
services/ 目录下的文件必须以 -service.ts 结尾

📋 规则文档: .claude/rules/20-server-api.md

🚀 快速创建:
  npm run create:route <name>     创建路由文件
  npm run create:service <name>   创建服务文件

示例：
❌ src/server/routes/captcha.ts
✅ src/server/routes/captcha-routes.ts

❌ src/server/services/captcha.ts
✅ src/server/services/captcha-service.ts
`,
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename?.() || ''

    const isInRoutesDir = filename.includes('/server/routes/')
    const isInServicesDir = filename.includes('/server/services/')

    if (!isInRoutesDir && !isInServicesDir) return {}

    const relativePath = filename.split('/server/')[1] || ''

    const pathParts = relativePath.split('/')
    const isFlat = pathParts.length === 2

    if (!isFlat) {
      return {
        Program(node) {
          context.report({
            node,
            messageId: 'noSubdirectory',
            data: { filepath: filename },
          })
        },
      }
    }

    const fileName = pathParts[1]
    const isValidRouteName = fileName.endsWith('-routes.ts') || fileName.endsWith('-route.ts')
    const isValidServiceName = fileName.endsWith('-service.ts')

    if (isInRoutesDir && !isValidRouteName) {
      return {
        Program(node) {
          context.report({
            node,
            messageId: 'invalidFileName',
            data: { filename: fileName },
          })
        },
      }
    }

    if (isInServicesDir && !isValidServiceName) {
      return {
        Program(node) {
          context.report({
            node,
            messageId: 'invalidFileName',
            data: { filename: fileName },
          })
        },
      }
    }

    return {}
  },
}

export default flatRoutesServices
