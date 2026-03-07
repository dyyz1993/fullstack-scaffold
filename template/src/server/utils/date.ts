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
