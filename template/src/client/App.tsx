/**
 * Todo List Application
 * Main React component with CRUD operations
 */

import { useState, useEffect } from 'react';
import { useTodoStore } from './stores/todoStore';
import type { Todo } from '@shared/types';

export const App: React.FC = () => {
  const todos = useTodoStore((state) => state.todos);
  const loading = useTodoStore((state) => state.loading);
  const error = useTodoStore((state) => state.error);
  const { fetchTodos, createTodo, updateTodo, deleteTodo } = useTodoStore();

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    await createTodo({
      title: newTodoTitle,
      description: newTodoDescription || undefined,
    });

    setNewTodoTitle('');
    setNewTodoDescription('');
  };

  const handleStatusChange = async (todo: Todo, status: Todo['status']) => {
    await updateTodo(todo.id, { status });
  };

  const handleDelete = async (id: number) => {
    await deleteTodo(id);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }} data-testid="app-container">
      <h1>Todo List</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: '2rem' }} data-testid="todo-form">
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="Todo title..."
            data-testid="todo-title-input"
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <textarea
            value={newTodoDescription}
            onChange={(e) => setNewTodoDescription(e.target.value)}
            placeholder="Description (optional)..."
            data-testid="todo-description-input"
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              boxSizing: 'border-box',
              minHeight: '80px',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!newTodoTitle.trim() || loading}
          data-testid="add-todo-button"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Add Todo
        </button>
      </form>

      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }} data-testid="error-message">
          {error}
        </div>
      )}

      {loading && <div data-testid="loading-indicator">Loading...</div>}

      <div data-testid="todo-list">
        {todos.map((todo) => (
          <div
            key={todo.id}
            data-testid={`todo-item-${todo.id}`}
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <h3>{todo.title}</h3>
            {todo.description && <p>{todo.description}</p>}
            <div style={{ marginTop: '0.5rem' }}>
              <select
                value={todo.status}
                onChange={(e) =>
                  handleStatusChange(todo, e.target.value as Todo['status'])
                }
                data-testid={`status-select-${todo.id}`}
                style={{ marginRight: '1rem' }}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <button
                onClick={() => handleDelete(todo.id)}
                data-testid={`delete-button-${todo.id}`}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                Delete
              </button>
            </div>
            <small>
              Created: {new Date(todo.createdAt).toLocaleString()}
            </small>
          </div>
        ))}
      </div>

      {!loading && todos.length === 0 && (
        <p style={{ color: '#666' }} data-testid="empty-state">No todos yet. Add one above!</p>
      )}
    </div>
  );
};
