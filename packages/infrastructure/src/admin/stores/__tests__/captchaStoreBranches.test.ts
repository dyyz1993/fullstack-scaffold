import { describe, it, expect } from 'vitest'
import { useCaptchaStore } from '../captchaStore'

describe('useCaptchaStore - branch coverage', () => {
  it('should handle resolve when resolveCaptcha is null', () => {
    useCaptchaStore.setState({ resolveCaptcha: null, isOpen: true })

    useCaptchaStore.getState().resolve(true)

    expect(useCaptchaStore.getState().isOpen).toBe(false)
    expect(useCaptchaStore.getState().resolveCaptcha).toBeNull()
  })

  it('should handle close when resolveCaptcha is null', () => {
    useCaptchaStore.setState({ resolveCaptcha: null, isOpen: true })

    useCaptchaStore.getState().close()

    expect(useCaptchaStore.getState().isOpen).toBe(false)
    expect(useCaptchaStore.getState().resolveCaptcha).toBeNull()
  })

  it('should resolve with false on close', async () => {
    const promise = useCaptchaStore.getState().show({ type: 'iframe' })
    useCaptchaStore.getState().close()

    const result = await promise
    expect(result).toBe(false)
  })

  it('should handle show with default captchaUrl', async () => {
    const promise = useCaptchaStore.getState().show({})
    expect(useCaptchaStore.getState().captchaUrl).toBe('/api/captcha')
    useCaptchaStore.getState().resolve(false)
    await promise
  })
})
