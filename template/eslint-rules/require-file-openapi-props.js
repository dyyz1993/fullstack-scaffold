/**
 * @framework-baseline 0956d31f0680e2f0
 */

/**
 * 要求文件类型字段使用 z.any().openapi({ type: 'string', format: 'binary' })
 *
 * 注意：z.file() 已被 no-zod-file-type 规则禁止（与 zod-to-openapi 不兼容）
 * 本规则确保文件字段使用正确的 z.any() + openapi 替代方案
 */

export const requireFileOpenapiProps = {
  meta: {
    type: 'problem',
    docs: {
      description: '文件类型字段必须使用 z.any().openapi({ type: "string", format: "binary" })',
      recommended: true,
    },
    messages: {
      requireFileOpenapiProps:
        '🚫 文件类型字段必须使用 z.any().openapi() 并指定 type 和 format！\n\n' +
        '注意：z.file() 已被禁止（与 zod-to-openapi 不兼容）\n\n' +
        '📖 正确示例：\n' +
        '   file: z.any().openapi({ type: "string", format: "binary" })\n\n' +
        '💡 修复建议：\n' +
        '   使用 z.any().openapi({ type: "string", format: "binary" }) 替代 z.file()',
      missingTypeOrFormat:
        '🚫 z.any().openapi() 必须包含 type 和 format 属性！\n\n' +
        '📖 正确示例：\n' +
        '   file: z.any().openapi({ type: "string", format: "binary" })\n\n' +
        '💡 修复建议：\n' +
        '   确保 openapi 配置对象中包含 type: "string" 和 format: "binary"',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename?.() || ''

    const isSchemaFile = filename.includes('/shared/modules/') && filename.includes('/schemas.ts')
    if (!isSchemaFile) {
      return {}
    }

    return {
      CallExpression(node) {
        if (
          node.callee?.type !== 'MemberExpression' ||
          node.callee.object?.type !== 'Identifier' ||
          node.callee.object.name !== 'z' ||
          node.callee.property?.type !== 'Identifier' ||
          node.callee.property.name !== 'any'
        ) {
          return
        }

        let currentNode = node.parent
        let hasOpenapiCall = false
        let openapiConfigNode = null

        while (currentNode) {
          if (
            currentNode.type === 'CallExpression' &&
            currentNode.callee?.type === 'MemberExpression' &&
            currentNode.callee.property?.type === 'Identifier' &&
            currentNode.callee.property.name === 'openapi'
          ) {
            hasOpenapiCall = true
            openapiConfigNode = currentNode.arguments[0]
            break
          }

          if (
            currentNode.type === 'CallExpression' &&
            currentNode.callee?.type === 'MemberExpression'
          ) {
            currentNode = currentNode.parent
          } else {
            break
          }
        }

        if (!hasOpenapiCall) {
          return
        }

        const config = openapiConfigNode
        if (config && config.type === 'ObjectExpression') {
          const hasType =
            config.type === 'ObjectExpression' &&
            config.properties.some(
              prop =>
                prop.type === 'Property' &&
                prop.key?.type === 'Identifier' &&
                prop.key.name === 'type'
            )
          const hasFormat =
            config.type === 'ObjectExpression' &&
            config.properties.some(
              prop =>
                prop.type === 'Property' &&
                prop.key?.type === 'Identifier' &&
                prop.key.name === 'format'
            )

          if (!hasType || !hasFormat) {
            context.report({
              node: openapiConfigNode,
              messageId: 'missingTypeOrFormat',
            })
            return
          }

          const typeProp = config.properties.find(
            prop =>
              prop.type === 'Property' &&
              prop.key?.type === 'Identifier' &&
              prop.key.name === 'type'
          )
          const formatProp = config.properties.find(
            prop =>
              prop.type === 'Property' &&
              prop.key?.type === 'Identifier' &&
              prop.key.name === 'format'
          )

          const isFileType =
            typeProp?.value?.type === 'Literal' &&
            typeProp.value.value === 'string' &&
            formatProp?.value?.type === 'Literal' &&
            formatProp.value.value === 'binary'

          if (!isFileType) {
            return
          }

          let parent = node.parent
          let chainDepth = 0
          while (parent && chainDepth < 3) {
            if (parent.type === 'Property' && parent.key?.type === 'Identifier') {
              return
            }
            parent = parent.parent
            chainDepth++
          }
        }
      },
    }
  },
}

export default requireFileOpenapiProps
