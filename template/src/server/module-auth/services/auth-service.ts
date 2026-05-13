import { eq, or } from 'drizzle-orm'
import { hashSync, compareSync } from 'bcryptjs'
import type { DeveloperProfile, LoginInput, RegisterInput } from '@shared/modules/auth'
import { getDb } from '@server/db'
import { developers, type DeveloperTable } from '@server/db/schema'
import { ConflictError, AuthenticationError } from '@server/utils/app-error'
import { generateUUID } from '@server/utils/uuid'
import { toISOString } from '@server/utils/date'

// eslint-disable-next-line local-rules/no-util-functions-in-service -- module-specific row-to-profile mapping
function toProfile(row: DeveloperTable): DeveloperProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    createdAt: toISOString(row.createdAt),
  }
}

export async function registerDeveloper(
  input: RegisterInput
): Promise<{ profile: DeveloperProfile }> {
  const db = await getDb()

  const existing = await db
    .select()
    .from(developers)
    .where(or(eq(developers.email, input.email), eq(developers.username, input.username)))

  if (existing.length > 0) {
    const field = existing[0].email === input.email ? 'email' : 'username'
    throw ConflictError.duplicateEntry(field, input[field as 'email' | 'username'] ?? '')
  }

  const id = generateUUID()
  const apiKey = `ak_${generateUUID()}`
  const passwordHash = hashSync(input.password, 10)
  const now = new Date()

  await db.insert(developers).values({
    id,
    username: input.username,
    email: input.email,
    passwordHash,
    apiKey,
    createdAt: now,
    updatedAt: now,
  })

  const rows = await db.select().from(developers).where(eq(developers.id, id))
  return { profile: toProfile(rows[0]) }
}

export async function loginDeveloper(input: LoginInput): Promise<{ profile: DeveloperProfile }> {
  const db = await getDb()

  const identifier = input.account || input.email
  if (!identifier) {
    throw new AuthenticationError('Account or email is required')
  }

  const rows = await db
    .select()
    .from(developers)
    .where(or(eq(developers.email, identifier), eq(developers.username, identifier)))

  if (rows.length === 0) {
    throw new AuthenticationError('Invalid credentials')
  }

  const developer = rows[0]
  if (!compareSync(input.password, developer.passwordHash)) {
    throw new AuthenticationError('Invalid credentials')
  }

  return { profile: toProfile(developer) }
}

export async function verifyApiKey(apiKey: string): Promise<DeveloperProfile> {
  const db = await getDb()

  const rows = await db.select().from(developers).where(eq(developers.apiKey, apiKey))

  if (rows.length === 0) {
    throw new AuthenticationError('Invalid API key')
  }

  return toProfile(rows[0])
}

export async function getDeveloperById(id: string): Promise<DeveloperProfile | null> {
  const db = await getDb()

  const rows = await db.select().from(developers).where(eq(developers.id, id))

  if (rows.length === 0) return null

  return toProfile(rows[0])
}
