import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TodoPage } from '../TodoPage'
import type { Todo, TodoAttachment } from '@shared/schemas'

interface MockTodoStore {
  todos: Todo[]
  loading: boolean
  error: string | null
  attachments: Map<number, TodoAttachment[]>
  fetchTodos: ReturnType<typeof vi.fn>
  createTodo: ReturnType<typeof vi.fn>
  updateTodo: ReturnType<typeof vi.fn>
  deleteTodo: ReturnType<typeof vi.fn>
  uploadAttachment: ReturnType<typeof vi.fn>
  fetchAttachments: ReturnType<typeof vi.fn>
  deleteAttachment: ReturnType<typeof vi.fn>
}

const mockStore: MockTodoStore = {
  todos: [],
  loading: false,
  error: null,
  attachments: new Map(),
  fetchTodos: vi.fn().mockResolvedValue(undefined),
  createTodo: vi.fn().mockResolvedValue(undefined),
  updateTodo: vi.fn().mockResolvedValue(undefined),
  deleteTodo: vi.fn().mockResolvedValue(undefined),
  uploadAttachment: vi.fn().mockResolvedValue(null),
  fetchAttachments: vi.fn().mockResolvedValue(undefined),
  deleteAttachment: vi.fn().mockResolvedValue(undefined),
}

vi.mock('@client/stores/todoStore', () => ({
  useTodoStore: vi.fn((selector?: (state: MockTodoStore) => unknown) => {
    if (selector) {
      return selector(mockStore)
    }
    return mockStore
  }),
}))

const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 1,
  title: 'Test Todo',
  description: 'Test description',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockAttachment = (overrides: Partial<TodoAttachment> = {}): TodoAttachment => ({
  id: 1,
  todoId: 1,
  fileName: 'test.pdf',
  originalName: 'test.pdf',
  size: 1024,
  mimeType: 'application/pdf',
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('TodoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.todos = []
    mockStore.loading = false
    mockStore.error = null
    mockStore.attachments = new Map()
  })

  describe('Initial Render', () => {
    it('should render page title', () => {
      render(<TodoPage />)
      expect(screen.getByTestId('todo-title')).toBeInTheDocument()
      expect(screen.getByText('Todo List')).toBeInTheDocument()
    })

    it('should render page description', () => {
      render(<TodoPage />)
      expect(screen.getByText(/CRUD operations/)).toBeInTheDocument()
    })

    it('should call fetchTodos on mount', () => {
      render(<TodoPage />)
      expect(mockStore.fetchTodos).toHaveBeenCalledTimes(1)
    })
  })

  describe('Create Todo Form', () => {
    it('should render form inputs', () => {
      render(<TodoPage />)
      expect(screen.getByTestId('todo-title-input')).toBeInTheDocument()
      expect(screen.getByTestId('todo-description-input')).toBeInTheDocument()
      expect(screen.getByTestId('add-todo-button')).toBeInTheDocument()
    })

    it('should have disabled submit button when title is empty', () => {
      render(<TodoPage />)
      const submitButton = screen.getByTestId('add-todo-button')
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when title has value', () => {
      render(<TodoPage />)
      fireEvent.change(screen.getByTestId('todo-title-input'), { target: { value: 'New Todo' } })
      expect(screen.getByTestId('add-todo-button')).not.toBeDisabled()
    })

    it('should create todo on form submit', async () => {
      render(<TodoPage />)
      fireEvent.change(screen.getByTestId('todo-title-input'), { target: { value: 'New Todo' } })
      fireEvent.change(screen.getByTestId('todo-description-input'), { target: { value: 'New Desc' } })
      fireEvent.click(screen.getByTestId('add-todo-button'))

      await waitFor(() => {
        expect(mockStore.createTodo).toHaveBeenCalledWith({
          title: 'New Todo',
          description: 'New Desc',
        })
      })
    })

    it('should create todo without description when empty', async () => {
      render(<TodoPage />)
      fireEvent.change(screen.getByTestId('todo-title-input'), { target: { value: 'Just Title' } })
      fireEvent.click(screen.getByTestId('add-todo-button'))

      await waitFor(() => {
        expect(mockStore.createTodo).toHaveBeenCalledWith({
          title: 'Just Title',
          description: undefined,
        })
      })
    })

    it('should clear form after successful submit', async () => {
      render(<TodoPage />)
      const titleInput = screen.getByTestId('todo-title-input') as HTMLInputElement
      const descInput = screen.getByTestId('todo-description-input') as HTMLTextAreaElement

      fireEvent.change(titleInput, { target: { value: 'New Todo' } })
      fireEvent.change(descInput, { target: { value: 'New Desc' } })
      fireEvent.click(screen.getByTestId('add-todo-button'))

      await waitFor(() => {
        expect(titleInput.value).toBe('')
        expect(descInput.value).toBe('')
      })
    })

    it('should not submit when title is whitespace only', () => {
      render(<TodoPage />)
      fireEvent.change(screen.getByTestId('todo-title-input'), { target: { value: '   ' } })
      expect(screen.getByTestId('add-todo-button')).toBeDisabled()
    })

    it('should disable submit when loading', () => {
      mockStore.loading = true
      render(<TodoPage />)
      fireEvent.change(screen.getByTestId('todo-title-input'), { target: { value: 'Test' } })
      expect(screen.getByTestId('add-todo-button')).toBeDisabled()
    })
  })

  describe('Todo List Display', () => {
    it('should show loading indicator when loading with empty list', () => {
      mockStore.loading = true
      mockStore.todos = []
      render(<TodoPage />)
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('should not show loading indicator when loading but has todos', () => {
      mockStore.loading = true
      mockStore.todos = [createMockTodo()]
      render(<TodoPage />)
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    it('should show error message when error exists', () => {
      mockStore.error = 'Failed to fetch todos'
      render(<TodoPage />)
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch todos')).toBeInTheDocument()
    })

    it('should display todo count', () => {
      mockStore.todos = [
        createMockTodo({ id: 1, title: 'Todo 1' }),
        createMockTodo({ id: 2, title: 'Todo 2' }),
      ]
      render(<TodoPage />)
      expect(screen.getByTestId('todo-count')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should display todo items with title and description', () => {
      mockStore.todos = [createMockTodo({ id: 1, title: 'My Todo', description: 'My Desc' })]
      render(<TodoPage />)
      expect(screen.getByText('My Todo')).toBeInTheDocument()
      expect(screen.getByText('My Desc')).toBeInTheDocument()
    })

    it('should not display description when absent', () => {
      mockStore.todos = [createMockTodo({ description: undefined as unknown as string })]
      render(<TodoPage />)
      expect(screen.queryByTestId('todo-item-description')).not.toBeInTheDocument()
    })

    it('should show line-through for completed todos', () => {
      mockStore.todos = [createMockTodo({ status: 'completed', title: 'Done Todo' })]
      render(<TodoPage />)
      const title = screen.getByTestId('todo-item-title')
      expect(title.className).toContain('line-through')
    })

    it('should display todo status select', () => {
      mockStore.todos = [createMockTodo()]
      render(<TodoPage />)
      expect(screen.getByTestId('todo-status')).toBeInTheDocument()
      expect(screen.getByTestId('todo-status')).toHaveValue('pending')
    })

    it('should display formatted creation date', () => {
      const date = new Date('2024-01-15T10:30:00.000Z')
      mockStore.todos = [createMockTodo({ createdAt: date.toISOString() })]
      render(<TodoPage />)
      expect(screen.getByText(date.toLocaleString())).toBeInTheDocument()
    })
  })

  describe('Filter Functionality', () => {
    beforeEach(() => {
      mockStore.todos = [
        createMockTodo({ id: 1, title: 'Pending Todo', status: 'pending' }),
        createMockTodo({ id: 2, title: 'In Progress Todo', status: 'in_progress' }),
        createMockTodo({ id: 3, title: 'Completed Todo', status: 'completed' }),
      ]
    })

    it('should render all filter buttons', () => {
      render(<TodoPage />)
      expect(screen.getByTestId('filter-all')).toBeInTheDocument()
      expect(screen.getByTestId('filter-pending')).toBeInTheDocument()
      expect(screen.getByTestId('filter-in-progress')).toBeInTheDocument()
      expect(screen.getByTestId('filter-completed')).toBeInTheDocument()
    })

    it('should filter by pending status', () => {
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('filter-pending'))
      expect(screen.getByText('Pending Todo')).toBeInTheDocument()
      expect(screen.queryByText('In Progress Todo')).not.toBeInTheDocument()
      expect(screen.queryByText('Completed Todo')).not.toBeInTheDocument()
    })

    it('should filter by in_progress status', () => {
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('filter-in-progress'))
      expect(screen.queryByText('Pending Todo')).not.toBeInTheDocument()
      expect(screen.getByText('In Progress Todo')).toBeInTheDocument()
      expect(screen.queryByText('Completed Todo')).not.toBeInTheDocument()
    })

    it('should filter by completed status', () => {
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('filter-completed'))
      expect(screen.queryByText('Pending Todo')).not.toBeInTheDocument()
      expect(screen.queryByText('In Progress Todo')).not.toBeInTheDocument()
      expect(screen.getByText('Completed Todo')).toBeInTheDocument()
    })

    it('should show all todos when all filter is selected', () => {
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('filter-all'))
      expect(screen.getByText('Pending Todo')).toBeInTheDocument()
      expect(screen.getByText('In Progress Todo')).toBeInTheDocument()
      expect(screen.getByText('Completed Todo')).toBeInTheDocument()
    })

    it('should show empty state for filtered results', () => {
      mockStore.todos = [createMockTodo({ status: 'pending' })]
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('filter-completed'))
      expect(screen.getByText(/No todos yet/)).toBeInTheDocument()
    })
  })

  describe('Todo Actions', () => {
    it('should call updateTodo when status is changed', async () => {
      mockStore.todos = [createMockTodo({ id: 1, status: 'pending' })]
      render(<TodoPage />)
      fireEvent.change(screen.getByTestId('todo-status'), { target: { value: 'completed' } })
      await waitFor(() => {
        expect(mockStore.updateTodo).toHaveBeenCalledWith(1, { status: 'completed' })
      })
    })

    it('should call deleteTodo when delete button is clicked', async () => {
      mockStore.todos = [createMockTodo({ id: 5 })]
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('delete-button'))
      await waitFor(() => {
        expect(mockStore.deleteTodo).toHaveBeenCalledWith(5)
      })
    })
  })

  describe('Attachments', () => {
    it('should toggle attachments section', async () => {
      mockStore.todos = [createMockTodo({ id: 1 })]
      render(<TodoPage />)

      expect(screen.queryByTestId('attachments-section')).not.toBeInTheDocument()
      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      await waitFor(() => {
        expect(screen.getByTestId('attachments-section')).toBeInTheDocument()
      })
    })

    it('should fetch attachments on first expand', async () => {
      mockStore.todos = [createMockTodo({ id: 1 })]
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      await waitFor(() => {
        expect(mockStore.fetchAttachments).toHaveBeenCalledWith(1)
      })
    })

    it('should not fetch attachments on subsequent toggles', async () => {
      const attachments = new Map([[1, [createMockAttachment()]]])
      mockStore.todos = [createMockTodo({ id: 1 })]
      mockStore.attachments = attachments
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      expect(mockStore.fetchAttachments).not.toHaveBeenCalled()
    })

    it('should collapse attachments on second toggle click', async () => {
      mockStore.todos = [createMockTodo({ id: 1 })]
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      await waitFor(() => {
        expect(screen.getByTestId('attachments-section')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      expect(screen.queryByTestId('attachments-section')).not.toBeInTheDocument()
    })

    it('should display attachments when available', async () => {
      const att = createMockAttachment({ originalName: 'doc.pdf', size: 2048 })
      mockStore.todos = [createMockTodo({ id: 1 })]
      mockStore.attachments = new Map([[1, [att]]])
      render(<TodoPage />)

      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      await waitFor(() => {
        expect(screen.getByText('doc.pdf')).toBeInTheDocument()
        expect(screen.getByText(/\(2\.0 KB\)/)).toBeInTheDocument()
      })
    })

    it('should show no attachments text when empty', async () => {
      mockStore.todos = [createMockTodo({ id: 1 })]
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      await waitFor(() => {
        expect(screen.getByText('No attachments yet')).toBeInTheDocument()
      })
    })

    it('should call deleteAttachment when delete attachment button is clicked', async () => {
      const att = createMockAttachment({ id: 10, todoId: 1 })
      mockStore.todos = [createMockTodo({ id: 1 })]
      mockStore.attachments = new Map([[1, [att]]])
      render(<TodoPage />)

      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      await waitFor(() => {
        expect(screen.getByTestId('delete-attachment-button')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByTestId('delete-attachment-button'))
      await waitFor(() => {
        expect(mockStore.deleteAttachment).toHaveBeenCalledWith(1, 10)
      })
    })

    it('should render upload button', async () => {
      mockStore.todos = [createMockTodo({ id: 1 })]
      render(<TodoPage />)
      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      await waitFor(() => {
        expect(screen.getByTestId('upload-button')).toBeInTheDocument()
      })
    })

    it('should format file sizes correctly', async () => {
      const att = createMockAttachment({ originalName: 'big.pdf', size: 1048576 })
      mockStore.todos = [createMockTodo({ id: 1 })]
      mockStore.attachments = new Map([[1, [att]]])
      render(<TodoPage />)

      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      await waitFor(() => {
        expect(screen.getByText(/\(1\.0 MB\)/)).toBeInTheDocument()
      })
    })

    it('should format bytes correctly', async () => {
      const att = createMockAttachment({ originalName: 'small.txt', size: 500 })
      mockStore.todos = [createMockTodo({ id: 1 })]
      mockStore.attachments = new Map([[1, [att]]])
      render(<TodoPage />)

      fireEvent.click(screen.getByTestId('toggle-attachments-button'))
      await waitFor(() => {
        expect(screen.getByText(/\(500 B\)/)).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no todos', () => {
      mockStore.todos = []
      render(<TodoPage />)
      expect(screen.getByText(/No todos yet/)).toBeInTheDocument()
    })
  })
})
