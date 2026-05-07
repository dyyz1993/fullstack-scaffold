// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateCaptcha, verifyCaptcha, cleanupExpiredCaptchas } from '../captcha'

function extractCodeFromSvg(image: string): string {
  const decoded = Buffer.from(image.split(',')[1], 'base64').toString()
  const matches = decoded.match(/>\s*([A-Z0-9])\s*<\/text>/g)
  if (!matches) throw new Error('Could not extract code from SVG')
  return matches.map(m => {
    const char = m.match(/>\s*([A-Z0-9])\s*</)
    return char ? char[1] : ''
  }).join('')
}

describe('captcha', () => {
  beforeEach(() => {
    cleanupExpiredCaptchas()
  })

  describe('generateCaptcha', () => {
    it('should return id and image', () => {
      const result = generateCaptcha()
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('image')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('should return base64 SVG image', () => {
      const result = generateCaptcha()
      expect(result.image).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('should generate unique ids', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateCaptcha().id)
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('verifyCaptcha', () => {
    it('should return false for unknown id', () => {
      expect(verifyCaptcha('nonexistent', 'abc')).toBe(false)
    })

    it('should verify correct code case-insensitively', () => {
      const { id, image } = generateCaptcha()
      const code = extractCodeFromSvg(image)
      expect(verifyCaptcha(id, code.toLowerCase())).toBe(true)
    })

    it('should return false for wrong code', () => {
      const { id } = generateCaptcha()
      expect(verifyCaptcha(id, 'XXXXX')).toBe(false)
    })

    it('should delete captcha after successful verify', () => {
      const { id, image } = generateCaptcha()
      const code = extractCodeFromSvg(image)
      expect(verifyCaptcha(id, code)).toBe(true)
      expect(verifyCaptcha(id, code)).toBe(false)
    })

    it('should return false after 3 failed attempts', () => {
      const { id } = generateCaptcha()
      expect(verifyCaptcha(id, 'WRONG')).toBe(false)
      expect(verifyCaptcha(id, 'WRONG')).toBe(false)
      expect(verifyCaptcha(id, 'WRONG')).toBe(false)
      expect(verifyCaptcha(id, 'WRONG')).toBe(false)
    })
  })

  describe('cleanupExpiredCaptchas', () => {
    it('should not throw when store is empty', () => {
      expect(() => cleanupExpiredCaptchas()).not.toThrow()
    })
  })
})
