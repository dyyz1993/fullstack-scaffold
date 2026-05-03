/**
 * @framework-baseline eslint-rules-no-lazy-in-schemas
 */

/**
 * 禁止在 shared modules 的 schemas.ts 中使用 z.lazy()
 *
 * 原因：z.lazy() 在 Zod v4 中与 @asteasolutions/zod-to-openapi 不兼容
 * 会导致 "Maximum call stack size exceeded" 错误
 *
 * 解决方案：使用 z.array(z.any()) 替代递归结构，或将 schema 定义在单独文件中
 */

export const noLazyInSchemas = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止在 schemas.ts 中使用 z.lazy()，这会与 zod-to-openapi 造成兼容性问题',
      recommended: true,
    },
    messages: {
      noLazyInSchemas:
        '🚫 禁止在 schemas.ts 中使用 z.lazy()！\n\n' +
        '原因：z.lazy() 在 Zod v4 中与 @asteasolutions/zod-to-openapi 不兼容，\n' +
        '会导致 "Maximum call stack size exceeded" 错误。\n\n' +
        '📖 正确做法：\n' +
        '1. 使用 z.array(z.any()) 替代递归的 children 字段\n' +
        '2. 如果必须使用递归，考虑在运行时验证，而非 schema 层面\n\n' +
        '💡 示例：\n' +
        '// ❌ 错误\n' +
        'children: z.lazy(() => z.array(FileNodeSchema)).nullish()\n\n' +
        '// ✅ 正确\n' +
        'children: z.array(z.any()).nullish()',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename()

    if (!filename.endsWith('schemas.ts')) {
      return {}
    }

    function checkNode(node) {
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'z' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'lazy'
      ) {
        context.report({
          node,
          messageId: 'noLazyInSchemas',
        })
      }
    }

    return {
      CallExpression: checkNode,
    }
  },
}

export default noLazyInSchemas
