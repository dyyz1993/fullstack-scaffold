import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const TEST_WORKSPACE = path.join(os.tmpdir(), 'sandbox-test-' + Date.now())
const SRT_SETTINGS = path.join(os.homedir(), '.srt-settings.json')

async function runSandboxedCommand(
  command: string
): Promise<{ code: number | null; output: string }> {
  return new Promise(resolve => {
    let output = ''
    const child = spawn(`npx srt "${command}"`, { shell: true, cwd: TEST_WORKSPACE })

    child.stdout?.on('data', data => {
      output += data.toString()
    })

    child.stderr?.on('data', data => {
      output += data.toString()
    })

    child.on('close', code => {
      resolve({ code, output })
    })
  })
}

describe('Sandbox Security Tests', () => {
  let originalSettings: string | null = null

  beforeAll(async () => {
    if (fs.existsSync(SRT_SETTINGS)) {
      originalSettings = fs.readFileSync(SRT_SETTINGS, 'utf-8')
    }

    if (!fs.existsSync(TEST_WORKSPACE)) {
      fs.mkdirSync(TEST_WORKSPACE, { recursive: true })
    }

    const testConfig = {
      network: {
        allowedDomains: ['example.com'],
        deniedDomains: [],
      },
      filesystem: {
        denyRead: ['~/.ssh', '~/.aws', '~/.git-credentials', '/etc/passwd', '/etc/shadow'],
        allowWrite: [TEST_WORKSPACE, '/tmp'],
        denyWrite: [
          '.env',
          '.env.local',
          '.env.production',
          '.git/config',
          '~/.bashrc',
          '~/.zshrc',
          '~/.profile',
        ],
      },
    }

    fs.writeFileSync(SRT_SETTINGS, JSON.stringify(testConfig, null, 2))
  })

  afterAll(async () => {
    if (originalSettings) {
      fs.writeFileSync(SRT_SETTINGS, originalSettings)
    } else if (fs.existsSync(SRT_SETTINGS)) {
      fs.unlinkSync(SRT_SETTINGS)
    }

    if (fs.existsSync(TEST_WORKSPACE)) {
      fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true })
    }
  })

  describe('Filesystem Isolation', () => {
    describe('Write Permissions', () => {
      it('should allow writing to workspace', async () => {
        const testFile = path.join(TEST_WORKSPACE, 'test-write.txt')
        const result = await runSandboxedCommand(`echo "test" > ${testFile}`)
        expect(result.code).toBe(0)
        expect(fs.existsSync(testFile)).toBe(true)
      })

      it('should deny writing to .env files in workspace', async () => {
        const testFile = path.join(TEST_WORKSPACE, '.env')
        const result = await runSandboxedCommand(`echo "MALICIOUS" > ${testFile} 2>&1`)
        expect(result.output).toContain('Operation not permitted')
      })

      it('should deny writing to .env.local', async () => {
        const testFile = path.join(TEST_WORKSPACE, '.env.local')
        const result = await runSandboxedCommand(`echo "MALICIOUS" > ${testFile} 2>&1`)
        expect(result.output).toContain('Operation not permitted')
      })
    })

    describe('Read Permissions', () => {
      it('should allow reading from workspace', async () => {
        const testFile = path.join(TEST_WORKSPACE, 'read-test.txt')
        fs.writeFileSync(testFile, 'test content')
        const result = await runSandboxedCommand(`cat ${testFile}`)
        expect(result.code).toBe(0)
        expect(result.output).toContain('test content')
      })

      it('should deny reading SSH keys', async () => {
        const sshKey = path.join(os.homedir(), '.ssh', 'id_rsa')
        if (fs.existsSync(sshKey)) {
          const result = await runSandboxedCommand(`cat ${sshKey} 2>&1`)
          expect(result.output).toContain('Operation not permitted')
        } else {
          console.log('SSH key not found, skipping test')
        }
      })

      it('should deny reading AWS credentials', async () => {
        const awsCreds = path.join(os.homedir(), '.aws', 'credentials')
        if (fs.existsSync(awsCreds)) {
          const result = await runSandboxedCommand(`cat ${awsCreds} 2>&1`)
          expect(result.output).toContain('Operation not permitted')
        } else {
          console.log('AWS credentials not found, skipping test')
        }
      })
    })
  })

  describe('Network Isolation', () => {
    it('should allow access to whitelisted domains', async () => {
      const result = await runSandboxedCommand('curl -s -I https://example.com --connect-timeout 5')
      expect(result.code).toBe(0)
    })

    it('should deny access to non-whitelisted domains', async () => {
      const result = await runSandboxedCommand(
        'curl -s -I https://google.com --connect-timeout 5 2>&1'
      )
      expect(result.output).toContain('blocked-by-allowlist')
    })
  })

  describe('Escape Attempt Tests', () => {
    it('should prevent symlink escape', async () => {
      const symlink = path.join(TEST_WORKSPACE, 'escape-link')
      try {
        fs.symlinkSync('/etc/passwd', symlink)
        const result = await runSandboxedCommand(`cat ${symlink} 2>&1`)
        expect(result.output).toContain('Operation not permitted')
        expect(result.code).not.toBe(0)
      } catch {
        console.log('Symlink creation failed or not permitted')
      } finally {
        if (fs.existsSync(symlink)) {
          fs.unlinkSync(symlink)
        }
      }
    })

    it('should prevent proc filesystem access', async () => {
      const result = await runSandboxedCommand('cat /proc/self/environ 2>&1')
      expect(result.code).not.toBe(0)
      expect(result.output).not.toBeNull()
    })

    it('should prevent executing commands outside workspace', async () => {
      const result = await runSandboxedCommand('ls /root 2>&1')
      expect(result.code).not.toBe(0)
      expect(result.output).not.toBeNull()
    })

    it('should handle invalid commands gracefully', async () => {
      const result = await runSandboxedCommand('this-command-does-not-exist 2>&1')
      expect(result.code).not.toBe(0)
    })
  })

  describe('Comparison: With vs Without Sandbox', () => {
    it('should show difference in network access', async () => {
      const sandboxedResult = await runSandboxedCommand(
        'curl -s -I https://google.com --connect-timeout 3 2>&1'
      )
      expect(sandboxedResult.output).toContain('blocked-by-allowlist')
    })

    it('should show difference in file access', async () => {
      const sshKey = path.join(os.homedir(), '.ssh', 'id_rsa')
      if (fs.existsSync(sshKey)) {
        const sandboxedResult = await runSandboxedCommand(`cat ${sshKey} 2>&1`)
        expect(sandboxedResult.output).toContain('Operation not permitted')
      }
    })
  })
})
