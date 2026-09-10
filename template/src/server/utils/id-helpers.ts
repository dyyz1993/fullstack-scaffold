export function parseModuleId(prefix: string, id: string): number {
  const num = parseInt(id.replace(`${prefix}-`, ''), 10)
  if (isNaN(num)) return -1
  return num
}

/** 租户域等文本主键：前缀 + 随机串（tenant_roles/tenant_members/invitations） */
export function generateId(prefix: string): string {
  return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
}

/** 一次性令牌（邀请链接等），48 hex 字符 */
export function generateToken(): string {
  return (
    globalThis.crypto.randomUUID().replace(/-/g, '') +
    globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  )
}
