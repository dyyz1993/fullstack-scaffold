// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { z } from '@hono/zod-openapi'
import {
  successResponse,
  errorResponse,
  NotFoundResponse,
  ConflictResponse,
  BusinessErrorResponse,
  ValidationResponse,
  defineResponses,
  defineCreateResponses,
  defineDeleteResponses,
  listResponse,
  idParam,
  idRequest,
  bodyRequest,
  queryRequest,
} from '../route-helpers'
import { success, created, list, deleted } from '../response'

describe('successResponse', () => {
  it('should create response with schema and description', () => {
    const schema = z.object({ name: z.string() })
    const result = successResponse(schema, 'test desc')
    expect(result.description).toBe('test desc')
    expect(result.content).toHaveProperty('application/json')
    expect(result.content['application/json']).toHaveProperty('schema')
  })
})

describe('errorResponse', () => {
  it('should create error response with description', () => {
    const result = errorResponse('some error')
    expect(result.description).toBe('some error')
    expect(result.content).toHaveProperty('application/json')
    expect(result.content['application/json']).toHaveProperty('schema')
  })
})

describe('predefined error responses', () => {
  it('NotFoundResponse has correct description', () => {
    expect(NotFoundResponse.description).toBe('Resource not found')
  })

  it('ConflictResponse has correct description', () => {
    expect(ConflictResponse.description).toBe('Resource conflict')
  })

  it('BusinessErrorResponse has correct description', () => {
    expect(BusinessErrorResponse.description).toBe('Business rule violation')
  })

  it('ValidationResponse has correct description', () => {
    expect(ValidationResponse.description).toBe('Invalid input')
  })
})

describe('defineResponses', () => {
  const schema = z.object({ id: z.number() })

  it('should return 200 success response by default', () => {
    const result = defineResponses(schema, 'Get resource')
    expect(result[200]).toBeDefined()
    expect(result[200].description).toBe('Get resource')
  })

  it('should add 404 when notFound is true', () => {
    const result = defineResponses(schema, 'Get', { notFound: true })
    expect(result[404]).toBeDefined()
    expect(result[404].description).toBe('Resource not found')
  })

  it('should add 404 with custom message when notFound is string', () => {
    const result = defineResponses(schema, 'Get', { notFound: 'Item missing' })
    expect(result[404].description).toBe('Item missing')
  })

  it('should add 409 when conflict is true', () => {
    const result = defineResponses(schema, 'Create', { conflict: true })
    expect(result[409]).toBeDefined()
    expect(result[409].description).toBe('Resource conflict')
  })

  it('should add 409 with custom message when conflict is string', () => {
    const result = defineResponses(schema, 'Create', { conflict: 'Already taken' })
    expect(result[409].description).toBe('Already taken')
  })

  it('should add 422 when businessError is true', () => {
    const result = defineResponses(schema, 'Update', { businessError: true })
    expect(result[422]).toBeDefined()
    expect(result[422].description).toBe('Business rule violation')
  })

  it('should add 422 with custom message when businessError is string', () => {
    const result = defineResponses(schema, 'Update', { businessError: 'Bad state' })
    expect(result[422].description).toBe('Bad state')
  })

  it('should add 400 when validation is true', () => {
    const result = defineResponses(schema, 'Create', { validation: true })
    expect(result[400]).toBeDefined()
    expect(result[400].description).toBe('Invalid input')
  })

  it('should add 400 with custom message when validation is string', () => {
    const result = defineResponses(schema, 'Create', { validation: 'Bad format' })
    expect(result[400].description).toBe('Bad format')
  })

  it('should combine multiple options', () => {
    const result = defineResponses(schema, 'Complex', {
      notFound: true,
      conflict: 'dup',
      businessError: true,
      validation: 'bad',
    })
    expect(Object.keys(result)).toEqual(expect.arrayContaining(['200', '404', '409', '422', '400']))
  })

  it('should only have 200 when no options', () => {
    const result = defineResponses(schema, 'Simple')
    expect(Object.keys(result)).toEqual(['200'])
  })
})

describe('defineCreateResponses', () => {
  const schema = z.object({ id: z.number() })

  it('should return 201 success response by default', () => {
    const result = defineCreateResponses(schema, 'Created')
    expect(result[201]).toBeDefined()
    expect(result[201].description).toBe('Created')
  })

  it('should add 409 when conflict is true', () => {
    const result = defineCreateResponses(schema, 'Create', { conflict: true })
    expect(result[409]).toBeDefined()
  })

  it('should add 409 with custom message', () => {
    const result = defineCreateResponses(schema, 'Create', { conflict: 'Exists' })
    expect(result[409].description).toBe('Exists')
  })

  it('should add 422 when businessError is true', () => {
    const result = defineCreateResponses(schema, 'Create', { businessError: true })
    expect(result[422]).toBeDefined()
  })

  it('should add 422 with custom message', () => {
    const result = defineCreateResponses(schema, 'Create', { businessError: 'Rule break' })
    expect(result[422].description).toBe('Rule break')
  })

  it('should only have 201 when no options', () => {
    const result = defineCreateResponses(schema, 'Create')
    expect(Object.keys(result)).toEqual(['201'])
  })
})

describe('defineDeleteResponses', () => {
  it('should return 200 by default', () => {
    const result = defineDeleteResponses()
    expect(result[200]).toBeDefined()
    expect(result[200].description).toBe('Deleted successfully')
  })

  it('should add 404 when notFound is true', () => {
    const result = defineDeleteResponses({ notFound: true })
    expect(result[404]).toBeDefined()
  })

  it('should add 404 with custom message', () => {
    const result = defineDeleteResponses({ notFound: 'Already gone' })
    expect(result[404].description).toBe('Already gone')
  })
})

describe('listResponse', () => {
  it('should create list response with items array and optional cursor', () => {
    const itemSchema = z.object({ name: z.string() })
    const result = listResponse(itemSchema, 'List items')
    expect(result.description).toBe('List items')
    expect(result.content['application/json']).toHaveProperty('schema')
  })
})

describe('idParam', () => {
  it('should be a zod object with id string', () => {
    const result = idParam.safeParse({ id: '123' })
    expect(result.success).toBe(true)
  })

  it('should reject non-string id', () => {
    const result = idParam.safeParse({ id: 123 })
    expect(result.success).toBe(false)
  })
})

describe('idRequest', () => {
  it('should have params with idParam', () => {
    expect(idRequest).toHaveProperty('params')
    expect(idRequest.params).toBe(idParam)
  })
})

describe('bodyRequest', () => {
  it('should create request config with json body schema', () => {
    const schema = z.object({ name: z.string() })
    const result = bodyRequest(schema)
    expect(result).toHaveProperty('body')
    expect(result.body).toHaveProperty('content')
    expect(result.body.content).toHaveProperty('application/json')
  })
})

describe('queryRequest', () => {
  it('should create request config with query schema', () => {
    const schema = z.object({ page: z.string().optional() })
    const result = queryRequest(schema)
    expect(result).toHaveProperty('query')
    expect(result.query).toBe(schema)
  })
})

describe('response helpers', () => {
  it('success should wrap data', () => {
    const result = success({ id: 1 })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 1 })
    expect(result.timestamp).toBeTruthy()
  })

  it('created should wrap data', () => {
    const result = created({ id: 1 })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 1 })
    expect(result.timestamp).toBeTruthy()
  })

  it('list with items only', () => {
    const result = list([1, 2, 3])
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ items: [1, 2, 3] })
  })

  it('list with count', () => {
    const result = list([1, 2], 5)
    expect(result.data).toEqual({ items: [1, 2], count: 5 })
  })

  it('list with count = 0', () => {
    const result = list([], 0)
    expect(result.data).toEqual({ items: [], count: 0 })
  })

  it('deleted should wrap id', () => {
    const result = deleted('abc')
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 'abc' })
  })
})
