/**
 * @framework-baseline c204885645f94186
 */

/**
 * Ensure all API routes have authentication middleware.
 * Checks createRoute calls for middleware with authMiddleware and security config.
 */

export const routeAuth = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure all API routes have authentication middleware',
      category: 'Security',
      recommended: true,
    },
    messages: {
      missingMiddleware:
        'Route "{{method}} {{path}}" is missing middleware configuration. Add middleware: [authMiddleware()]',
      missingAuth:
        'Route "{{method}} {{path}}" middleware does not include authMiddleware. Add authMiddleware() to middleware array',
      publicRouteWithAuth:
        'Public route "{{method}} {{path}}" should not have authentication middleware',
      missingSecurity:
        'Route "{{method}} {{path}}" is missing security configuration. Add security: [{ Bearer: [] }]',
    },
    schema: [
      {
        type: 'object',
        properties: {
          publicRoutes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                method: { type: 'string' },
              },
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const publicRoutes = context.options[0]?.publicRoutes || []

    function isPublicRoute(path, method) {
      return publicRoutes.some(
        route => route.path === path && route.method.toUpperCase() === method.toUpperCase()
      )
    }

    function checkCreateRoute(node) {
      if (node.callee.name !== 'createRoute') {
        return
      }

      const configArg = node.arguments[0]
      if (!configArg || configArg.type !== 'ObjectExpression') {
        return
      }

      let method = null
      let path = null
      let hasMiddleware = false
      let hasAuthMiddleware = false
      let hasSecurity = false

      configArg.properties.forEach(prop => {
        if (prop.key?.name === 'method') {
          method = prop.value.value
        }
        if (prop.key?.name === 'path') {
          path = prop.value.value
        }
        if (prop.key?.name === 'middleware') {
          hasMiddleware = true
          if (prop.value?.type === 'ArrayExpression') {
            prop.value.elements.forEach(element => {
              if (element?.type === 'CallExpression' && element.callee?.name === 'authMiddleware') {
                hasAuthMiddleware = true
              }
            })
          }
        }
        if (prop.key?.name === 'security') {
          hasSecurity = true
        }
      })

      if (!method || !path) {
        return
      }

      const isPublic = isPublicRoute(path, method)

      if (isPublic) {
        if (hasMiddleware && hasAuthMiddleware) {
          context.report({
            node,
            messageId: 'publicRouteWithAuth',
            data: {
              method,
              path,
            },
          })
        }
        return
      }

      if (!hasMiddleware) {
        context.report({
          node,
          messageId: 'missingMiddleware',
          data: {
            method,
            path,
          },
        })
      } else if (!hasAuthMiddleware) {
        context.report({
          node,
          messageId: 'missingAuth',
          data: {
            method,
            path,
          },
        })
      }

      if (!hasSecurity) {
        context.report({
          node,
          messageId: 'missingSecurity',
          data: {
            method,
            path,
          },
        })
      }
    }

    return {
      CallExpression: checkCreateRoute,
    }
  },
}
