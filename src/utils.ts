export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: '项目名称不能为空' }
  }
  const trimmed = name.trim()
  if (trimmed.length > 214) {
    return { valid: false, error: '项目名称不能超过 214 个字符' }
  }
  if (/^\./.test(trimmed)) {
    return { valid: false, error: '项目名称不能以 . 开头' }
  }
  if (/^_/.test(trimmed)) {
    return { valid: false, error: '项目名称不能以 _ 开头' }
  }
  if (/[A-Z]/.test(trimmed)) {
    return { valid: false, error: '项目名称不能包含大写字母' }
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, error: '项目名称不能包含空格' }
  }
  if (trimmed.includes('..') || trimmed.includes('//')) {
    return { valid: false, error: '项目名称不能包含 .. 或 //' }
  }
  if (!/^[a-z0-9@/_-]+$/.test(trimmed)) {
    return { valid: false, error: '项目名称只能包含小写字母、数字、@、/、_、-' }
  }
  return { valid: true }
}

export function generateDbName(projectName: string): string {
  const sanitized = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const name = sanitized || 'app'
  return `${name}-db`
}
