export const noInlineSchema = {
  meta: {
    type: 'problem',
    docs: {
      description:
        '禁止在路由文件的 responses 中直接定义 Zod schema，应放在 shared/modules 或 shared/schemas',
      recommended: true,
    },
    messages: {
      noInlineResponseSchema:
        '禁止在 responses 中直接定义 Zod schema。\n' +
        'Schema 应定义在: src/shared/modules/{module}/schemas.ts\n' +
        '或: src/shared/schemas/index.ts\n' +
        '然后通过 import 使用。',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename?.() || ''

    const isRouteFile =
      /module-.*\/routes\/.*\.ts$/.test(filename) && !filename.includes('__tests__')
    if (!isRouteFile) return {}

    const COMPLEX_SCHEMA_METHODS = [
      'object',
      'array',
      'enum',
      'union',
      'intersection',
      'record',
      'map',
      'tuple',
    ]

    function isZodSchemaCall(node) {
      if (node.type !== 'CallExpression') return false
      const { callee } = node

      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'z' &&
        callee.property.type === 'Identifier'
      ) {
        return COMPLEX_SCHEMA_METHODS.includes(callee.property.name)
      }

      if (callee.type === 'Identifier' && callee.name === 'z') {
        return true
      }

      return false
    }

    function isInResponses(node) {
      let current = node.parent
      while (current) {
        if (
          current.type === 'Property' &&
          current.key?.type === 'Identifier' &&
          current.key.name === 'responses'
        ) {
          return true
        }
        if (
          current.type === 'Property' &&
          current.key?.type === 'Identifier' &&
          (current.key.name === 'request' ||
            current.key.name === 'params' ||
            current.key.name === 'query')
        ) {
          return false
        }
        current = current.parent
      }
      return false
    }

    return {
      CallExpression(node) {
        if (!isZodSchemaCall(node)) return
        if (!isInResponses(node)) return

        context.report({
          node,
          messageId: 'noInlineResponseSchema',
        })
      },
    }
  },
}

export default noInlineSchema
