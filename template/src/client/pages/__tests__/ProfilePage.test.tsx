import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { ProfilePage } from '../ProfilePage'
import type { DeveloperProfile } from '@shared/schemas'

// prefer-shared-types：user 字段从 shared 的 DeveloperProfile 派生，避免与
// LoginResponse 等共享类型形状漂移；整体用交叉类型表达「认证态子集」
type MockUser = Pick<DeveloperProfile, 'id' | 'username' | 'role'>

type MockAuthStore = { isAuthenticated: boolean } & {
  token: string | null
  user: MockUser | null
}

const mockAuthState: MockAuthStore = {
  token: null,
  isAuthenticated: false,
  user: null,
}

vi.mock('@client/stores/authStore', () => ({
  useAuthStore: Object.assign(
    vi.fn((selector?: (state: MockAuthStore) => unknown) => {
      if (selector) {
        return selector(mockAuthState)
      }
      return mockAuthState
    }),
    {
      getState: () => mockAuthState,
    }
  ),
}))

// vi.mock 工厂会被提升到文件顶部，const 声明还未初始化；必须用 vi.hoisted
// 让 mock 与工厂一起提升，否则 "Cannot access 'profileGet' before initialization"
const profileGet = vi.hoisted(() => vi.fn())

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      profile: {
        $get: profileGet,
      },
    },
  },
}))

function renderProfilePage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </HelmetProvider>
  )
}

describe('ProfilePage 游客态（历史 P2：游客渲染 Jane Doe 硬编码假档案）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState.token = null
    mockAuthState.isAuthenticated = false
    mockAuthState.user = null
  })

  it('游客看到登录引导卡，不渲染任何模拟档案数据', () => {
    renderProfilePage()

    expect(screen.getByTestId('profile-login-guide')).toBeInTheDocument()
    expect(screen.getByText('登录后查看个人主页')).toBeInTheDocument()
    expect(screen.getByTestId('profile-login-button')).toHaveAttribute('href', '/login')
    expect(screen.getByTestId('profile-register-button')).toHaveAttribute('href', '/register')
  })

  it('游客态不出现 Jane Doe 假档案，也不渲染统计/编辑入口', () => {
    renderProfilePage()

    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument()
    expect(screen.queryByText(/Joined/)).not.toBeInTheDocument()
  })

  it('游客态不请求受保护的 /profile 接口', () => {
    renderProfilePage()

    expect(profileGet).not.toHaveBeenCalled()
  })
})

describe('ProfilePage 登录态', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState.token = 'jwt-token'
    mockAuthState.isAuthenticated = true
    mockAuthState.user = { id: 'dev-1', username: 'alice', role: 'developer' }
    profileGet.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'dev-1',
            username: 'alice',
            email: 'alice@example.com',
            bio: null,
            joinDate: new Date().toISOString(),
            stats: { posts: 1, followers: 2, following: 3 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
  })

  it('渲染当前登录用户的用户名', async () => {
    renderProfilePage()

    // /profile 为异步请求，loading 期间不渲染 profile-page，需等待加载完成
    await waitFor(() => expect(screen.getByTestId('profile-page')).toBeInTheDocument())
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('不显示登录引导卡', () => {
    renderProfilePage()

    expect(screen.queryByTestId('profile-login-guide')).not.toBeInTheDocument()
  })

  it('identity 版 stats（posts/followers/following）不覆盖本页 topics/replies/likes 口径', async () => {
    renderProfilePage()

    await waitFor(() => expect(profileGet).toHaveBeenCalled())
    // 等待异步加载完成后再断言（loading 期间统计区不可见）
    await waitFor(() => expect(screen.getByTestId('profile-page')).toBeInTheDocument())
    // Topics/Replies/Likes 三项均保持默认 0，而非被错误形状覆盖
    expect(screen.getAllByText('0')).toHaveLength(3)
  })
})
