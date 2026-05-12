/**
 * Bridge between zod v4 (template) and xcli-core's zod v3 types.
 *
 * xcli-core uses zod v3 internally, but the template uses zod v4.
 * At runtime, both versions' .parse() methods work the same way.
 * This helper bridges the type mismatch at the xcli-core boundary.
 */
import type { ZodType } from 'zod'
import type { SiteInstance } from '@dyyz1993/xcli-core'

type XcliCommandConfig = Parameters<SiteInstance['command']>[1]
type XcliSchema = NonNullable<XcliCommandConfig['parameters']>

/**
 * Cast a zod v4 schema for xcli-core's site.command() parameters field.
 * xcli-core's TypeScript types expect zod v3 ZodSchema, which is
 * structurally different from zod v4's ZodType. However, the runtime
 * .parse() API is identical, so this cast is safe.
 */
export function asXcliSchema<T extends ZodType>(schema: T): XcliSchema {
  return schema as unknown as XcliSchema
}
