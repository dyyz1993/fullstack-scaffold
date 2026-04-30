import { RuleTester } from 'eslint'
import { frameworkProtect } from '../framework-protect.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
})

ruleTester.run('framework-protect', frameworkProtect, {
  valid: [
    {
      filename: 'src/client/components/TodoList.tsx',
      code: `export function TodoList() { return null }`,
    },
    {
      filename: 'src/server/module-todos/routes/todos.ts',
      code: `export const todos = []`,
    },
    {
      filename: 'src/shared/modules/todos/schema.ts',
      code: `export const todoSchema = {}`,
    },
    {
      filename: 'src/shared/core/ws-client.ts',
      code: `/**
 * @framework-baseline 4437e01c1b0bcabb
 */

export const ws = {}`,
    },
    {
      filename: 'src/client/services/apiClient.ts',
      code: `/**
 * @framework-baseline 36f2d2ee4f9addc8
 */

export const apiClient = {}`,
    },
  ],
  invalid: [
    {
      filename: 'src/shared/core/ws-client.ts',
      code: `export const ws = {}`,
      errors: [{ messageId: 'missingBaseline' }],
    },
    {
      filename: 'src/server/core/runtime.ts',
      code: `/**
 * Some description
 */

export const runtime = {}`,
      errors: [{ messageId: 'missingBaseline' }],
    },
    {
      filename: 'src/client/services/apiClient.ts',
      code: `export const apiClient = {}`,
      errors: [{ messageId: 'missingBaseline' }],
    },
    {
      filename: 'src/server/entries/node.ts',
      code: `export default {}`,
      errors: [{ messageId: 'missingBaseline' }],
    },
    {
      filename: 'src/server/test-utils/helpers.ts',
      code: `export function helper() {}`,
      errors: [{ messageId: 'missingBaseline' }],
    },
    {
      filename: 'src/shared/core/ws-client.ts',
      code: `/**
 * @framework-baseline 0000000000000000
 */

export const ws = {}`,
      errors: [{ messageId: 'fileModified' }],
    },
  ],
})

console.log('framework-protect tests passed!')
