import { Modal, Input, Button, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useCaptchaStore } from '../stores/captchaStore'

export const CaptchaModal: React.FC = () => {
  const { isOpen, type, captchaUrl, resolve } = useCaptchaStore()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentCaptchaUrl, setCurrentCaptchaUrl] = useState(captchaUrl)

  const handleRefresh = () => {
    setCurrentCaptchaUrl(`${captchaUrl}?t=${Date.now()}`)
  }

  const handleSubmit = async () => {
    if (!code.trim()) {
      message.warning('请输入验证码')
      return
    }

    setLoading(true)
    try {
      const response = await window.fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const result = (await response.json()) as { success: boolean; error?: string }

      if (result.success) {
        message.success('验证成功')
        resolve(true)
        setCode('')
      } else {
        message.error(result.error || '验证失败')
        handleRefresh()
      }
    } catch {
      message.error('验证失败，请重试')
      handleRefresh()
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setCode('')
    resolve(false)
  }

  const handleIframeMessage = (event: MessageEvent) => {
    if (event.data === 'CAPTCHA_SUCCESS') {
      resolve(true)
      setCode('')
    }
  }

  return (
    <Modal
      open={isOpen}
      title="请完成安全验证"
      onCancel={handleCancel}
      footer={null}
      maskClosable={false}
      closable={true}
      width={400}
    >
      {type === 'iframe' ? (
        <iframe
          src={currentCaptchaUrl}
          className="w-full h-64 border-0"
          onLoad={() => {
            window.addEventListener('message', handleIframeMessage)
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={currentCaptchaUrl}
              alt="验证码"
              className="w-full h-32 object-cover border rounded cursor-pointer"
              onClick={handleRefresh}
            />
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              className="absolute top-2 right-2"
              title="刷新验证码"
            />
          </div>

          <Input
            placeholder="请输入验证码"
            value={code}
            onChange={e => setCode(e.target.value)}
            onPressEnter={handleSubmit}
            size="large"
          />

          <div className="flex gap-2">
            <Button onClick={handleCancel} className="flex-1">
              取消
            </Button>
            <Button type="primary" onClick={handleSubmit} loading={loading} className="flex-1">
              提交
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
