// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { profileRoutes } from '../routes/profile-routes'

interface ProfileResponse {
  success: boolean
  data: {
    id: string
    username: string
    email: string
    bio: string
    joinDate: string
    stats: { posts: number; followers: number; following: number }
  }
  timestamp: string
}

async function fetchProfile(): Promise<ProfileResponse> {
  const res = await profileRoutes.fetch(new Request('http://localhost/profile'))
  return (await res.json()) as ProfileResponse
}

describe('Profile Routes', () => {
  describe('GET /profile', () => {
    it('should return profile with 200', async () => {
      const res = await profileRoutes.fetch(new Request('http://localhost/profile'))

      expect(res.status).toBe(200)
      const data = await fetchProfile()
      expect(data.success).toBe(true)
    })

    it('should return profile with required fields', async () => {
      const data = await fetchProfile()

      expect(data.success).toBe(true)
      expect(data.data.id).toBeDefined()
      expect(data.data.username).toBeDefined()
      expect(data.data.email).toBeDefined()
      expect(data.data.joinDate).toBeDefined()
      expect(data.data.stats).toBeDefined()
    })

    it('should return valid email format', async () => {
      const data = await fetchProfile()

      expect(data.success).toBe(true)
      expect(data.data.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    })

    it('should return stats with numeric values', async () => {
      const data = await fetchProfile()

      expect(data.success).toBe(true)
      expect(typeof data.data.stats.posts).toBe('number')
      expect(typeof data.data.stats.followers).toBe('number')
      expect(typeof data.data.stats.following).toBe('number')
    })

    it('should return a valid ISO date for joinDate', async () => {
      const data = await fetchProfile()

      expect(data.success).toBe(true)
      expect(data.data.joinDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should return consistent data across requests', async () => {
      const data1 = await fetchProfile()
      const data2 = await fetchProfile()

      expect(data1.success).toBe(true)
      expect(data2.success).toBe(true)
      expect(data1.data.id).toBe(data2.data.id)
      expect(data1.data.username).toBe(data2.data.username)
      expect(data1.data.email).toBe(data2.data.email)
    })

    it('should include timestamp in response', async () => {
      const data = await fetchProfile()

      expect(data.success).toBe(true)
      expect(data.timestamp).toBeDefined()
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should return bio field', async () => {
      const data = await fetchProfile()

      expect(data.success).toBe(true)
      expect(data.data.bio).toBeDefined()
    })
  })
})
