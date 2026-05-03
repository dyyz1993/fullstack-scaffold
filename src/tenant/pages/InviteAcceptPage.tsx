import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mail, CheckCircle, XCircle, Building2, Loader2 } from 'lucide-react'
import { Card, Button, Result, Spin, Avatar } from 'antd'
import { tenantApi } from '../services/tenantApi'
import type { TenantInvitation } from '../stores/tenantStore'

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitation, setInvitation] = useState<TenantInvitation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  const loadInvitation = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await tenantApi.getInvitation(token)
      setInvitation(data)

      if (data.status === 'accepted') {
        setAccepted(true)
      } else if (
        data.status === 'expired' ||
        (data.expiresAt && new Date(data.expiresAt) < new Date())
      ) {
        setError('邀请链接已过期')
      } else if (data.status === 'cancelled') {
        setError('邀请已被取消')
      }
    } catch {
      setError('邀请不存在或已失效')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadInvitation()
  }, [loadInvitation])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    try {
      await tenantApi.acceptInvitation(token)
      setAccepted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '接受邀请失败')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <Result
            icon={<XCircle className="w-16 h-16 text-red-500 mx-auto" />}
            title="邀请无效"
            subTitle={error}
            extra={
              <Button type="primary" onClick={() => navigate('/')}>
                返回首页
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <Result
            icon={<CheckCircle className="w-16 h-16 text-green-500 mx-auto" />}
            title="邀请已接受"
            subTitle="您已成功加入租户，现在可以开始协作了"
            extra={
              <Button type="primary" onClick={() => navigate('/tenants')}>
                进入租户
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">加入租户邀请</h1>
        </div>

        {invitation && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar icon={<Building2 className="w-4 h-4" />} />
                <div>
                  <div className="font-medium">租户 ID</div>
                  <div className="text-sm text-gray-500">{invitation.tenantId}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Avatar icon={<Mail className="w-4 h-4" />} />
                <div>
                  <div className="font-medium">邀请邮箱</div>
                  <div className="text-sm text-gray-500">{invitation.email}</div>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-500 text-center">
              点击下方按钮接受邀请，加入该租户
            </div>

            <div className="flex gap-3">
              <Button block onClick={() => navigate('/')}>
                拒绝
              </Button>
              <Button
                type="primary"
                block
                onClick={handleAccept}
                loading={accepting}
                icon={accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                接受邀请
              </Button>
            </div>

            <div className="text-xs text-gray-400 text-center">
              邀请有效期至：
              {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleString() : '-'}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
