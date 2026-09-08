import type { ModuleManifest } from '@shared/core/module-manifest'

const todosManifest: ModuleManifest = {
  name: 'todos',
  description: 'Todo CRUD with file attachments and CSV export',
  category: 'core',
  dependsOn: [],

  routes: {
    client: {
      importPath: './routes/todos-routes',
      exportName: 'apiRoutes',
    },
  },

  sharedSchemas: {
    path: 'todos',
  },

  clientPages: [{ name: 'TodoPage', route: '/todos' }],

  clientStores: ['todoStore'],

  dbSchemas: {
    files: ['todos', 'todo-attachments'],
    hasSeed: true,
    seed: { serviceFile: 'todo-service', functionName: 'seedTodosIfEmpty' },
  },

  cliModule: { dir: 'todo', registerFunction: 'registerTodoCommands' },
}

export default todosManifest
