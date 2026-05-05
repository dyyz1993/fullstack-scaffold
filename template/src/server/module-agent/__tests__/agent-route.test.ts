import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const mockDir = path.resolve(__dirname, '../data/mock')

describe('Agent Route - Data Validation', () => {
  it('should provide mock data files for all scenarios', () => {
    const scenariosPath = path.join(mockDir, 'scenarios.json')
    const { scenarios } = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'))
    const jsonlFiles = fs.readdirSync(mockDir).filter(f => f.endsWith('.jsonl'))
    expect(jsonlFiles.length).toBeGreaterThanOrEqual(scenarios.length)
  })

  it('should have consistent jsonl line format across mock files', () => {
    const jsonlFiles = fs.readdirSync(mockDir).filter(f => f.endsWith('.jsonl'))
    for (const file of jsonlFiles) {
      const content = fs.readFileSync(path.join(mockDir, file), 'utf-8').trim()
      const lines = content.split('\n')
      for (const line of lines) {
        const parsed = JSON.parse(line)
        expect(parsed).toBeDefined()
      }
    }
  })

  it('should load all mock data without errors', () => {
    const files = fs.readdirSync(mockDir)
    for (const file of files) {
      const content = fs.readFileSync(path.join(mockDir, file), 'utf-8')
      if (file.endsWith('.json')) {
        expect(() => JSON.parse(content)).not.toThrow()
      } else if (file.endsWith('.jsonl')) {
        const lines = content.trim().split('\n')
        for (const line of lines) {
          expect(() => JSON.parse(line)).not.toThrow()
        }
      }
    }
  })

  it('should have scenarios with required fields', () => {
    const scenariosPath = path.join(mockDir, 'scenarios.json')
    const { scenarios } = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'))
    for (const scenario of scenarios) {
      expect(scenario).toHaveProperty('triggers')
      expect(scenario).toHaveProperty('dataFile')
      expect(Array.isArray(scenario.triggers)).toBe(true)
      expect(scenario.triggers.length).toBeGreaterThan(0)
    }
  })

  it('should have non-empty jsonl files', () => {
    const jsonlFiles = fs.readdirSync(mockDir).filter(f => f.endsWith('.jsonl'))
    for (const file of jsonlFiles) {
      const content = fs.readFileSync(path.join(mockDir, file), 'utf-8').trim()
      expect(content.length).toBeGreaterThan(0)
    }
  })
})
