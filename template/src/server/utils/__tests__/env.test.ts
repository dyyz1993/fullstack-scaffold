// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isCloudflare, isNode } from '../env'

describe('env', () => {
  it('should export isCloudflare as boolean', () => {
    expect(typeof isCloudflare).toBe('boolean')
  })

  it('should export isNode as boolean', () => {
    expect(typeof isNode).toBe('boolean')
  })

  it('should detect Node environment', () => {
    expect(isNode).toBe(true)
  })

  it('isCloudflare should be false in Node environment', () => {
    expect(isCloudflare).toBe(false)
  })

  it('isCloudflare and isNode should be mutually exclusive', () => {
    expect(isCloudflare && isNode).toBe(false)
  })
})
