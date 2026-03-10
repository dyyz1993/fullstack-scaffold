/**
 * ESLint 规则：强制在 OpenAPI 路由中使用正确的 c.req.valid() 方法
 *
 * 根据 route definition 中的 request schema 自动推导应该使用的 valid 方法：
 * - request.body -> c.req.valid('json') 或 c.req.valid('body')
 * - request.query -> c.req.valid('query')
 * - request.params -> c.req.valid('param')
 * - request.headers -> c.req.valid('header')
 * - request.cookies -> c.req.valid('cookie')
 *
 * 同时禁止使用原始方法：c.req.json(), c.req.query(), c.req.param(), c.req.header()
 */

export const enforceValidMethod = {
  meta: {
    type: 'problem',
    docs: {
      description:
        '强制在 OpenAPI 路由 handler 中使用 c.req.valid() 获取校验后的参数，禁止使用原始方法',
      recommended: true,
    },
    messages: {
      useValidMethod:
        "路由定义了 {{schemaType}}，请使用 c.req.valid('{{validMethod}}') 获取校验后的参数。\n" +
        '原始方法 c.req.{{originalMethod}}() 不会进行 Zod 校验，也无法获得类型推断。',
      missingValidCall:
        "路由定义了 {{schemaType}}，但 handler 中未调用 c.req.valid('{{validMethod}}')。",
      forbiddenRawMethod:
        '在 OpenAPI 路由中禁止使用 c.req.{{method}}()。\n' +
        '请根据路由定义使用对应的 c.req.valid() 方法：\n' +
        "  - body -> c.req.valid('json') 或 c.req.valid('body')\n" +
        "  - query -> c.req.valid('query')\n" +
        "  - params -> c.req.valid('param')\n" +
        "  - headers -> c.req.valid('header')\n" +
        "  - cookies -> c.req.valid('cookie')",
      unusedSchema:
        "路由定义了 {{schemaType}}，但 handler 中未使用 c.req.valid('{{validMethod}}') 获取数据。",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename?.() || ''
    const isRouteFile =
      /module-.*\/routes\/.*\.ts$/.test(filename) && !filename.includes('__tests__')
    if (!isRouteFile) return {}

    const routeDefinitions = new Map()
    const VALID_METHOD_MAP = {
      body: ['json', 'body'],
      query: ['query'],
      params: ['param'],
      headers: ['header'],
      cookies: ['cookie'],
    }

    const SCHEMA_TYPE_NAMES = {
      body: 'request.body',
      query: 'request.query',
      params: 'request.params',
      headers: 'request.headers',
      cookies: 'request.cookies',
    }

    function extractRequestSchemas(routeNode) {
      const schemas = new Set()

      if (!routeNode || routeNode.type !== 'ObjectExpression') return schemas

      const requestProp = routeNode.properties.find(
        p => p.key?.type === 'Identifier' && p.key.name === 'request'
      )

      if (!requestProp || requestProp.value?.type !== 'ObjectExpression') return schemas

      for (const prop of requestProp.value.properties) {
        if (prop.key?.type === 'Identifier') {
          const key = prop.key.name
          if (['body', 'query', 'params', 'headers', 'cookies'].includes(key)) {
            schemas.add(key)
          }
        }
      }

      return schemas
    }

    function getRouteVariableName(node) {
      if (node.type === 'Identifier') {
        return node.name
      }
      return null
    }

    return {
      CallExpression(node) {
        if (
          node.callee?.type === 'Identifier' &&
          node.callee.name === 'createRoute' &&
          node.arguments.length > 0 &&
          node.parent?.type === 'VariableDeclarator'
        ) {
          const routeName = node.parent.id?.name
          if (routeName) {
            const schemas = extractRequestSchemas(node.arguments[0])
            if (schemas.size > 0) {
              routeDefinitions.set(routeName, schemas)
            }
          }
        }
      },

      CallExpression(node) {
        if (
          node.callee?.type !== 'MemberExpression' ||
          node.callee.property?.name !== 'openapi' ||
          node.arguments.length < 2
        ) {
          return
        }

        const routeArg = node.arguments[0]
        const handlerArg = node.arguments[1]

        let schemas = new Set()

        if (routeArg.type === 'Identifier') {
          schemas = routeDefinitions.get(routeArg.name) || new Set()
        } else if (routeArg.type === 'ObjectExpression') {
          schemas = extractRequestSchemas(routeArg)
        }

        if (schemas.size === 0) return

        const handlerText = context.sourceCode.getText(handlerArg)
        const usedValidMethods = new Set()
        const validMethodRegex = /c\.req\.valid\s*\(\s*['"](\w+)['"]\s*\)/g
        let match
        while ((match = validMethodRegex.exec(handlerText)) !== null) {
          usedValidMethods.add(match[1])
        }

        const rawMethodRegex = /c\.req\.(json|query|param|header|cookie)\s*\(/g
        const rawMethodsUsed = new Set()
        while ((match = rawMethodRegex.exec(handlerText)) !== null) {
          rawMethodsUsed.add(match[1])
        }

        if (rawMethodsUsed.size > 0) {
          for (const method of rawMethodsUsed) {
            context.report({
              node: handlerArg,
              messageId: 'forbiddenRawMethod',
              data: { method },
            })
          }
          return
        }

        for (const schema of schemas) {
          const validMethods = VALID_METHOD_MAP[schema] || []
          const isUsed = validMethods.some(m => usedValidMethods.has(m))

          if (!isUsed) {
            context.report({
              node: handlerArg,
              messageId: 'unusedSchema',
              data: {
                schemaType: SCHEMA_TYPE_NAMES[schema],
                validMethod: validMethods[0],
              },
            })
          }
        }
      },
    }
  },
}

export default enforceValidMethod
