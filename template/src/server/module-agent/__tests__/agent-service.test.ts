import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const mockDir = path.resolve(__dirname, '../data/mock')

describe('Agent Service - Mock Data', () => {
  it('should have mock directory with files', () => {
    expect(fs.existsSync(mockDir)).toBe(true)
    const files = fs.readdirSync(mockDir)
    expect(files.length).toBeGreaterThan(0)
  })

  it('should have valid scenarios.json', () => {
    const scenariosPath = path.join(mockDir, 'scenarios.json')
    expect(fs.existsSync(scenariosPath)).toBe(true)
    const content = fs.readFileSync(scenariosPath, 'utf-8')
    const parsed = JSON.parse(content)
    expect(parsed).toHaveProperty('scenarios')
    expect(Array.isArray(parsed.scenarios)).toBe(true)
  })

  it('should have valid hello.jsonl entries', () => {
    const helloPath = path.join(mockDir, 'hello.jsonl')
    expect(fs.existsSync(helloPath)).toBe(true)
    const lines = fs.readFileSync(helloPath, 'utf-8').trim().split('\n')
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow()
    }
  })

  it('should have valid error.jsonl entries', () => {
    const errorPath = path.join(mockDir, 'error.jsonl')
    expect(fs.existsSync(errorPath)).toBe(true)
    const lines = fs.readFileSync(errorPath, 'utf-8').trim().split('\n')
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow()
    }
  })

  it('should have valid search.jsonl entries', () => {
    const searchPath = path.join(mockDir, 'search.jsonl')
    expect(fs.existsSync(searchPath)).toBe(true)
    const lines = fs.readFileSync(searchPath, 'utf-8').trim().split('\n')
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow()
    }
  })

  it('should have scenario references matching jsonl files', () => {
    const scenariosPath = path.join(mockDir, 'scenarios.json')
    const { scenarios } = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'))
    const mockFiles = fs.readdirSync(mockDir)
    for (const scenario of scenarios) {
      if (scenario.dataFile) {
        expect(mockFiles).toContain(scenario.dataFile)
      }
    }
  })
})
