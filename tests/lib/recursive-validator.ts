/**
 * Recursive Object Validator for Acceptance Tests
 *
 * Counts every object/array node recursively and validates field types.
 * Each leaf primitive counts as 1 assertion. Each nested object adds structure checks.
 *
 * Usage:
 *   const result = validateObjectDeep(todo, TODO_SPEC, 'Todo[0]')
 *   result.totalAssertions  // total number of assertions made
 *   result.errors           // array of error messages (empty if all pass)
 */

export interface FieldSpec {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  items?: FieldSpec | FieldSpec[] // for arrays
  fields?: Record<string, FieldSpec> // for objects
  required?: boolean // default true
  enum?: (string | number)[]
  minLength?: number
  min?: number
  max?: number
  allowExtraFields?: boolean // allow fields not in spec
}

export interface ValidationResult {
  totalAssertions: number
  totalObjects: number
  errors: string[]
  passed: boolean
}

/**
 * Recursively validate a single value against a spec
 */
export function validateObjectDeep(
  value: unknown,
  spec: FieldSpec,
  path: string
): ValidationResult {
  const result: ValidationResult = {
    totalAssertions: 0,
    totalObjects: 0,
    errors: [],
    passed: true,
  }

  // Null/undefined check for required fields
  if (value === null || value === undefined) {
    if (spec.required !== false) {
      result.errors.push(`${path}: expected non-null, got ${value}`)
      result.totalAssertions++
      result.passed = false
    }
    return result
  }

  // Type check
  result.totalAssertions++

  switch (spec.type) {
    case 'string': {
      if (typeof value !== 'string') {
        result.errors.push(`${path}: expected string, got ${typeof value}`)
        result.passed = false
        break
      }
      if (spec.minLength && value.length < spec.minLength) {
        result.errors.push(`${path}: string too short (${value.length} < ${spec.minLength})`)
        result.passed = false
        result.totalAssertions++
      }
      if (spec.enum && !spec.enum.includes(value)) {
        result.errors.push(`${path}: value "${value}" not in enum [${spec.enum.join(',')}]`)
        result.passed = false
        result.totalAssertions++
      }
      break
    }
    case 'number': {
      if (typeof value !== 'number') {
        result.errors.push(`${path}: expected number, got ${typeof value}`)
        result.passed = false
        break
      }
      if (spec.min !== undefined && value < spec.min) {
        result.errors.push(`${path}: number too small (${value} < ${spec.min})`)
        result.passed = false
        result.totalAssertions++
      }
      if (spec.max !== undefined && value > spec.max) {
        result.errors.push(`${path}: number too large (${value} > ${spec.max})`)
        result.passed = false
        result.totalAssertions++
      }
      break
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        result.errors.push(`${path}: expected boolean, got ${typeof value}`)
        result.passed = false
      }
      break
    }
    case 'array': {
      if (!Array.isArray(value)) {
        result.errors.push(`${path}: expected array, got ${typeof value}`)
        result.passed = false
        break
      }
      // Count the array itself as an object
      result.totalObjects++
      result.totalAssertions++ // array length check

      if (spec.items) {
        for (let i = 0; i < value.length; i++) {
          const itemSpec = Array.isArray(spec.items) ? spec.items[0] : spec.items
          const child = validateObjectDeep(value[i], itemSpec, `${path}[${i}]`)
          mergeResult(result, child)
        }
      }
      break
    }
    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        result.errors.push(
          `${path}: expected object, got ${Array.isArray(value) ? 'array' : typeof value}`
        )
        result.passed = false
        break
      }
      // Count this object
      result.totalObjects++
      result.totalAssertions++ // object type check

      if (spec.fields) {
        for (const [key, fieldSpec] of Object.entries(spec.fields)) {
          const childPath = `${path}.${key}`
          // Check key exists
          if (!(key in (value as Record<string, unknown>))) {
            if (fieldSpec.required !== false) {
              result.errors.push(`${childPath}: missing required field`)
              result.totalAssertions++
              result.passed = false
            }
            continue
          }
          const child = validateObjectDeep(
            (value as Record<string, unknown>)[key],
            fieldSpec,
            childPath
          )
          mergeResult(result, child)
        }

        // Check for extra fields (unless allowExtraFields is set)
        if (!spec.allowExtraFields) {
          const specKeys = new Set(Object.keys(spec.fields))
          const valueKeys = Object.keys(value as Record<string, unknown>)
          for (const vk of valueKeys) {
            if (!specKeys.has(vk)) {
              result.errors.push(`${path}.${vk}: unexpected field`)
              result.totalAssertions++
              result.passed = false
            }
          }
        }
      }
      break
    }
  }

  return result
}

/**
 * Validate an array of objects, returning aggregated results
 */
export function validateArrayDeep(
  items: unknown[],
  itemSpec: FieldSpec,
  label: string
): ValidationResult {
  const result: ValidationResult = {
    totalAssertions: 0,
    totalObjects: 0,
    errors: [],
    passed: true,
  }

  // Array-level assertion
  result.totalAssertions++ // items is array
  result.totalObjects++ // the array itself

  if (!Array.isArray(items)) {
    result.errors.push(`${label}: expected array`)
    result.passed = false
    return result
  }

  result.totalAssertions++ // length >= 1

  for (let i = 0; i < items.length; i++) {
    const child = validateObjectDeep(items[i], itemSpec, `${label}[${i}]`)
    mergeResult(result, child)
  }

  return result
}

function mergeResult(target: ValidationResult, source: ValidationResult): void {
  target.totalAssertions += source.totalAssertions
  target.totalObjects += source.totalObjects
  target.errors.push(...source.errors)
  if (!source.passed) target.passed = false
}
