/**
 * 自定义 ESLint 规则：禁止对 apiClient 使用 `as any` 类型断言
 *
 * apiClient 是类型安全的 API 客户端，使用 `as any` 会破坏类型安全。
 * 如果类型定义有问题，应该修复类型定义而不是使用 `as any`。
 *
 * 错误示例:
 *   (apiClient.api.admin as any).permissions.roles.$get()  // ❌ 禁止
 *   apiClient.api.admin.permissions.me.$get() as any       // ❌ 禁止
 *   const client = apiClient as any                         // ❌ 禁止
 *
 * 正确示例:
 *   apiClient.api.admin.permissions.roles.$get()           // ✅ 类型安全
 *   // 如果类型有问题，修复类型定义或添加正确的类型
 */

export const noAnyOnApiclient = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow `as any` type assertion on apiClient - breaks type safety',
      recommended: true,
    },
    messages: {
      noAnyOnApiclient:
        'Using `as any` on apiClient is strictly forbidden. ' +
        'apiClient provides type-safe API access. ' +
        'If types are incorrect, fix the schema/type definitions instead of using `as any`. ' +
        'Using `as any` defeats the entire purpose of type-safe RPC.',
      noAnyOnApiclientProperty:
        'Using `as any` on apiClient properties is strictly forbidden. ' +
        'If the route/endpoint is not typed correctly, add proper type definitions in the route file.',
    },
    schema: [],
  },
  create(context) {
    function isApiClientReference(node) {
      if (!node) return false

      if (node.type === 'Identifier') {
        return node.name === 'apiClient'
      }

      if (node.type === 'MemberExpression') {
        const obj = node.object
        if (obj.type === 'Identifier' && obj.name === 'apiClient') {
          return true
        }
        if (obj.type === 'MemberExpression') {
          return isApiClientReference(obj)
        }
      }

      return false
    }

    function checkTSAsExpression(node) {
      if (node.type !== 'TSAsExpression') return false

      const typeAnnotation = node.typeAnnotation
      if (!typeAnnotation) return false

      if (typeAnnotation.type === 'TSAnyKeyword') {
        return true
      }

      if (typeAnnotation.type === 'TSTypeReference') {
        const typeName = typeAnnotation.typeName
        if (typeName && typeName.type === 'Identifier' && typeName.name === 'any') {
          return true
        }
      }

      return false
    }

    return {
      TSAsExpression(node) {
        if (!checkTSAsExpression(node)) return

        const expression = node.expression

        if (isApiClientReference(expression)) {
          context.report({
            node,
            messageId: 'noAnyOnApiclient',
          })
          return
        }

        if (expression.type === 'MemberExpression' && isApiClientReference(expression)) {
          context.report({
            node,
            messageId: 'noAnyOnApiclientProperty',
          })
        }
      },

      CallExpression(node) {
        if (!node.callee) return

        let current = node.callee
        while (current) {
          if (current.type === 'TSAsExpression') {
            if (checkTSAsExpression(current) && isApiClientReference(current.expression)) {
              context.report({
                node: current,
                messageId: 'noAnyOnApiclient',
              })
              return
            }
          }

          if (current.type === 'MemberExpression') {
            current = current.object
          } else if (current.type === 'CallExpression') {
            current = current.callee
          } else {
            break
          }
        }
      },
    }
  },
}

export default noAnyOnApiclient
