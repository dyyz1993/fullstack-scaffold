import { RuleTester } from 'eslint'
import { noDirectFetch } from '../no-direct-fetch.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    globals: {
      window: 'readonly',
      fetch: 'readonly',
    },
  },
})

ruleTester.run('no-direct-fetch', noDirectFetch, {
  valid: [
    {
      filename: 'src/client/hooks/useTodos.ts',
      code: `async function load() { const res = await apiClient.api.todos.$get() }`,
    },
    {
      filename: 'src/client/pages/Home.tsx',
      code: `async function load() { const res = await apiClient.api.todos.$post({ json: { name: 'test' } }) }`,
    },
    {
      filename: 'src/server/routes/api.ts',
      code: `async function load() { const data = await fetch('https://external-api.com/data') }`,
    },
    {
      filename: 'src/server/services/external.ts',
      code: `async function load() { const data = await fetch('/internal') }`,
    },
    {
      filename: 'src/client/hooks/useTodos.test.ts',
      code: `async function load() { const data = await fetch('/api/todos') }`,
    },
    {
      filename: 'src/client/__tests__/setup.ts',
      code: `async function load() { const data = await fetch('/api/todos') }`,
    },
  ],
  invalid: [
    {
      filename: 'src/client/hooks/useTodos.ts',
      code: `async function load() { const res = await fetch('/api/todos') }`,
      errors: [{ messageId: 'noDirectFetch' }],
    },
    {
      filename: 'src/client/pages/Home.tsx',
      code: `window.fetch('/api/data')`,
      errors: [{ messageId: 'noDirectFetch' }],
    },
    {
      filename: 'src/client/services/data.ts',
      code: `async function load() { const res = await axios.get('/api/todos') }`,
      errors: [{ messageId: 'noDirectFetch' }],
    },
    {
      filename: 'src/client/services/data.ts',
      code: `async function load() { const res = await axios.post('/api/todos', { name: 'test' }) }`,
      errors: [{ messageId: 'noDirectFetch' }],
    },
    {
      filename: 'src/client/services/data.ts',
      code: `const xhr = new XMLHttpRequest()`,
      errors: [{ messageId: 'noDirectFetch' }],
    },
    {
      filename: 'src/client/services/data.ts',
      code: `$.ajax({ url: '/api/items' })`,
      errors: [{ messageId: 'noDirectFetch' }],
    },
  ],
})

console.log('no-direct-fetch tests passed!')
