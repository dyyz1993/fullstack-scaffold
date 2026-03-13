import { useState } from 'react'
import { apiClient } from '../services/apiClient'
import { Card, Button, Space, Input, message, Image, Typography, Divider } from 'antd'
import { Image as ImageIcon, FileCode, Download } from 'lucide-react'

const { Title, Paragraph, Text } = Typography

export const MediaTestPage: React.FC = () => {
  const [avatarId, setAvatarId] = useState('test-user')
  const [iconName, setIconName] = useState('home')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [loadingAvatar, setLoadingAvatar] = useState(false)
  const [loadingSvg, setLoadingSvg] = useState(false)
  const [loadingDownload, setLoadingDownload] = useState(false)

  const handleFetchAvatar = async () => {
    setLoadingAvatar(true)
    try {
      const blob = await apiClient.api.admin.avatar[':id'].$image({
        param: { id: avatarId },
      })
      const url = URL.createObjectURL(blob)
      setAvatarUrl(url)
      message.success('头像获取成功')
    } catch (error) {
      console.error('Failed to fetch avatar:', error)
      message.error('头像获取失败')
    } finally {
      setLoadingAvatar(false)
    }
  }

  const handleFetchSvg = async () => {
    setLoadingSvg(true)
    try {
      const svg = await apiClient.api.admin.icon[':name'].$svg({
        param: { name: iconName },
      })
      setSvgContent(svg)
      message.success('SVG 图标获取成功')
    } catch (error) {
      console.error('Failed to fetch SVG:', error)
      message.error('SVG 图标获取失败')
    } finally {
      setLoadingSvg(false)
    }
  }

  const availableIcons = ['home', 'settings', 'user', 'bell']

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>媒体类型测试</Title>
      <Paragraph>
        此页面演示如何使用 <Text code>$image()</Text> 和 <Text code>$svg()</Text> 方法获取图片和 SVG
        图标。
      </Paragraph>

      <Divider />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title={
            <Space>
              <ImageIcon size={20} />
              <span>图片测试 ($image)</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph>
              使用 <Text code>$image()</Text> 方法获取图片，返回{' '}
              <Text code>Promise&lt;Blob&gt;</Text>。
            </Paragraph>
            <Space>
              <Input
                placeholder="输入头像 ID"
                value={avatarId}
                onChange={e => setAvatarId(e.target.value)}
                style={{ width: 200 }}
              />
              <Button type="primary" onClick={handleFetchAvatar} loading={loadingAvatar}>
                获取头像
              </Button>
            </Space>
            {avatarUrl && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">获取结果：</Text>
                <div style={{ marginTop: 8 }}>
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={128}
                    height={128}
                    style={{ borderRadius: '50%', border: '2px solid #1890ff' }}
                  />
                </div>
              </div>
            )}
          </Space>
        </Card>

        <Card
          title={
            <Space>
              <FileCode size={20} />
              <span>SVG 测试 ($svg)</span>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph>
              使用 <Text code>$svg()</Text> 方法获取 SVG 图标，返回{' '}
              <Text code>Promise&lt;string&gt;</Text>。
            </Paragraph>
            <Space wrap>
              {availableIcons.map(icon => (
                <Button
                  key={icon}
                  type={iconName === icon ? 'primary' : 'default'}
                  onClick={() => setIconName(icon)}
                >
                  {icon}
                </Button>
              ))}
            </Space>
            <Space>
              <Input
                placeholder="输入图标名称"
                value={iconName}
                onChange={e => setIconName(e.target.value)}
                style={{ width: 200 }}
              />
              <Button type="primary" onClick={handleFetchSvg} loading={loadingSvg}>
                获取 SVG
              </Button>
            </Space>
            {svgContent && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">获取结果：</Text>
                <div
                  style={{
                    marginTop: 8,
                    padding: 16,
                    background: '#f5f5f5',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                    style={{
                      width: 48,
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fff',
                      borderRadius: 8,
                      padding: 8,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      padding: 8,
                      background: '#fff',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      overflow: 'auto',
                      maxHeight: 100,
                    }}
                  >
                    <code>{svgContent}</code>
                  </div>
                </div>
              </div>
            )}
          </Space>
        </Card>

        <Card
          title={
            <Space>
              <Download size={20} />
              <span>文件下载测试 ($download)</span>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph>
              使用 <Text code>$download()</Text> 方法下载文件（Excel, PDF 等），返回{' '}
              <Text code>Promise&lt;Blob&gt;</Text>。
            </Paragraph>
            <Button
              type="primary"
              icon={<Download size={16} />}
              onClick={async () => {
                setLoadingDownload(true)
                try {
                  const blob = await apiClient.api.admin.todos.export.$download()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'todos.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                  message.success('文件下载成功')
                } catch (error) {
                  console.error('Failed to download:', error)
                  message.error('文件下载失败')
                } finally {
                  setLoadingDownload(false)
                }
              }}
              loading={loadingDownload}
            >
              导出 Todos 为 CSV
            </Button>
          </Space>
        </Card>

        <Card title="代码示例">
          <pre
            style={{
              background: '#f5f5f5',
              padding: 16,
              borderRadius: 8,
              overflow: 'auto',
            }}
          >
            {`// 获取图片 (返回 Blob)
const blob = await apiClient.api.admin.avatar[':id'].$image({
  param: { id: 'test-user' },
})
const imageUrl = URL.createObjectURL(blob)
document.querySelector('img').src = imageUrl

// 获取 SVG (返回 string)
const svgString = await apiClient.api.admin.icon[':name'].$svg({
  param: { name: 'home' },
})
document.querySelector('#icon-container').innerHTML = svgString

// 下载文件 (返回 Blob)
const fileBlob = await apiClient.api.admin.todos.export.$download()
const url = URL.createObjectURL(fileBlob)
const a = document.createElement('a')
a.href = url
a.download = 'todos.csv'
a.click()
URL.revokeObjectURL(url)`}
          </pre>
        </Card>
      </Space>
    </div>
  )
}
