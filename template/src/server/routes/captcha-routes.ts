import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { generateCaptcha, verifyCaptcha } from '../services/captcha-service'
import { markCaptchaVerifiedMiddleware } from '../middleware/captcha'

export const captchaRoutes = new Hono()

captchaRoutes.get('/captcha', c => {
  const { id, image } = generateCaptcha()

  return c.json({
    success: true,
    data: {
      id,
      image,
    },
  })
})

captchaRoutes.post('/verify-captcha', async c => {
  try {
    const body = await c.req.json()
    const { id, code } = body

    if (!id || !code) {
      return c.json(
        {
          success: false,
          error: '验证码 ID 和验证码不能为空',
        },
        400
      )
    }

    const isValid = verifyCaptcha(id, code)

    if (isValid) {
      const sessionId = getCookie(c, 'session_id')
      if (sessionId) {
        markCaptchaVerifiedMiddleware(sessionId)
      }

      return c.json({
        success: true,
        message: '验证成功',
      })
    } else {
      return c.json(
        {
          success: false,
          error: '验证码错误或已过期',
        },
        400
      )
    }
  } catch {
    return c.json(
      {
        success: false,
        error: '验证失败',
      },
      500
    )
  }
})
