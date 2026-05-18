/**
 * @fileoverview Prevent cross-module service internal imports
 * @author create-biomimic-app
 */

'use strict'

const FORBIDDEN_INTERNAL_PATHS = ['services', 'routes', 'middleware']

export const noCrossModuleServiceImport = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent modules from importing service internals from other modules',
      recommended: true,
    },
    messages: {
      crossModuleServiceImport:
        "Cross-module service import detected: '{{importPath}}'. " +
        "Import from '{{otherModule}}' should use its public API ('@server/module-{{otherModule}}') instead of internal paths.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename()

    const currentModuleMatch = filename.match(/\/(module-[^/]+)\//)
    if (!currentModuleMatch) return {}

    const currentModule = currentModuleMatch[1]

    function checkImport(importPath, node) {
      let normalizedPath = importPath

      if (importPath.startsWith('.')) {
        const baseParts = filename.split('/')
        baseParts.pop()
        const parts = [...baseParts]

        for (const segment of importPath.split('/')) {
          if (segment === '..') {
            parts.pop()
          } else if (segment !== '.') {
            parts.push(segment)
          }
        }

        normalizedPath = parts.join('/')
      }

      const aliasMatch = normalizedPath.match(/@server\/(module-([^/]+))(?:\/(.+))?$/)
      const relativeMatch = normalizedPath.match(/(module-([^/]+))\/(.+)$/)

      const match = aliasMatch || relativeMatch
      if (!match) return

      const otherModuleName = aliasMatch ? aliasMatch[2] : relativeMatch[2]
      const subPath = aliasMatch ? aliasMatch[3] : relativeMatch[3]

      if (otherModuleName === currentModule.replace('module-', '')) return
      if (!subPath) return

      if (subPath === 'module.ts' || subPath === 'index.ts' || subPath === 'index') return

      const firstSegment = subPath.split('/')[0]
      if (FORBIDDEN_INTERNAL_PATHS.includes(firstSegment)) {
        context.report({
          node,
          messageId: 'crossModuleServiceImport',
          data: {
            importPath,
            otherModule: otherModuleName,
          },
        })
      }
    }

    return {
      ImportDeclaration(node) {
        const source = node.source
        if (!source || source.type !== 'Literal') return
        if (typeof source.value !== 'string') return
        checkImport(source.value, node)
      },
      ImportExpression(node) {
        if (node.source.type !== 'Literal') return
        if (typeof node.source.value !== 'string') return
        checkImport(node.source.value, node)
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          checkImport(node.arguments[0].value, node)
        }
      },
    }
  },
}

export default noCrossModuleServiceImport
