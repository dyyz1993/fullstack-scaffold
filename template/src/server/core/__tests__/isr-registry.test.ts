/**
 * @framework-baseline 560bce7dbeafc84a
 *
 * @framework-modify
 * @reason prettier 格式化导致内容哈希与初始基准漂移，补记说明
 * @impact 仅格式，无逻辑改动
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createISRRegistry } from '@server/core/isr-registry'

describe('ISR Registry', () => {
  let registry: ReturnType<typeof createISRRegistry>

  beforeEach(() => {
    registry = createISRRegistry()
  })

  describe('register', () => {
    it('should register a single route', () => {
      registry.register({
        module: 'todos',
        match: '/todos',
        fetch: async () => ({}),
        meta: () => ({ title: 'Todos', description: 'Todo list' }),
      })
      expect(registry.getAll()).toHaveLength(1)
    })

    it('should register multiple routes', () => {
      registry.registerMany([
        {
          module: 'todos',
          match: '/todos',
          fetch: async () => ({}),
          meta: () => ({ title: 'Todos', description: '' }),
        },
        {
          module: 'content',
          match: '/content',
          fetch: async () => ({}),
          meta: () => ({ title: 'Content', description: '' }),
        },
      ])
      expect(registry.getAll()).toHaveLength(2)
    })

    it('should update existing entry on re-register', () => {
      registry.register({
        module: 'todos',
        match: '/todos',
        fetch: async () => ({}),
        meta: () => ({ title: 'v1', description: '' }),
      })
      registry.register({
        module: 'todos',
        match: '/todos',
        fetch: async () => ({}),
        meta: () => ({ title: 'v2', description: '' }),
      })
      expect(registry.getAll()).toHaveLength(1)
      expect(registry.getAll()[0].meta({}, '')).toEqual({ title: 'v2', description: '' })
    })
  })

  describe('match — exact paths', () => {
    it('should match exact path', () => {
      registry.register({
        module: 'todos',
        match: '/todos',
        fetch: async () => ({}),
        meta: () => ({ title: '', description: '' }),
      })
      const entry = registry.match('/todos')
      expect(entry).not.toBeNull()
      expect(entry!.module).toBe('todos')
    })

    it('should not match wrong exact path', () => {
      registry.register({
        module: 'todos',
        match: '/todos',
        fetch: async () => ({}),
        meta: () => ({ title: '', description: '' }),
      })
      expect(registry.match('/orders')).toBeNull()
    })

    it('should match root /', () => {
      registry.register({
        module: 'home',
        match: '/',
        fetch: async () => ({}),
        meta: () => ({ title: '', description: '' }),
      })
      expect(registry.match('/')).not.toBeNull()
      expect(registry.match('/todos')).toBeNull()
    })
  })

  describe('match — prefix paths', () => {
    it('should match prefix /content/', () => {
      registry.register({
        module: 'content',
        match: '/content/',
        fetch: async () => ({}),
        meta: () => ({ title: '', description: '' }),
      })
      expect(registry.match('/content/content-1')).not.toBeNull()
      expect(registry.match('/content/any-id')).not.toBeNull()
    })

    it('should not match prefix for unrelated path', () => {
      registry.register({
        module: 'content',
        match: '/content/',
        fetch: async () => ({}),
        meta: () => ({ title: '', description: '' }),
      })
      expect(registry.match('/todos')).toBeNull()
    })

    it('should prefer exact match over prefix', () => {
      registry.register({
        module: 'content-detail',
        match: '/content/',
        fetch: async () => ({}),
        meta: () => ({ title: 'detail', description: '' }),
      })
      registry.register({
        module: 'content-list',
        match: '/content',
        fetch: async () => ({}),
        meta: () => ({ title: 'list', description: '' }),
      })
      const exact = registry.match('/content')
      const prefix = registry.match('/content/article-1')
      expect(exact!.module).toBe('content-list')
      expect(prefix!.module).toBe('content-detail')
    })
  })

  describe('match — function matchers', () => {
    it('should match via function', () => {
      registry.register({
        module: 'custom',
        match: pathname => pathname.startsWith('/shop/'),
        fetch: async () => ({}),
        meta: () => ({ title: '', description: '' }),
      })
      expect(registry.match('/shop/product-1')).not.toBeNull()
      expect(registry.match('/shop/')).not.toBeNull()
      expect(registry.match('/other')).toBeNull()
    })
  })

  describe('isISRRoute', () => {
    it('should return true for registered routes', () => {
      registry.register({
        module: 'todos',
        match: '/todos',
        fetch: async () => ({}),
        meta: () => ({ title: '', description: '' }),
      })
      expect(registry.isISRRoute('/todos')).toBe(true)
    })

    it('should return false for unregistered routes', () => {
      expect(registry.isISRRoute('/unknown')).toBe(false)
    })
  })

  describe('getExactPaths', () => {
    it('should return all exact path strings', () => {
      registry.registerMany([
        {
          module: 'a',
          match: '/a',
          fetch: async () => ({}),
          meta: () => ({ title: '', description: '' }),
        },
        {
          module: 'b',
          match: '/b/',
          fetch: async () => ({}),
          meta: () => ({ title: '', description: '' }),
        },
        {
          module: 'c',
          match: '/c',
          fetch: async () => ({}),
          meta: () => ({ title: '', description: '' }),
        },
      ])
      const paths = registry.getExactPaths()
      expect(paths).toContain('/a')
      expect(paths).toContain('/b/')
      expect(paths).toContain('/c')
      expect(paths).toHaveLength(3)
    })
  })

  describe('clear', () => {
    it('should remove all entries', () => {
      registry.register({
        module: 'a',
        match: '/a',
        fetch: async () => ({}),
        meta: () => ({ title: '', description: '' }),
      })
      registry.clear()
      expect(registry.getAll()).toHaveLength(0)
    })
  })
})
