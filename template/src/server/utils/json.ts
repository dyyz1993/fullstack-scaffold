export function parseJsonField<T>(field: string | null | undefined): T | undefined {
  if (!field) return undefined
  try {
    return JSON.parse(field) as T
  } catch {
    return undefined
  }
}

export function serializeJsonField<T>(value: T | undefined | null): string | null {
  if (value === undefined || value === null) return null
  return JSON.stringify(value)
}
