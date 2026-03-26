/**
 * @framework-baseline eslint-rules-no-zod-v4-file-type
 */

/**
 * 禁止在 schema 中使用 z.file()
 *
 * 原因：z.file() 是 Zod v4 的新特性，但与当前版本的 @asteasolutions/zod-to-openapi 不兼容
 * 会导致 "Unknown zod object type" 或 "z.file is not a function" 错误
 *
 * 解决方案：使用 z.any().openapi({ type: 'string', format: 'binary' }) 替代
 */

export const noZodFileType = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止在 schema 中使用 z.file()，Zod v4 特有但与 zod-to-openapi 不兼容',
      recommended: true,
    },
    messages: {
      noZodFileType:
        '🚫 禁止使用 z.file()！\n\n' +
        '原因：z.file() 是 Zod v4 的新特性，但与当前版本的 @asteasolutions/zod-to-openapi 不兼容。\n\n' +
        '📖 正确做法：\n' +
        '使用 z.any().openapi({ type: "string", format: "binary" }) 替代\n\n' +
        '💡 示例：\n' +
        '// ❌ 错误\n' +
        'file: z.file().openapi({ type: "string", format: "binary" })\n\n' +
        '// ✅ 正确\n' +
        'file: z.any().openapi({ type: "string", format: "binary" })',
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
        node.callee.property.name === 'file'
      ) {
        context.report({
          node,
          messageId: 'noZodFileType',
        })
      }
    }

    return {
      CallExpression: checkNode,
    }
  },
}

export default noZodFileType
