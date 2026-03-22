import { generateUUID } from './uuid'

export function generateId(prefix: string): string {
  return `${prefix}_${generateUUID().replace(/-/g, '').slice(0, 12)}`
}

export function generateToken(): string {
  return generateUUID().replace(/-/g, '')
}
