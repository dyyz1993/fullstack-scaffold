import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
import { spawn } from 'child_process'
import type { BashOperations } from '@mariozechner/pi-coding-agent'
import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime'

export interface SandboxOptions {
  workspacePath: string
  allowNetwork?: boolean
}

export async function initializeSandbox(options: SandboxOptions): Promise<void> {
  const { workspacePath, allowNetwork = true } = options

  const config: SandboxRuntimeConfig = {
    filesystem: {
      allowRead: [workspacePath],
      denyRead: ['~/.ssh', '~/.aws', '~/.git-credentials', '/etc/passwd', '/etc/shadow'],
      allowWrite: [workspacePath, '/tmp'],
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
    network: allowNetwork
      ? {
          allowedDomains: ['*'],
          deniedDomains: [],
        }
      : {
          allowedDomains: [],
          deniedDomains: [],
        },
  }

  await SandboxManager.initialize(config)
}

export function createSandboxedBashOperations(options: SandboxOptions): BashOperations {
  const { workspacePath } = options

  return {
    async exec(
      command: string,
      _cwd: string,
      execOptions: {
        onData: (data: Buffer) => void
        signal?: AbortSignal
      }
    ): Promise<{ exitCode: number | null }> {
      return new Promise(resolve => {
        const wrappedCommandPromise = SandboxManager.wrapWithSandbox(command)

        wrappedCommandPromise
          .then(wrappedCommand => {
            const child = spawn(wrappedCommand, [], {
              cwd: workspacePath,
              shell: true,
              signal: execOptions.signal,
            })

            child.stdout?.on('data', (data: Buffer) => {
              execOptions.onData(data)
            })

            child.stderr?.on('data', (data: Buffer) => {
              execOptions.onData(data)
            })

            child.on('close', code => {
              resolve({ exitCode: code })
            })

            child.on('error', (err: Error) => {
              execOptions.onData(Buffer.from(`Sandbox error: ${err.message}\n`))
              resolve({ exitCode: 1 })
            })
          })
          .catch((err: Error) => {
            execOptions.onData(Buffer.from(`Sandbox wrap error: ${err.message}\n`))
            resolve({ exitCode: 1 })
          })
      })
    },
  }
}
