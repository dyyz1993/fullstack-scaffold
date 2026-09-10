import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Typography, Spin, App } from 'antd'
import { api, getToken } from '../services/tenantApi'
import { useTenantStore } from '../stores/tenantStore'
import type { PublicInvitation } from '@shared/schemas'

/**
 * 邀请落地页（公开路由 /tenant/invite/:token）。
 * 展示脱敏邀请详情；未登录先跳登录（回跳本页），登录后一键接受入组。
 */
export const InviteAcceptPage: React.FC = () => {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [detail, setDetail] = useState<PublicInvitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await api<PublicInvitation>(`/tenants/invitations/${token}`)
      if (!cancelled) {
        setDetail(res.success && res.data ? res.data : null)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const restoreFromToken = useTenantStore(state => state.restoreFromToken)

  const handleAccept = async () => {
    if (!getToken()) {
      navigate('/login', { state: { from: `/invite/${token}` } })
      return
    }
    setAccepting(true)
    const res = await api(`/tenants/invitations/${token}/accept`, { method: 'POST' })
    setAccepting(false)
    if (res.success) {
      message.success('Invitation accepted — welcome!')
      // 入组成功即有租户——恢复上下文（写 slug）再进 dashboard，
      // 否则 TenantGuard 因 currentTenant 为空永久 Spin（白屏）
      await restoreFromToken()
      navigate('/dashboard', { replace: true })
    } else {
      message.error('Invitation is invalid, used or expired')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100"
      data-testid="tenant-invite"
    >
      <Card
        className="w-96 shadow-lg text-center"
        title={<Typography.Title level={4}>Tenant Invitation</Typography.Title>}
      >
        {detail ? (
          <>
            <Typography.Paragraph>
              You are invited to join <strong>{detail.tenantName}</strong> as{' '}
              <strong>{detail.roleLabel}</strong>
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary">
              Invited email: {detail.email}
            </Typography.Paragraph>
            {detail.status === 'pending' ? (
              <Button type="primary" block loading={accepting} onClick={handleAccept}>
                Accept invitation
              </Button>
            ) : (
              <Typography.Paragraph type="warning">
                This invitation is {detail.status}.
              </Typography.Paragraph>
            )}
          </>
        ) : (
          <Typography.Paragraph type="danger">Invitation not found.</Typography.Paragraph>
        )}
      </Card>
    </div>
  )
}
