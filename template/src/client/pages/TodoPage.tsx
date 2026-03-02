/**
 * Todo Page
 * Demonstrates CRUD operations with Hono RPC
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Circle, Clock, Loader2 } from 'lucide-react';
import { useTodoStore } from '../stores/todoStore';
import type { Todo } from '@shared/schemas';

export const TodoPage: React.FC = () => {
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

  const statusConfig = {
    pending: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' },
    in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CheckCircle className="w-8 h-8 text-blue-500" />
          Todo List
        </h1>
        <p className="text-gray-500 mt-2">
          Demonstrates CRUD operations with Hono RPC type inference
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="mb-4">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="Todo title..."
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="mb-4">
          <textarea
            value={newTodoDescription}
            onChange={(e) => setNewTodoDescription(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none min-h-[100px]"
          />
        </div>
        <button
          type="submit"
          disabled={!newTodoTitle.trim() || loading}
          className="flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          Add Todo
        </button>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading && todos.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      <div className="space-y-4">
        {todos.map((todo) => {
          const StatusIcon = statusConfig[todo.status].icon;
          return (
            <div
              key={todo.id}
              className={`p-5 rounded-xl border transition-all ${
                todo.status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-lg font-medium ${
                      todo.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {todo.title}
                  </h3>
                  {todo.description && (
                    <p className="mt-1 text-gray-500 text-sm">{todo.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <select
                      value={todo.status}
                      onChange={(e) => handleStatusChange(todo, e.target.value as Todo['status'])}
                      className={`px-3 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                        statusConfig[todo.status].bg
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <span className="text-xs text-gray-400">
                      {new Date(todo.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-6 h-6 ${statusConfig[todo.status].color}`} />
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && todos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Circle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No todos yet. Add one above!</p>
        </div>
      )}
    </div>
  );
};
