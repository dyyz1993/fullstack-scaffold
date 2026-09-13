export function toISOString(date: Date): string {
  return date.toISOString()
}

export function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toISOString()
}

export function parseDate(dateString: string): Date {
  return new Date(dateString)
}

export function getTimestamp(): number {
  return Date.now()
}

export function transformDateField(date: Date | null | undefined): string {
  return date?.toISOString() ?? new Date().toISOString()
}

export interface RoleWithDates {
  id: string
  createdAt: Date | null
  updatedAt: Date | null
}

export function transformRole<T extends RoleWithDates>(
  role: T
): Omit<T, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string } {
  return {
    ...role,
    createdAt: transformDateField(role.createdAt),
    updatedAt: transformDateField(role.updatedAt),
  }
}

export interface AuditLogWithDate {
  id: string
  createdAt: Date | null
}

export function transformAuditLog<T extends AuditLogWithDate>(
  log: T
): Omit<T, 'createdAt'> & { createdAt: string } {
  return {
    ...log,
    createdAt: transformDateField(log.createdAt),
  }
}

/**
 * TEXT 时间列的历史形态归一化：共享演示库部分行存毫秒数字串
 * （"1789000000000"），运行时写入存 ISO 串。统一归一化为 ISO 输出，
 * 避免前端 new Date("1789000000000") 得到 Invalid Date。
 */
export function normalizeTimestamp(value: string | null): string | null {
  if (!value) return null
  if (/^\d+$/.test(value)) {
    return new Date(Number(value)).toISOString()
  }
  return value
}
