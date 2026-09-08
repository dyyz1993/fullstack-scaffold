import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import * as categoryService from '../services/admin-category-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import { NotFoundError, ConflictError } from '@server/utils/app-error'

async function clearPluginTables() {
  const client = await getRawClient()
  if (client && 'execute' in client) {
    await client.execute('DELETE FROM plugin_category_mappings')
    await client.execute('DELETE FROM plugins')
    await client.execute('DELETE FROM plugin_categories')
  }
}

async function insertTestCategory(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')

  const id = (overrides.id ?? `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) as string
  await client.execute({
    sql: `INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      (overrides.name ?? 'Test Category') as string,
      (overrides.slug ?? id) as string,
      (overrides.description ?? null) as string | null,
      (overrides.icon ?? null) as string | null,
      (overrides.sortOrder ?? 0) as number,
    ],
  })
  return id
}

describe('Admin Category Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    expect(db).toBeDefined()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await clearPluginTables()
  })

  afterEach(async () => {
    await clearPluginTables()
    vi.clearAllMocks()
  })

  describe('createCategory', () => {
    it('should create a category', async () => {
      const category = await categoryService.createCategory({
        name: 'UI & Design',
        slug: 'ui-design',
        description: 'Visual customization',
        icon: 'palette',
      })

      expect(category.id).toBeDefined()
      expect(category.name).toBe('UI & Design')
      expect(category.slug).toBe('ui-design')
      expect(category.description).toBe('Visual customization')
      expect(category.icon).toBe('palette')
      expect(category.sortOrder).toBe(0)
    })

    it('should create a category without optional fields', async () => {
      const category = await categoryService.createCategory({
        name: 'Basic',
        slug: 'basic',
      })

      expect(category.name).toBe('Basic')
      expect(category.description).toBeUndefined()
      expect(category.icon).toBeUndefined()
    })

    it('should throw ConflictError for duplicate slug', async () => {
      await categoryService.createCategory({ name: 'First', slug: 'dup-slug' })

      await expect(
        categoryService.createCategory({ name: 'Second', slug: 'dup-slug' })
      ).rejects.toThrow(ConflictError)
    })
  })

  describe('updateCategory', () => {
    it('should update category name', async () => {
      const catId = await insertTestCategory({ name: 'Old Name', slug: 'update-name' })

      const updated = await categoryService.updateCategory(catId, { name: 'New Name' })

      expect(updated.name).toBe('New Name')
      expect(updated.slug).toBe('update-name')
    })

    it('should update category slug', async () => {
      const catId = await insertTestCategory({ name: 'My Cat', slug: 'old-slug' })

      const updated = await categoryService.updateCategory(catId, { slug: 'new-slug' })

      expect(updated.slug).toBe('new-slug')
    })

    it('should update multiple fields at once', async () => {
      const catId = await insertTestCategory({ name: 'Cat', slug: 'multi-update' })

      const updated = await categoryService.updateCategory(catId, {
        name: 'Updated Cat',
        description: 'New description',
        icon: 'new-icon',
        sortOrder: 5,
      })

      expect(updated.name).toBe('Updated Cat')
      expect(updated.description).toBe('New description')
      expect(updated.icon).toBe('new-icon')
      expect(updated.sortOrder).toBe(5)
    })

    it('should set description to null', async () => {
      const catId = await insertTestCategory({
        name: 'Desc Cat',
        slug: 'desc-update',
        description: 'Has description',
      })

      const updated = await categoryService.updateCategory(catId, { description: null })

      expect(updated.description).toBeUndefined()
    })

    it('should throw NotFoundError for non-existent category', async () => {
      await expect(
        categoryService.updateCategory('non-existent', { name: 'X' })
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      const catId = await insertTestCategory({ name: 'Delete Me', slug: 'delete-cat' })

      await categoryService.deleteCategory(catId)

      const categories = await categoryService.listAllCategories()
      expect(categories.find(c => c.id === catId)).toBeUndefined()
    })

    it('should throw NotFoundError for non-existent category', async () => {
      await expect(categoryService.deleteCategory('non-existent')).rejects.toThrow(NotFoundError)
    })
  })

  describe('listAllCategories', () => {
    it('should return categories sorted by sortOrder', async () => {
      await insertTestCategory({ name: 'Third', slug: 'third', sortOrder: 3 })
      await insertTestCategory({ name: 'First', slug: 'first', sortOrder: 1 })
      await insertTestCategory({ name: 'Second', slug: 'second', sortOrder: 2 })

      const categories = await categoryService.listAllCategories()

      expect(categories).toHaveLength(3)
      expect(categories[0].name).toBe('First')
      expect(categories[1].name).toBe('Second')
      expect(categories[2].name).toBe('Third')
    })

    it('should return empty array when no categories', async () => {
      const categories = await categoryService.listAllCategories()

      expect(categories).toEqual([])
    })
  })
})
