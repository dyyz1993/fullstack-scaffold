import fs from 'node:fs'
import path from 'node:path'

const MOCK_DIR = path.resolve(import.meta.dirname, '../data/mock')

describe('module-agent mock data', () => {
  test('mock directory exists', () => {
    expect(fs.existsSync(MOCK_DIR)).toBe(true)
    expect(fs.statSync(MOCK_DIR).isDirectory()).toBe(true)
  })

  test('scenarios.json is valid JSON', () => {
    const content = fs.readFileSync(path.join(MOCK_DIR, 'scenarios.json'), 'utf-8')
    const parsed = JSON.parse(content)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
  })

  test('jsonl files contain valid lines', () => {
    const jsonlFiles = fs.readdirSync(MOCK_DIR).filter((f) => f.endsWith('.jsonl'))
    expect(jsonlFiles.length).toBeGreaterThan(0)
    for (const file of jsonlFiles) {
      const lines = fs
        .readFileSync(path.join(MOCK_DIR, file), 'utf-8')
        .trim()
        .split('\n')
        .filter(Boolean)
      expect(lines.length).toBeGreaterThan(0)
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow()
      }
    }
  })
})
