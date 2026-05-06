import type { ResolvedPreset } from "./template-generator";

export function generateAuthUtils(_resolved: ResolvedPreset): string {
  return `import type { Context } from 'hono'
import type { AuthUser } from '../middleware/auth'

export function getAuthUser(c: Context): AuthUser {
  return c.get('authUser')
}
`;
}
