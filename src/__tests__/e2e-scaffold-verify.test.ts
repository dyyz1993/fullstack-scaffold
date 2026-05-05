import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
const CLI_ENTRY = path.join(PROJECT_ROOT, "src/index.ts");
const tmpDir = path.join(os.tmpdir(), `e2e-scaffold-${randomUUID()}`);
const projectName = "e2e-test-app";
const projectPath = path.join(tmpDir, projectName);

function run(cmd: string, cwd: string, timeout = 120_000): string {
  return execSync(cmd, {
    cwd,
    encoding: "utf-8",
    timeout,
    stdio: "pipe",
    maxBuffer: 50 * 1024 * 1024,
  });
}

describe("E2E: Scaffold → Install → Verify", () => {
  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("step 1: scaffolds a new project", () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    run(`npx tsx "${CLI_ENTRY}" ${projectName}`, tmpDir, 60_000);
    expect(fs.existsSync(projectPath)).toBe(true);
    expect(fs.existsSync(path.join(projectPath, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, "tsconfig.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, "src"))).toBe(true);
  });

  test("step 2: installs dependencies", () => {
    expect(fs.existsSync(projectPath)).toBe(true);
    run("npm install", projectPath, 300_000);
    expect(fs.existsSync(path.join(projectPath, "node_modules"))).toBe(true);
  });

  test("step 3: type-check passes", () => {
    run("npx tsc --noEmit", projectPath, 120_000);
  });

  test("step 4: unit tests pass", () => {
    const output = run("npx vitest run 2>&1", projectPath, 180_000);
    expect(output).not.toContain("FAIL");
    // eslint-disable-next-line no-control-regex
    const cleaned = output.replace(/\x1b\[[0-9;]*m/g, "");
    expect(cleaned).toMatch(/Tests\s+\d+ passed/);
  });

  test("step 5: project builds successfully", () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(projectPath, "package.json"), "utf-8"),
    );
    if (pkgJson.scripts?.build) {
      run("npm run build", projectPath, 120_000);
      expect(fs.existsSync(path.join(projectPath, "dist"))).toBe(true);
    }
  });

  test.todo("step 6: dev server starts and responds", async () => {
    // Navigate to home page
    // const page = await browser.newPage()
    // await page.goto(`http://localhost:${PORT}/`)
    // Wait for app to load
    // await page.locator('h1').waitFor()
    // Verify dev server is responsive
    // await page.reload()
    // await page.locator('h1').waitFor()
  });

  test.todo("step 7: patch-package patches apply correctly", async () => {
    // Check that SSE/WebSocket types are available
    // This tests the core patch mechanism
    // const page = await browser.newPage()
    // Navigate to a page that would fail without patches
    // await page.goto(`http://localhost:${PORT}/notifications`)
    // Wait for SSE connection indicator
    // await page.locator('[data-testid="sse-status"]').waitFor({ timeout: 5000 })
  });

  test.todo("step 8: database migration runs successfully", async () => {
    // Verify database schema is initialized
    // Check that migrations table exists
    // const page = await browser.newPage()
    // await page.goto(`http://localhost:${PORT}/`)
    // Verify DB connection is working (no errors in console)
    // page.on('console', msg => {
    //   if (msg.type() === 'error') {
    //     throw new Error(`Console error: ${msg.text()}`)
    //   }
    // })
    // Make a simple API call to verify DB is working
    // const response = await page.request.get(`/api/todos`)
    // expect(response.ok()).toBe(true)
  });

  test.todo("step 9: no template placeholder strings remain", async () => {
    // Search for placeholder strings in generated files
    // These indicate failed variable substitution
    // const placeholders = ['YOUR_DATABASE_ID_HERE', 'CHANGE_ME', 'TODO:']
    // for (const placeholder of placeholders) {
    //   const page = await browser.newPage()
    //   const response = await page.request.get(`/api/__test__/search?query=${encodeURIComponent(placeholder)}`)
    //   const data = await response.json()
    //   if (data.success && data.found > 0) {
    //     throw new Error(`Found ${data.found} files containing placeholder "${placeholder}"`)
    //   }
    // }
  });

  test.todo("step 10: all critical pages load", async () => {
    // Test critical pages load without errors
    // const criticalPages = [
    //   '/', // Home/Todo
    //   '/notifications',
    //   '/websocket',
    //   '/admin/login',
    //   '/admin/dashboard',
    // ]
    // const page = await browser.newPage()
    // for (const pagePath of criticalPages) {
    //   await page.goto(`http://localhost:${PORT}${pagePath}`)
    //   // Check for console errors using page.on('console') instead
    //   let hasConsoleError = false
    //   page.on('console', (msg) => {
    //     if (msg.type() === 'error') {
    //       hasConsoleError = true
    //     }
    //   })
    //   // Wait a bit for any async errors
    //   await new Promise((resolve) => setTimeout(resolve, 500))
    //   expect(hasConsoleError).toBe(false)
    // }
  });
});
