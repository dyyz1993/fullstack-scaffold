import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateProjectName, generateDbName, escapeRegExp } from './utils.js'

describe('escapeRegExp', () => {
  it('should escape special regex characters', () => {
    assert.strictEqual(escapeRegExp('hello.world'), 'hello\\.world')
    assert.strictEqual(escapeRegExp('test*name'), 'test\\*name')
    assert.strictEqual(escapeRegExp('a+b'), 'a\\+b')
    assert.strictEqual(escapeRegExp('foo(bar)'), 'foo\\(bar\\)')
    assert.strictEqual(escapeRegExp('a[b]c'), 'a\\[b\\]c')
    assert.strictEqual(escapeRegExp('$100'), '\\$100')
    assert.strictEqual(escapeRegExp('a|b'), 'a\\|b')
  })

  it('should return unchanged string without special chars', () => {
    assert.strictEqual(escapeRegExp('hello'), 'hello')
    assert.strictEqual(escapeRegExp('my-app'), 'my-app')
    assert.strictEqual(escapeRegExp('test123'), 'test123')
  })
})

describe('validateProjectName', () => {
  it('should reject empty string', () => {
    assert.strictEqual(validateProjectName('').valid, false)
  })

  it('should reject whitespace-only string', () => {
    assert.strictEqual(validateProjectName('   ').valid, false)
  })

  it('should reject names starting with dot', () => {
    assert.strictEqual(validateProjectName('.hidden').valid, false)
  })

  it('should reject names starting with underscore', () => {
    assert.strictEqual(validateProjectName('_private').valid, false)
  })

  it('should reject names with uppercase letters', () => {
    assert.strictEqual(validateProjectName('MyApp').valid, false)
  })

  it('should reject names with spaces', () => {
    assert.strictEqual(validateProjectName('my app').valid, false)
  })

  it('should reject names exceeding 214 characters', () => {
    const longName = 'a'.repeat(215)
    assert.strictEqual(validateProjectName(longName).valid, false)
  })

  it('should reject names with special characters', () => {
    assert.strictEqual(validateProjectName('my@app!test').valid, false)
  })

  it('should reject names with path traversal', () => {
    assert.strictEqual(validateProjectName('../evil').valid, false)
    assert.strictEqual(validateProjectName('foo/..').valid, false)
    assert.strictEqual(validateProjectName('a//b').valid, false)
  })

  it('should accept valid lowercase names', () => {
    assert.strictEqual(validateProjectName('my-app').valid, true)
    assert.strictEqual(validateProjectName('my_app').valid, true)
    assert.strictEqual(validateProjectName('myapp123').valid, true)
    assert.strictEqual(validateProjectName('@scope/app').valid, true)
  })

  it('should accept name at max length', () => {
    const name = 'a'.repeat(214)
    assert.strictEqual(validateProjectName(name).valid, true)
  })
})

describe('generateDbName', () => {
  it('should generate db name from project name', () => {
    assert.strictEqual(generateDbName('my-app'), 'my-app-db')
    assert.strictEqual(generateDbName('test'), 'test-db')
  })

  it('should sanitize special characters', () => {
    assert.strictEqual(generateDbName('My App'), 'my-app-db')
    assert.strictEqual(generateDbName('test@project'), 'test-project-db')
  })

  it('should collapse multiple hyphens', () => {
    assert.strictEqual(generateDbName('a---b'), 'a-b-db')
  })

  it('should trim leading/trailing hyphens', () => {
    assert.strictEqual(generateDbName('-test-'), 'test-db')
  })

  it('should fallback to app for empty sanitized result', () => {
    assert.strictEqual(generateDbName('!!!'), 'app-db')
    assert.strictEqual(generateDbName(''), 'app-db')
  })
})
