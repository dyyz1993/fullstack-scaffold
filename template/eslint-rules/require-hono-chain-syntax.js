/**
 * 自定义 ESLint 规则：强制 Hono OpenAPIHono 使用链式语法
 *
 * 非链式写法会导致 Hono RPC 类型推断丢失
 */

export const requireHonoChainSyntax = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require chain syntax for OpenAPIHono to preserve Hono RPC type inference',
      recommended: true,
    },
    messages: {
      nonChainSyntax:
        'OpenAPIHono must use chain syntax. Non-chain syntax breaks Hono RPC type inference.\n' +
        'Use: export const routes = new OpenAPIHono()\n  .openapi(route1, handler1)\n  .openapi(route2, handler2)',
      standaloneOpenapiCall:
        'Standalone .openapi() call detected. Chain all .openapi() calls directly after new OpenAPIHono().\n' +
        'This ensures proper type inference for Hono RPC client.',
    },
    schema: [],
  },
  create(context) {
    const openAPIHonoVariables = new Set()

    return {
      VariableDeclarator(node) {
        if (
          node.init &&
          node.init.type === 'NewExpression' &&
          node.init.callee &&
          node.init.callee.name === 'OpenAPIHono'
        ) {
          if (node.id && node.id.type === 'Identifier') {
            const isChained =
              node.parent.parent.type === 'ExportNamedDeclaration' ||
              (node.init.arguments.length === 0 &&
                context.sourceCode.getText(node).includes('new OpenAPIHono()\n'))

            const fullText = context.sourceCode.getText(node.parent)
            const hasNextCall = /\)\s*\.\s*(openapi|doc|get|post|put|delete|patch)/.test(
              fullText.substring(fullText.indexOf(')'))
            )

            if (!hasNextCall && node.parent.parent.type !== 'ExportNamedDeclaration') {
              openAPIHonoVariables.add(node.id.name)
              context.report({
                node,
                messageId: 'nonChainSyntax',
              })
            }
          }
        }
      },
      CallExpression(node) {
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.type === 'Identifier' &&
          openAPIHonoVariables.has(node.callee.object.name) &&
          node.callee.property &&
          node.callee.property.name === 'openapi'
        ) {
          context.report({
            node,
            messageId: 'standaloneOpenapiCall',
          })
        }
      },
    }
  },
}

export default requireHonoChainSyntax
