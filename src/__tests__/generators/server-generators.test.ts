import { describe, it, expect, beforeAll } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadManifests, loadPresets, resolvePreset } from '../../generators/template-generator'
import { generateServerApp } from '../../generators/server-app'
import { generateDbInit } from '../../generators/db-init'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.join(__dirname, '../../../template')

describe('server-generators', () => {
  let allManifests: Map<string, any>
  let presets: any[]

  beforeAll(async () => {
    allManifests = await loadManifests(TEMPLATE_DIR)
    presets = await loadPresets(TEMPLATE_DIR)
  })

  describe('generateServerApp', () => {
    it('should include all middleware for fullstack-admin preset', async () => {
      const preset = presets.find(p => p.id === 'fullstack-admin')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateServerApp(resolved)

      expect(content).toContain('import { captchaMiddleware }')
      expect(content).toContain('import { auditLogMiddleware }')
      expect(content).toContain('import { realtimeEnvMiddleware }')
      expect(content).toContain('import { fileRoutes }')
      expect(content).toContain('captchaMiddleware(')
      expect(content).toContain('auditLogMiddleware()')
      expect(content).toContain('realtimeEnvMiddleware()')
      expect(content).toContain(".route('/files', fileRoutes)")
    })

    it('should exclude captcha middleware for minimal preset', async () => {
      const preset = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateServerApp(resolved)

      expect(content).not.toContain('captchaMiddleware')
      expect(content).not.toContain('auditLogMiddleware')
    })

    it('should exclude realtime middleware when no SSE/WS', async () => {
      const preset = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateServerApp(resolved)

      expect(content).not.toContain('realtimeEnvMiddleware')
    })

    it('should include realtime middleware for todo-app (has SSE+WS)', async () => {
      const preset = presets.find(p => p.id === 'todo-app')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateServerApp(resolved)

      expect(content).toContain('realtimeEnvMiddleware')
    })

    it('should exclude file routes for presets without file module', async () => {
      const preset = presets.find(p => p.id === 'todo-app')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateServerApp(resolved)

      expect(content).not.toContain('fileRoutes')
      expect(content).not.toContain(".route('/files'")
    })

    it('should always include error handler, cors, logger', async () => {
      const preset = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateServerApp(resolved)

      expect(content).toContain('errorHandlerMiddleware')
      expect(content).toContain('corsMiddleware')
      expect(content).toContain('loggerMiddleware')
    })

    it('should always export AppType, ClientApiType, AdminApiType', async () => {
      const preset = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateServerApp(resolved)

      expect(content).toContain('export type AppType')
      expect(content).toContain('export type ClientApiType')
      expect(content).toContain('export type AdminApiType')
    })
  })

  describe('generateDbInit', () => {
    it('should include permission seeding for fullstack-admin', async () => {
      const preset = presets.find(p => p.id === 'fullstack-admin')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateDbInit(resolved)

      expect(content).toContain('initialPermissions')
      expect(content).toContain('seedOrdersIfEmpty')
      expect(content).toContain('seedTicketsIfEmpty')
      expect(content).toContain('seedDisputesIfEmpty')
      expect(content).toContain('seedContentsIfEmpty')
    })

    it('should exclude permission seeding for minimal preset', async () => {
      const preset = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateDbInit(resolved)

      expect(content).not.toContain('initialPermissions')
      expect(content).not.toContain('seedOrdersIfEmpty')
    })

    it('should include only relevant seed calls for todo-app', async () => {
      const preset = presets.find(p => p.id === 'todo-app')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateDbInit(resolved)

      expect(content).not.toContain('seedOrdersIfEmpty')
      expect(content).not.toContain('seedTicketsIfEmpty')
      expect(content).not.toContain('initialPermissions')
    })

    it('should always include initializeDatabase function', async () => {
      const preset = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(preset, allManifests)
      const content = generateDbInit(resolved)

      expect(content).toContain('async function initializeDatabase()')
    })
  })
})
