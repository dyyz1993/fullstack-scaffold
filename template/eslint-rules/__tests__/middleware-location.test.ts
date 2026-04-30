import { RuleTester } from 'eslint'
import { middlewareLocation, noMiddlewareOutsideDir } from '../middleware-location.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
})

const middlewareFilename = 'src/server/middleware/test-middleware.ts'

ruleTester.run('middleware-location', middlewareLocation, {
  valid: [
    {
      filename: middlewareFilename,
      code: `export function fooMiddleware() {}`,
    },
    {
      filename: middlewareFilename,
      code: `export const barMiddleware = () => {}`,
    },
    {
      filename: middlewareFilename,
      code: `export function getAuthUser() {}`,
    },
    {
      filename: middlewareFilename,
      code: `export function requireAuth() {}`,
    },
    {
      filename: middlewareFilename,
      code: `export function hasPermission() {}`,
    },
    {
      filename: middlewareFilename,
      code: `export function hashPassword() {}`,
    },
    {
      filename: middlewareFilename,
      code: `export function verifyPassword() {}`,
    },
    {
      filename: middlewareFilename,
      code: `export function generateToken() {}`,
    },
    {
      filename: middlewareFilename,
      code: `export const RateLimitEntry = {}`,
    },
    {
      filename: middlewareFilename,
      code: `export const RateLimitStore = {}`,
    },
    {
      filename: middlewareFilename,
      code: `export const MemoryRateLimitStore = {}`,
    },
    {
      filename: middlewareFilename,
      code: `export const RedisRateLimitStore = {}`,
    },
    {
      filename: middlewareFilename,
      code: `export const createRateLimitStore = () => {}`,
    },
    {
      filename: middlewareFilename,
      code: `export const setRateLimitStore = () => {}`,
    },
    {
      filename: middlewareFilename,
      code: `export function _helper() {}`,
    },
    {
      filename: 'src/server/module-todos/routes/todos-routes.ts',
      code: `export function someFunction() {}`,
    },
  ],
  invalid: [
    {
      filename: middlewareFilename,
      code: `export function badFunction() {}`,
      errors: [{ messageId: 'missingExport' }, { messageId: 'invalidName' }],
    },
    {
      filename: middlewareFilename,
      code: `export const badVar = () => {}`,
      errors: [{ messageId: 'missingExport' }, { messageId: 'invalidName' }],
    },
    {
      filename: middlewareFilename,
      code: `export function doSomething() {}
export function anotherThing() {}`,
      errors: [
        { messageId: 'missingExport' },
        { messageId: 'invalidName' },
        { messageId: 'invalidName' },
      ],
    },
  ],
})

ruleTester.run('no-middleware-outside-dir', noMiddlewareOutsideDir, {
  valid: [
    {
      filename: middlewareFilename,
      code: `function authMiddleware() {}`,
    },
    {
      filename: middlewareFilename,
      code: `const loggingMiddleware = () => {}`,
    },
    {
      filename: 'src/server/module-todos/routes/todos-routes.ts',
      code: `function regularFunction() {}`,
    },
    {
      filename: 'src/server/module-todos/routes/todos-routes.ts',
      code: `const someVar = () => {}`,
    },
  ],
  invalid: [
    {
      filename: 'src/server/module-todos/routes/todos-routes.ts',
      code: `function authMiddleware() {}`,
      errors: [{ messageId: 'noMiddlewareOutsideDir' }],
    },
    {
      filename: 'src/server/module-todos/routes/todos-routes.ts',
      code: `const loggingMiddleware = () => {}`,
      errors: [{ messageId: 'noMiddlewareOutsideDir' }],
    },
    {
      filename: 'src/server/core/some-file.ts',
      code: `function rateMiddleware() {}`,
      errors: [{ messageId: 'noMiddlewareOutsideDir' }],
    },
    {
      filename: 'src/server/core/some-file.ts',
      code: `const corsMiddleware = () => {}`,
      errors: [{ messageId: 'noMiddlewareOutsideDir' }],
    },
  ],
})

console.log('middleware-location tests passed!')
