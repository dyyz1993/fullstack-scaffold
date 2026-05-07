// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../env', () => ({
  isCloudflare: false,
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}))

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(() => Promise.resolve()),
  writeFile: vi.fn(() => Promise.resolve()),
  readFile: vi.fn(() => Promise.resolve(Buffer.from('test data'))),
  unlink: vi.fn(() => Promise.resolve()),
  stat: vi.fn(() => Promise.resolve({ size: 100, mtimeMs: Date.now(), mtime: new Date() })),
  readdir: vi.fn(() => Promise.resolve([])),
  rm: vi.fn(() => Promise.resolve()),
  rename: vi.fn(() => Promise.resolve()),
}))

import {
  getFileStorageConfig,
  getUploadConfig,
  validateFile,
  saveFile,
  saveToTemp,
  readFileData,
  getFileStream,
  deleteFile,
  moveFile,
  cleanupTempFiles,
  clearNamespace,
  getFilePath,
  getPublicFileUrl,
  getPublicFilePath,
  generateSignature,
  verifySignature,
  getPrivateFileUrl,
  parseSignedUrl,
  getFileUrl,
  fileExists,
  getFileInfo,
  sanitizeCsvField,
} from '../file-storage'

import { existsSync } from 'fs'
import { mkdir, writeFile, readFile, unlink, stat, readdir, rm, rename } from 'fs/promises'

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>
const mockMkdir = mkdir as ReturnType<typeof vi.fn>
const mockWriteFile = writeFile as ReturnType<typeof vi.fn>
const mockReadFile = readFile as ReturnType<typeof vi.fn>
const mockUnlink = unlink as ReturnType<typeof vi.fn>
const mockStat = stat as ReturnType<typeof vi.fn>
const mockReaddir = readdir as ReturnType<typeof vi.fn>
const mockRm = rm as ReturnType<typeof vi.fn>
const mockRename = rename as ReturnType<typeof vi.fn>

const originalEnv = process.env

beforeEach(() => {
  process.env = { ...originalEnv, NODE_ENV: 'test' }
  mockExistsSync.mockReset().mockReturnValue(true)
  mockMkdir.mockReset().mockResolvedValue(undefined)
  mockWriteFile.mockReset().mockResolvedValue(undefined)
  mockReadFile.mockReset().mockResolvedValue(Buffer.from('test data'))
  mockUnlink.mockReset().mockResolvedValue(undefined)
  mockStat.mockReset().mockResolvedValue({ size: 100, mtimeMs: Date.now(), mtime: new Date() })
  mockReaddir.mockReset().mockResolvedValue([])
  mockRm.mockReset().mockResolvedValue(undefined)
  mockRename.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  process.env = originalEnv
})

describe('file-storage', () => {
  describe('getFileStorageConfig', () => {
    it('should return config with required properties', () => {
      const config = getFileStorageConfig()
      expect(config).toHaveProperty('baseDir')
      expect(config).toHaveProperty('tempDir')
      expect(config).toHaveProperty('tempFileTTL')
      expect(config).toHaveProperty('privateUrlExpiry')
      expect(config).toHaveProperty('secretKey')
      expect(config.secretKey).toBeTruthy()
    })

    it('should return same cached config on subsequent calls', () => {
      const config1 = getFileStorageConfig()
      const config2 = getFileStorageConfig()
      expect(config1).toBe(config2)
    })
  })

  describe('getUploadConfig', () => {
    it('should return config with namespace-based uploadDir', () => {
      const config = getUploadConfig('avatars')
      expect(config.uploadDir).toContain('avatars')
      expect(config.maxFileSize).toBe(10 * 1024 * 1024)
      expect(config.allowedMimeTypes.length).toBeGreaterThan(0)
      expect(config.allowedExtensions.length).toBeGreaterThan(0)
    })

    it('should accept overrides', () => {
      const config = getUploadConfig('test', {
        maxFileSize: 1000,
        allowedMimeTypes: ['image/png'],
        allowedExtensions: ['.png'],
      })
      expect(config.maxFileSize).toBe(1000)
      expect(config.allowedMimeTypes).toEqual(['image/png'])
      expect(config.allowedExtensions).toEqual(['.png'])
    })
  })

  describe('validateFile', () => {
    it('should reject files exceeding max size', () => {
      const config = getUploadConfig('test')
      const result = validateFile({ name: 'a.png', type: 'image/png', size: 999999999 }, config)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds')
    })

    it('should reject disallowed mime types', () => {
      const config = getUploadConfig('test')
      const result = validateFile(
        { name: 'a.exe', type: 'application/x-executable', size: 100 },
        config
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should reject disallowed extensions', () => {
      const config = getUploadConfig('test', {
        allowedMimeTypes: ['image/png'],
        allowedExtensions: ['.png'],
      })
      const result = validateFile({ name: 'a.exe', type: 'image/png', size: 100 }, config)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('extension')
    })

    it('should accept valid files', () => {
      const config = getUploadConfig('test')
      const result = validateFile({ name: 'photo.png', type: 'image/png', size: 100 }, config)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('saveFile', () => {
    it('should save a valid file and return UploadedFile', async () => {
      const result = await saveFile('test', {
        name: 'photo.png',
        type: 'image/png',
        size: 100,
        data: new ArrayBuffer(10),
      })
      expect(result).toHaveProperty('filename')
      expect(result).toHaveProperty('originalName', 'photo.png')
      expect(result).toHaveProperty('mimeType', 'image/png')
      expect(result).toHaveProperty('size', 100)
      expect(result).toHaveProperty('path')
      expect(result).toHaveProperty('extension', '.png')
    })

    it('should throw for invalid file', async () => {
      await expect(
        saveFile('test', { name: 'a.exe', type: 'bad/type', size: 100, data: new ArrayBuffer(10) })
      ).rejects.toThrow()
    })

    it('should create directory if not exists', async () => {
      mockExistsSync.mockReturnValue(false)
      await saveFile('new-ns', {
        name: 'photo.png',
        type: 'image/png',
        size: 100,
        data: new ArrayBuffer(10),
      })
      expect(mockMkdir).toHaveBeenCalled()
    })
  })

  describe('saveToTemp', () => {
    it('should save to temp directory', async () => {
      const result = await saveToTemp({
        name: 'temp.png',
        type: 'image/png',
        size: 50,
        data: new ArrayBuffer(10),
      })
      expect(result).toHaveProperty('filename')
      expect(result.originalName).toBe('temp.png')
    })
  })

  describe('readFileData', () => {
    it('should read existing file', async () => {
      const data = await readFileData('/path/to/file.png')
      expect(data).toBeInstanceOf(Buffer)
    })

    it('should throw if file not found', async () => {
      mockExistsSync.mockReturnValueOnce(false)
      await expect(readFileData('/no/file')).rejects.toThrow('File not found')
    })
  })

  describe('getFileStream', () => {
    it('should return ReadableStream for existing file', async () => {
      const stream = await getFileStream('/path/to/file.png')
      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('should throw if file not found', async () => {
      mockExistsSync.mockReturnValueOnce(false)
      await expect(getFileStream('/no/file')).rejects.toThrow('File not found')
    })
  })

  describe('deleteFile', () => {
    it('should return true when file exists and deleted', async () => {
      const result = await deleteFile('/path/to/file')
      expect(result).toBe(true)
      expect(mockUnlink).toHaveBeenCalled()
    })

    it('should return true when file does not exist', async () => {
      mockExistsSync.mockReturnValueOnce(false)
      const result = await deleteFile('/no/file')
      expect(result).toBe(true)
    })

    it('should return false on unlink error', async () => {
      mockUnlink.mockRejectedValueOnce(new Error('permission denied'))
      const result = await deleteFile('/locked/file')
      expect(result).toBe(false)
    })
  })

  describe('moveFile', () => {
    it('should move file to namespace dir', async () => {
      const dest = await moveFile('/tmp/abc.png', 'uploads')
      expect(dest).toContain('uploads')
      expect(mockRename).toHaveBeenCalled()
    })

    it('should use UUID if path has no filename', async () => {
      const dest = await moveFile('/', 'ns')
      expect(dest).toBeTruthy()
    })
  })

  describe('cleanupTempFiles', () => {
    it('should return zeroed when temp dir does not exist', async () => {
      mockExistsSync.mockReturnValueOnce(false)
      const result = await cleanupTempFiles()
      expect(result).toEqual({ deleted: 0, errors: 0 })
    })

    it('should delete expired temp files', async () => {
      mockReaddir.mockResolvedValueOnce(['old.txt'] as unknown as string[])
      mockStat.mockResolvedValueOnce({ mtimeMs: Date.now() - 999999999 })
      const result = await cleanupTempFiles()
      expect(result.deleted).toBe(1)
    })

    it('should skip non-expired temp files', async () => {
      mockReaddir.mockResolvedValueOnce(['new.txt'] as unknown as string[])
      mockStat.mockResolvedValueOnce({ mtimeMs: Date.now() })
      const result = await cleanupTempFiles()
      expect(result.deleted).toBe(0)
    })

    it('should count errors on stat failure', async () => {
      mockReaddir.mockResolvedValueOnce(['bad.txt'] as unknown as string[])
      mockStat.mockRejectedValueOnce(new Error('permission denied'))
      const result = await cleanupTempFiles()
      expect(result.errors).toBe(1)
    })
  })

  describe('clearNamespace', () => {
    it('should return zeroed when dir does not exist', async () => {
      mockExistsSync.mockReturnValueOnce(false)
      const result = await clearNamespace('nope')
      expect(result).toEqual({ deleted: 0, errors: 0 })
    })

    it('should remove namespace dir', async () => {
      const result = await clearNamespace('avatars')
      expect(result).toEqual({ deleted: 1, errors: 0 })
    })

    it('should count errors on rm failure', async () => {
      mockRm.mockRejectedValueOnce(new Error('fail'))
      const result = await clearNamespace('avatars')
      expect(result).toEqual({ deleted: 0, errors: 1 })
    })
  })

  describe('getFilePath', () => {
    it('should join baseDir, namespace, and filename', () => {
      const path = getFilePath('avatars', 'pic.png')
      expect(path).toContain('avatars')
      expect(path).toContain('pic.png')
    })
  })

  describe('getPublicFileUrl', () => {
    it('should return relative url without baseUrl', () => {
      expect(getPublicFileUrl('ns', 'f.png')).toBe('/files/public/ns/f.png')
    })

    it('should return absolute url with baseUrl', () => {
      expect(getPublicFileUrl('ns', 'f.png', 'https://example.com')).toBe(
        'https://example.com/files/public/ns/f.png'
      )
    })
  })

  describe('getPublicFilePath', () => {
    it('should return path string', () => {
      expect(getPublicFilePath('ns', 'f.png')).toBe('/files/public/ns/f.png')
    })
  })

  describe('generateSignature and verifySignature', () => {
    it('should generate and verify matching signature', () => {
      const sig = generateSignature('ns', 'f.png', 9999)
      expect(verifySignature('ns', 'f.png', 9999, sig)).toBe(true)
    })

    it('should reject wrong signature', () => {
      expect(verifySignature('ns', 'f.png', 9999, 'badsig')).toBe(false)
    })

    it('should reject wrong namespace', () => {
      const sig = generateSignature('ns1', 'f.png', 9999)
      expect(verifySignature('ns2', 'f.png', 9999, sig)).toBe(false)
    })
  })

  describe('getPrivateFileUrl', () => {
    it('should generate signed url without baseUrl', () => {
      const result = getPrivateFileUrl('ns', 'f.png')
      expect(result.url).toContain('/files/private/ns/f.png')
      expect(result.url).toContain('expiry=')
      expect(result.url).toContain('signature=')
      expect(result.expiry).toBeGreaterThan(0)
    })

    it('should generate signed url with baseUrl', () => {
      const result = getPrivateFileUrl('ns', 'f.png', 60, 'https://example.com')
      expect(result.url).toContain('https://example.com/files/private/')
    })

    it('should use custom expiry seconds', () => {
      const result = getPrivateFileUrl('ns', 'f.png', 120)
      expect(result.expiry).toBeGreaterThan(Math.floor(Date.now() / 1000) + 100)
    })
  })

  describe('parseSignedUrl', () => {
    it('should parse valid private url', () => {
      const result = parseSignedUrl('/files/private/avatars/pic.png')
      expect(result).toEqual({
        namespace: 'avatars',
        filename: 'pic.png',
        expiry: 0,
        signature: '',
      })
    })

    it('should return null for non-matching path', () => {
      expect(parseSignedUrl('/files/public/avatars/pic.png')).toBeNull()
      expect(parseSignedUrl('/invalid')).toBeNull()
      expect(parseSignedUrl('')).toBeNull()
    })
  })

  describe('getFileUrl', () => {
    it('should return public url when not private', () => {
      const result = getFileUrl('ns', 'f.png')
      expect(result.isPrivate).toBe(false)
      expect(result.url).toContain('/files/public/')
    })

    it('should return private url when isPrivate', () => {
      const result = getFileUrl('ns', 'f.png', { isPrivate: true })
      expect(result.isPrivate).toBe(true)
      expect(result.url).toContain('/files/private/')
      expect(result.expiry).toBeDefined()
    })

    it('should use baseUrl', () => {
      const result = getFileUrl('ns', 'f.png', undefined, 'https://example.com')
      expect(result.url).toContain('https://example.com')
    })
  })

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      expect(await fileExists('ns', 'f.png')).toBe(true)
    })

    it('should return false when file does not exist', async () => {
      mockExistsSync.mockReturnValueOnce(false)
      expect(await fileExists('ns', 'nope')).toBe(false)
    })
  })

  describe('getFileInfo', () => {
    it('should return file info for existing file', async () => {
      mockStat.mockResolvedValueOnce({ size: 1024, mtime: new Date('2024-01-01') })
      const info = await getFileInfo('ns', 'photo.png')
      expect(info).toEqual({
        size: 1024,
        mimeType: 'image/png',
        lastModified: new Date('2024-01-01'),
      })
    })

    it('should return null for non-existing file', async () => {
      mockExistsSync.mockReturnValueOnce(false)
      expect(await getFileInfo('ns', 'nope')).toBeNull()
    })

    it('should return null on stat error', async () => {
      mockStat.mockRejectedValueOnce(new Error('fail'))
      const info = await getFileInfo('ns', 'bad')
      expect(info).toBeNull()
    })

    it('should map extensions to mime types', async () => {
      mockStat.mockResolvedValueOnce({ size: 100, mtime: new Date() })
      const info = await getFileInfo('ns', 'doc.pdf')
      expect(info!.mimeType).toBe('application/pdf')
    })

    it('should default to octet-stream for unknown extensions', async () => {
      mockStat.mockResolvedValueOnce({ size: 100, mtime: new Date() })
      const info = await getFileInfo('ns', 'file.xyz')
      expect(info!.mimeType).toBe('application/octet-stream')
    })
  })

  describe('sanitizeCsvField', () => {
    it('should quote normal strings', () => {
      expect(sanitizeCsvField('hello')).toBe('"hello"')
    })

    it('should escape double quotes', () => {
      expect(sanitizeCsvField('he"llo')).toBe('"he""llo"')
    })

    it('should prefix dangerous chars', () => {
      expect(sanitizeCsvField('=SUM(A1)')).toBe('"\'=SUM(A1)"')
      expect(sanitizeCsvField('+cmd')).toBe('"\'+cmd"')
      expect(sanitizeCsvField('-cmd')).toBe('"\'-cmd"')
      expect(sanitizeCsvField('@cmd')).toBe('"\'@cmd"')
      expect(sanitizeCsvField('\tcmd')).toBe('"\'\tcmd"')
      expect(sanitizeCsvField('\rcmd')).toBe('"\'\rcmd"')
    })
  })
})
