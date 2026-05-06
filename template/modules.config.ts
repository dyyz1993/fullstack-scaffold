/**
 * Template Presets Configuration
 *
 * Defines which modules each scaffold template includes.
 * The CLI reads this to determine what to copy and generate.
 */
import type { TemplatePreset } from './src/shared/core/module-manifest'

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'fullstack-admin',
    name: 'Full Admin (Recommended)',
    description:
      'Complete fullstack app with all modules: todos, chat, notifications, admin panel, RBAC, orders, tickets, disputes, content management, file upload, and CAPTCHA',
    modules: [
      // Core (no dependencies)
      'todos',
      'chat',
      'notifications',
      'file',
      'captcha',
      // System (permission first, then dependents)
      'permission',
      'admin',
      // Business (all depend on permission)
      'order',
      'ticket',
      'dispute',
      'content',
    ],
  },
  {
    id: 'todo-app',
    name: 'Todo App',
    description: 'Simple todo app with chat and notifications — great starting point for learning',
    modules: ['todos', 'chat', 'notifications'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Bare minimum: todos only. Add modules as you need them.',
    modules: ['todos'],
  },
]

/** Get a preset by ID */
export function getPreset(id: string): TemplatePreset | undefined {
  return TEMPLATE_PRESETS.find(p => p.id === id)
}

/** Get the default preset */
export function getDefaultPreset(): TemplatePreset {
  return TEMPLATE_PRESETS[0]
}
