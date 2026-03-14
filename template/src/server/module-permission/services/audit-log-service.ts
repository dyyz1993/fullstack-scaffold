import type {
  PermissionAuditLog,
  NewPermissionAuditLog,
} from '../../db/schema/permission-audit-logs'

let auditLogs: PermissionAuditLog[] = []

export class AuditLogService {
  async create(data: NewPermissionAuditLog): Promise<PermissionAuditLog> {
    const log: PermissionAuditLog = {
      id: data.id,
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId ?? null,
      oldValue: data.oldValue ?? null,
      newValue: data.newValue ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      createdAt: new Date(),
    }
    auditLogs.push(log)
    return log
  }

  async getAll(limit = 50, offset = 0): Promise<PermissionAuditLog[]> {
    return auditLogs
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(offset, offset + limit)
  }

  async getByUserId(userId: string, limit = 50): Promise<PermissionAuditLog[]> {
    return auditLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, limit)
  }

  async getByResource(resourceType: string, resourceId?: string): Promise<PermissionAuditLog[]> {
    return auditLogs
      .filter(
        log => log.resourceType === resourceType && (!resourceId || log.resourceId === resourceId)
      )
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
  }

  async search(query: {
    userId?: string
    action?: string
    resourceType?: string
    startDate?: Date
    endDate?: Date
  }): Promise<PermissionAuditLog[]> {
    return auditLogs
      .filter(log => {
        if (query.userId && log.userId !== query.userId) return false
        if (query.action && log.action !== query.action) return false
        if (query.resourceType && log.resourceType !== query.resourceType) return false
        if (query.startDate && log.createdAt && log.createdAt < query.startDate) return false
        if (query.endDate && log.createdAt && log.createdAt > query.endDate) return false
        return true
      })
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const initialLength = auditLogs.length
    auditLogs = auditLogs.filter(log => log.createdAt && log.createdAt >= cutoff)

    return initialLength - auditLogs.length
  }
}

export const auditLogService = new AuditLogService()
