import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTodoStore } from '../todoStore'

const mockJson = vi.fn()
const mockResponse = { json: () => mockJson() }

const mockTodosGet = vi.fn().mockResolvedValue(mockResponse)
const mockTodosPost = vi.fn().mockResolvedValue(mockResponse)
const mockTodoIdPut = vi.fn().mockResolvedValue(mockResponse)
const mockTodoIdDelete = vi.fn().mockResolvedValue(mockResponse)
const mockAttachmentPost = vi.fn().mockResolvedValue(mockResponse)
const mockAttachmentGet = vi.fn().mockResolvedValue(mockResponse)
const mockAttachmentDelete = vi.fn().mockResolvedValue(mockResponse)

const makeAttachmentProxy = (hasNestedDelete = false) =>
  new Proxy({} as Record<string, unknown>, {
    get(_, aProp) {
      if (aProp === '$post') return mockAttachmentPost
      if (aProp === '$get') return mockAttachmentGet
      if (hasNestedDelete) {
        return new Proxy({} as Record<string, unknown>, {
          get(_, aaProp) {
            if (aaProp === '$delete') return mockAttachmentDelete
            return undefined
          },
        })
      }
      return undefined
    },
  })

const makeIdProxy = () =>
  new Proxy({} as Record<string, unknown>, {
    get(_, idProp) {
      if (idProp === '$put') return mockTodoIdPut
      if (idProp === '$delete') return mockTodoIdDelete
      if (idProp === 'attachments') return makeAttachmentProxy(true)
      return undefined
    },
  })

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      todos: new Proxy({} as Record<string, unknown>, {
        get(_, prop) {
          if (prop === '$get') return mockTodosGet
          if (prop === '$post') return mockTodosPost
          if (prop === 'attachments') return makeAttachmentProxy(false)
          return makeIdProxy()
        },
      }),
    },
  },
}))

const createMockTodo = (overrides = {}) => ({
  id: 1,
  title: 'Test Todo',
  description: 'Test description',
  status: 'pending' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockAttachment = (overrides = {}) => ({
  id: 1,
  todoId: 1,
  fileName: 'test.pdf',
  originalName: 'test.pdf',
  size: 1024,
  mimeType: 'application/pdf',
  path: '/uploads/test.pdf',
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('Todo Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockJson.mockReset()
    useTodoStore.setState({
      todos: [],
      loading: false,
      error: null,
      attachments: new Map(),
    })
  })

  describe('Initial State', () => {
    it('should have empty initial state', () => {
      const state = useTodoStore.getState()
      expect(state.todos).toEqual([])
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.attachments).toBeInstanceOf(Map)
      expect(state.attachments.size).toBe(0)
    })
  })

  describe('setError', () => {
    it('should set error message', () => {
      useTodoStore.getState().setError('Test error')
      expect(useTodoStore.getState().error).toBe('Test error')
      expect(useTodoStore.getState().loading).toBe(false)
    })

    it('should clear error message', () => {
      useTodoStore.getState().setError('Test error')
      useTodoStore.getState().setError(null)
      expect(useTodoStore.getState().error).toBeNull()
      expect(useTodoStore.getState().loading).toBe(false)
    })
  })

  describe('fetchTodos', () => {
    it('should fetch todos successfully with array response', async () => {
      const todos = [createMockTodo({ id: 1 }), createMockTodo({ id: 2 })]
      mockJson.mockResolvedValue({ success: true, data: todos })

      await useTodoStore.getState().fetchTodos()

      const state = useTodoStore.getState()
      expect(state.todos).toEqual(todos)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle empty array response', async () => {
      mockJson.mockResolvedValue({ success: true, data: [] })

      await useTodoStore.getState().fetchTodos()

      expect(useTodoStore.getState().todos).toEqual([])
      expect(useTodoStore.getState().loading).toBe(false)
    })

    it('should handle failed response', async () => {
      mockJson.mockResolvedValue({ success: false, error: 'Server error' })

      await useTodoStore.getState().fetchTodos()

      expect(useTodoStore.getState().error).toBe('Server error')
      expect(useTodoStore.getState().loading).toBe(false)
    })

    it('should handle network error', async () => {
      mockTodosGet.mockRejectedValueOnce(new Error('Network error'))
      mockJson.mockResolvedValue({})

      await useTodoStore.getState().fetchTodos()

      expect(useTodoStore.getState().error).toBe('Network error')
      expect(useTodoStore.getState().loading).toBe(false)
    })

    it('should handle non-Error thrown value', async () => {
      mockTodosGet.mockRejectedValueOnce('string error')
      mockJson.mockResolvedValue({})

      await useTodoStore.getState().fetchTodos()

      expect(useTodoStore.getState().error).toBe('Unknown error')
      expect(useTodoStore.getState().loading).toBe(false)
    })

    it('should set loading to true during fetch', async () => {
      let resolvePromise!: (value: unknown) => void
      mockTodosGet.mockReturnValueOnce(
        new Promise(r => {
          resolvePromise = r
        })
      )

      const fetchPromise = useTodoStore.getState().fetchTodos()
      expect(useTodoStore.getState().loading).toBe(true)

      resolvePromise({ json: () => Promise.resolve({ success: true, data: [] }) })
      await fetchPromise

      expect(useTodoStore.getState().loading).toBe(false)
    })
  })

  describe('createTodo', () => {
    it('should create todo successfully', async () => {
      const newTodo = createMockTodo({ id: 3, title: 'New Todo' })
      mockJson.mockResolvedValue({ success: true, data: newTodo })

      await useTodoStore.getState().createTodo({ title: 'New Todo' })

      const state = useTodoStore.getState()
      expect(state.todos).toHaveLength(1)
      expect(state.todos[0]).toEqual(newTodo)
      expect(state.loading).toBe(false)
    })

    it('should prepend new todo to existing list', async () => {
      useTodoStore.setState({ todos: [createMockTodo({ id: 1 })] })
      const newTodo = createMockTodo({ id: 2, title: 'Second' })
      mockJson.mockResolvedValue({ success: true, data: newTodo })

      await useTodoStore.getState().createTodo({ title: 'Second' })

      const state = useTodoStore.getState()
      expect(state.todos).toHaveLength(2)
      expect(state.todos[0].id).toBe(2)
    })

    it('should handle failed creation', async () => {
      mockJson.mockResolvedValue({ success: false, error: 'Validation failed' })

      await useTodoStore.getState().createTodo({ title: '' })

      expect(useTodoStore.getState().error).toBe('Validation failed')
      expect(useTodoStore.getState().todos).toHaveLength(0)
    })

    it('should handle creation network error', async () => {
      mockTodosPost.mockRejectedValueOnce(new Error('Network failed'))
      mockJson.mockResolvedValue({})

      await useTodoStore.getState().createTodo({ title: 'Test' })

      expect(useTodoStore.getState().error).toBe('Network failed')
      expect(useTodoStore.getState().todos).toHaveLength(0)
    })

    it('should set loading state during creation', async () => {
      let resolvePromise!: (value: unknown) => void
      mockTodosPost.mockReturnValueOnce(
        new Promise(r => {
          resolvePromise = r
        })
      )

      const promise = useTodoStore.getState().createTodo({ title: 'Test' })
      expect(useTodoStore.getState().loading).toBe(true)

      resolvePromise({ json: () => Promise.resolve({ success: true, data: createMockTodo() }) })
      await promise

      expect(useTodoStore.getState().loading).toBe(false)
    })
  })

  describe('updateTodo', () => {
    it('should update todo successfully', async () => {
      useTodoStore.setState({ todos: [createMockTodo({ id: 1, status: 'pending' })] })
      const updatedTodo = createMockTodo({ id: 1, status: 'completed' as const })
      mockJson.mockResolvedValue({ success: true, data: updatedTodo })

      await useTodoStore.getState().updateTodo(1, { status: 'completed' })

      expect(useTodoStore.getState().todos[0].status).toBe('completed')
      expect(useTodoStore.getState().loading).toBe(false)
    })

    it('should not modify other todos when updating', async () => {
      const todo1 = createMockTodo({ id: 1 })
      const todo2 = createMockTodo({ id: 2 })
      useTodoStore.setState({ todos: [todo1, todo2] })
      const updatedTodo = { ...todo1, status: 'completed' as const }
      mockJson.mockResolvedValue({ success: true, data: updatedTodo })

      await useTodoStore.getState().updateTodo(1, { status: 'completed' })

      expect(useTodoStore.getState().todos[1]).toEqual(todo2)
    })

    it('should handle failed update', async () => {
      useTodoStore.setState({ todos: [createMockTodo()] })
      mockJson.mockResolvedValue({ success: false, error: 'Not found' })

      await useTodoStore.getState().updateTodo(999, { status: 'completed' })

      expect(useTodoStore.getState().error).toBe('Not found')
    })

    it('should handle update network error', async () => {
      mockTodoIdPut.mockRejectedValueOnce(new Error('Server unreachable'))
      mockJson.mockResolvedValue({})

      await useTodoStore.getState().updateTodo(1, { status: 'completed' })

      expect(useTodoStore.getState().error).toBe('Server unreachable')
      expect(useTodoStore.getState().loading).toBe(false)
    })

    it('should pass id as string param', async () => {
      const updatedTodo = createMockTodo({ id: 42 })
      mockJson.mockResolvedValue({ success: true, data: updatedTodo })

      await useTodoStore.getState().updateTodo(42, { status: 'completed' })

      expect(mockTodoIdPut).toHaveBeenCalledWith({
        param: { id: '42' },
        json: { status: 'completed' },
      })
    })
  })

  describe('deleteTodo', () => {
    it('should delete todo successfully', async () => {
      useTodoStore.setState({
        todos: [createMockTodo({ id: 1 }), createMockTodo({ id: 2 })],
        attachments: new Map([[1, [createMockAttachment()]]]),
      })
      mockJson.mockResolvedValue({ success: true })

      await useTodoStore.getState().deleteTodo(1)

      const state = useTodoStore.getState()
      expect(state.todos).toHaveLength(1)
      expect(state.todos[0].id).toBe(2)
      expect(state.attachments.has(1)).toBe(false)
    })

    it('should handle failed delete', async () => {
      useTodoStore.setState({ todos: [createMockTodo()] })
      mockJson.mockResolvedValue({ success: false, error: 'Forbidden' })

      await useTodoStore.getState().deleteTodo(1)

      expect(useTodoStore.getState().error).toBe('Forbidden')
      expect(useTodoStore.getState().todos).toHaveLength(1)
    })

    it('should handle delete network error', async () => {
      mockTodoIdDelete.mockRejectedValueOnce(new Error('Connection lost'))
      mockJson.mockResolvedValue({})

      await useTodoStore.getState().deleteTodo(1)

      expect(useTodoStore.getState().error).toBe('Connection lost')
      expect(useTodoStore.getState().loading).toBe(false)
    })

    it('should pass id as string param for delete', async () => {
      mockJson.mockResolvedValue({ success: true })

      await useTodoStore.getState().deleteTodo(5)

      expect(mockTodoIdDelete).toHaveBeenCalledWith({ param: { id: '5' } })
    })
  })

  describe('uploadAttachment', () => {
    it('should upload attachment successfully', async () => {
      const attachment = createMockAttachment()
      mockJson.mockResolvedValue({ success: true, data: attachment })

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const returned = await useTodoStore.getState().uploadAttachment(1, file)

      expect(returned).toEqual(attachment)
      expect(useTodoStore.getState().attachments.get(1)).toEqual([attachment])
    })

    it('should append to existing attachments', async () => {
      const existing = createMockAttachment({ id: 1 })
      useTodoStore.setState({ attachments: new Map([[1, [existing]]]) })
      const newAttachment = createMockAttachment({ id: 2 })
      mockJson.mockResolvedValue({ success: true, data: newAttachment })

      const file = new File(['content'], 'test2.pdf', { type: 'application/pdf' })
      await useTodoStore.getState().uploadAttachment(1, file)

      expect(useTodoStore.getState().attachments.get(1)).toHaveLength(2)
    })

    it('should return null on failed upload', async () => {
      mockJson.mockResolvedValue({ success: false, error: 'Too large' })

      const file = new File(['content'], 'big.pdf', { type: 'application/pdf' })
      const returned = await useTodoStore.getState().uploadAttachment(1, file)

      expect(returned).toBeNull()
      expect(useTodoStore.getState().error).toBe('Too large')
    })

    it('should return null on network error', async () => {
      mockAttachmentPost.mockRejectedValueOnce(new Error('Upload failed'))
      mockJson.mockResolvedValue({})

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const returned = await useTodoStore.getState().uploadAttachment(1, file)

      expect(returned).toBeNull()
      expect(useTodoStore.getState().error).toBe('Upload failed')
    })

    it('should use default error message when none provided', async () => {
      mockJson.mockResolvedValue({ success: false })

      const file = new File([''], 'test.pdf')
      await useTodoStore.getState().uploadAttachment(1, file)

      expect(useTodoStore.getState().error).toBe('Upload failed')
    })

    it('should pass correct params for upload', async () => {
      const attachment = createMockAttachment()
      mockJson.mockResolvedValue({ success: true, data: attachment })

      const file = new File(['content'], 'test.pdf')
      await useTodoStore.getState().uploadAttachment(5, file)

      expect(mockAttachmentPost).toHaveBeenCalledWith({
        param: { id: '5' },
        form: { file },
      })
    })
  })

  describe('fetchAttachments', () => {
    it('should fetch attachments successfully with array response', async () => {
      const attachments = [createMockAttachment({ id: 1 }), createMockAttachment({ id: 2 })]
      mockJson.mockResolvedValue({ success: true, data: attachments })

      await useTodoStore.getState().fetchAttachments(1)

      expect(useTodoStore.getState().attachments.get(1)).toEqual(attachments)
    })

    it('should store data directly even if not an array', async () => {
      const obj = { items: [createMockAttachment()] }
      mockJson.mockResolvedValue({ success: true, data: obj })

      await useTodoStore.getState().fetchAttachments(1)

      expect(useTodoStore.getState().attachments.get(1)).toEqual(obj)
    })

    it('should handle fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockAttachmentGet.mockRejectedValueOnce(new Error('Fetch error'))
      mockJson.mockResolvedValue({})

      await useTodoStore.getState().fetchAttachments(1)

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch attachments:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should handle failed response gracefully', async () => {
      mockJson.mockResolvedValue({ success: false, error: 'Not found' })

      await useTodoStore.getState().fetchAttachments(1)

      expect(useTodoStore.getState().attachments.has(1)).toBe(false)
    })
  })

  describe('deleteAttachment', () => {
    it('should delete attachment successfully', async () => {
      const att1 = createMockAttachment({ id: 1, todoId: 1 })
      const att2 = createMockAttachment({ id: 2, todoId: 1 })
      useTodoStore.setState({ attachments: new Map([[1, [att1, att2]]]) })
      mockJson.mockResolvedValue({ success: true })

      await useTodoStore.getState().deleteAttachment(1, 1)

      expect(useTodoStore.getState().attachments.get(1)).toHaveLength(1)
      expect(useTodoStore.getState().attachments.get(1)![0].id).toBe(2)
    })

    it('should handle failed delete', async () => {
      useTodoStore.setState({
        attachments: new Map([[1, [createMockAttachment()]]]),
      })
      mockJson.mockResolvedValue({ success: false, error: 'Not found' })

      await useTodoStore.getState().deleteAttachment(1, 99)

      expect(useTodoStore.getState().error).toBe('Not found')
      expect(useTodoStore.getState().attachments.get(1)).toHaveLength(1)
    })

    it('should handle network error', async () => {
      mockAttachmentDelete.mockRejectedValueOnce(new Error('Network error'))
      mockJson.mockResolvedValue({})

      await useTodoStore.getState().deleteAttachment(1, 1)

      expect(useTodoStore.getState().error).toBe('Network error')
      expect(useTodoStore.getState().loading).toBe(false)
    })

    it('should handle missing attachments map entry', async () => {
      mockJson.mockResolvedValue({ success: true })

      await useTodoStore.getState().deleteAttachment(99, 1)

      expect(useTodoStore.getState().loading).toBe(false)
    })
  })
})
