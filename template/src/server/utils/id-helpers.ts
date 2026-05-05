export function parseModuleId(prefix: string, id: string): number {
  const num = parseInt(id.replace(`${prefix}-`, ''), 10)
  if (isNaN(num)) return -1
  return num
}
