import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import { noAnyOnApiclient } from '../no-any-on-apiclient.js'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
})

ruleTester.run('no-any-on-apiclient', noAnyOnApiclient, {
  valid: [
    {
      code: `const res = await apiClient.api.todos.$get()`,
    },
    {
      code: `const res = await apiClient.api.todos.$post({ json: { name: 'test' } })`,
    },
    {
      code: `const client = apiClient`,
    },
    {
      code: `const data = someFunc() as any`,
    },
    {
      code: `const obj = { foo: 'bar' } as any`,
    },
    {
      code: `const result = externalLib.getData() as any`,
    },
    {
      code: `const res = apiClient.api.todos.$get() as any`,
    },
  ],
  invalid: [
    {
      code: `const client = apiClient as any`,
      errors: [{ messageId: 'noAnyOnApiclient' }],
    },
    {
      code: `(apiClient.api as any).todos.$get()`,
      errors: [
        { messageId: 'noAnyOnApiclientProperty' },
        { messageId: 'noAnyOnApiclientProperty' },
      ],
    },
    {
      code: `const x = apiClient.api as any`,
      errors: [{ messageId: 'noAnyOnApiclientProperty' }],
    },
  ],
})

console.log('no-any-on-apiclient tests passed!')
