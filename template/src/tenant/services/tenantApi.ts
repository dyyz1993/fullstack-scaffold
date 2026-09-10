/**
 * 租户控制台 API 层——统一注入认证与租户上下文。
 *
 * token：登录（平台认证 /api/auth/login）后存 localStorage('tenant-token')
 * slug：登录时从 /api/tenants/mine 选定，存 localStorage('current-tenant-slug')
 */

const TOKEN_KEY = 'tenant-token'
const SLUG_KEY = 'current-tenant-slug'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getSlug(): string | null {
  return localStorage.getItem(SLUG_KEY)
}

export function setSlug(slug: string | null): void {
  if (slug) localStorage.setItem(SLUG_KEY, slug)
  else localStorage.removeItem(SLUG_KEY)
}

function headers(json = true): Record<string, string> {
  const h: Record<string, string> = {}
  if (json) h['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  const slug = getSlug()
  if (slug) h['X-Tenant-Slug'] = slug
  return h
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers: headers(),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
    const json = (await res.json()) as ApiResponse<T>
    return { ...json, status: res.status }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
