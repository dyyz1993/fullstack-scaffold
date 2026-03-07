import { describe, it, expect } from 'vitest'
import { createApp } from '../app'

const app = createApp()

describe('Bad test - using fetch', () => {
  it('should not use fetch', async () => {
    const res = await fetch('http://localhost/api/todos')
    expect(res.status).toBe(200)
  })

  it('should not use app.fetch', async () => {
    const res = await app.fetch(new Request('http://localhost/api/todos'))
    expect(res.status).toBe(200)
  })

  it('should not use app.request', async () => {
    const res = await app.request('/api/todos')
    expect(res.status).toBe(200)
  })
})
