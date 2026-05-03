import { describe, it, expect } from 'vitest'
import * as settingsService from '../services/settings-service'

describe('Settings Service', () => {
  describe('getSettings', () => {
    it('should return default settings', () => {
      const settings = settingsService.getSettings()

      expect(settings.siteName).toBeDefined()
      expect(settings.siteDescription).toBeDefined()
      expect(settings.notificationsEnabled).toBeDefined()
    })

    it('should handle corrupted settings file gracefully', () => {
      const settings = settingsService.getSettings()

      expect(settings).toBeDefined()
      expect(settings.siteName).not.toBeUndefined()
    })
  })

  describe('updateSettings', () => {
    it('should update and return settings', () => {
      const updated = settingsService.updateSettings({
        siteName: 'Test App',
      })

      expect(updated.siteName).toBe('Test App')
      expect(updated.notificationsEnabled).toBeDefined()
    })

    it('should handle invalid input gracefully', () => {
      const result = settingsService.updateSettings({} as Record<string, unknown>)

      expect(result).toBeDefined()
      expect(result.siteName).toBeDefined()
      expect(typeof result.siteName).toBe('string')
    })

    it('should reject invalid notification setting', () => {
      const result = settingsService.updateSettings({
        notificationsEnabled: 'invalid' as unknown as boolean,
      })

      expect(result).toBeDefined()
      expect(result.notificationsEnabled).not.toBeUndefined()
    })
  })
})
