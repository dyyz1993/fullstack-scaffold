/**
 * @framework-baseline 4edb81c96763694f
 */

/**
 * @fileoverview Disallow relative imports with 3+ levels of `../`
 * @description Enforces use of path aliases (@server, @shared, @client, @admin)
 *              instead of deep relative imports.
 *
 * Rule: max 2 levels of `../` allowed
 * Reason: Deep relative imports are fragile and hard to maintain during refactoring.
 *
 * See .opencode/rules/path-alias-guide.md for guidance.
 */

export const noDeepRelativeImports = {
  meta: {
    type: 'suggestion',
    severity: 'error',
    docs: {
      description: 'Disallow relative imports deeper than 2 levels',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      tooDeep:
        'Deep relative import "{{importPath}}" has {{depth}} levels of parent directory traversal. ' +
        'Use a path alias (e.g., @server/..., @shared/..., @client/..., @admin/...) instead.\n' +
        'See .opencode/rules/path-alias-guide.md for the path alias guide.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxDepth: { type: 'number', minimum: 0, default: 2 },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const maxDepth = context.options[0]?.maxDepth ?? 2

    return {
      ImportDeclaration(node) {
        checkImport(node.source.value, node)
      },
      ImportExpression(node) {
        if (typeof node.source.value === 'string') {
          checkImport(node.source.value, node)
        }
      },
    }

    function checkImport(importPath, node) {
      if (!importPath.startsWith('.')) return

      const depth = (importPath.match(/\.\.\//g) || []).length
      if (depth > maxDepth) {
        context.report({
          node,
          messageId: 'tooDeep',
          data: { importPath, depth },
        })
      }
    }
  },
}
