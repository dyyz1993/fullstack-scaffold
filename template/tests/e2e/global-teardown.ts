import { spawn } from 'child_process'

declare global {
  var __DEV_SERVER__: ReturnType<typeof spawn> | undefined
}

export default async function globalTeardown() {
  if (globalThis.__DEV_SERVER__) {
    process.stdout.write('\n🛑 Stopping dev server...\n')

    // Kill with SIGKILL (force kill)
    globalThis.__DEV_SERVER__.kill('SIGKILL')

    // Wait for process to exit
    await new Promise<void>(resolve => {
      globalThis.__DEV_SERVER__!.on('exit', code => {
        process.stdout.write(`✅ Dev server stopped (exit code: ${code})\n`)
        resolve()
      })

      // Timeout after 5 seconds
      setTimeout(() => {
        globalThis.__DEV_SERVER__!.kill('SIGKILL')
        resolve()
      }, 5000)
    })
  }
}
