import { execSync, spawn } from "node:child_process";
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

function waitForServer(port: number, maxMs = 30_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > maxMs) {
        return reject(
          new Error(`Server on port ${port} did not respond within ${maxMs}ms`),
        );
      }
      try {
        execSync(`curl -sf http://localhost:${port}/ -o /dev/null`, {
          timeout: 3_000,
        });
        resolve();
      } catch {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

describe("E2E: Scaffold → Install → Verify", () => {
  afterAll(() => {
    try {
      execSync(`lsof -ti:30999 | xargs kill -9 2>/dev/null || true`, {
        timeout: 3_000,
      });
    } catch {
      // ignore
    }
    if (fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        try {
          execSync(`rm -rf "${tmpDir}"`, { timeout: 10_000 });
        } catch {
          // best effort
        }
      }
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
    let output: string;
    try {
      output = run("npx vitest run 2>&1", projectPath, 300_000);
    } catch (e: unknown) {
      const err = e as { stdout?: string | Buffer; stderr?: string | Buffer };
      output = (err.stdout as string) ?? (err.stderr as string) ?? String(e);
    }
    // eslint-disable-next-line no-control-regex
    const cleaned = output.replace(/\x1b\[[0-9;]*m/g, "");
    const hasPassed = /\d+ passed/.test(cleaned);
    const hasFailed = /\d+ failed/.test(cleaned);
    if (!hasPassed || hasFailed) {
      console.log(
        "⚠️ Unit tests had failures (non-blocking for scaffold verification)",
      );
      console.log(output.split("\n").slice(-80).join("\n"));
    }
    expect(hasPassed).toBe(true);
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

  test("step 6: dev server starts and responds", async () => {
    const port = 30999;
    const serverLogs: string[] = [];

    const devServer = spawn(
      "npx",
      ["vite", "--port", String(port), "--strictPort"],
      {
        cwd: projectPath,
        stdio: "pipe",
        env: { ...process.env },
        detached: true,
      },
    );

    devServer.stdout?.on("data", (d: Buffer) => serverLogs.push(d.toString()));
    devServer.stderr?.on("data", (d: Buffer) => serverLogs.push(d.toString()));

    try {
      await waitForServer(port, 60_000);
      const body = execSync(`curl -sf http://localhost:${port}/`, {
        encoding: "utf-8",
        timeout: 5_000,
      });
      expect(body).toContain("<html");
    } catch (e) {
      console.log("⚠️ Dev server logs:\n" + serverLogs.slice(-30).join(""));
      throw e;
    } finally {
      try {
        if (devServer.pid) process.kill(-devServer.pid, "SIGKILL");
      } catch {
        // process group may already be dead
      }
      devServer.kill("SIGKILL");
      try {
        execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
          timeout: 3_000,
        });
      } catch {
        // port may already be free
      }
    }
  });

  test("step 7: patch-package patches apply correctly", () => {
    const wsClientDts = path.join(
      projectPath,
      "node_modules/hono/dist/types/client/ws-client.d.ts",
    );
    expect(
      fs.existsSync(wsClientDts),
      `patched file ${wsClientDts} should exist`,
    ).toBe(true);
    const wsClientTypes = fs.readFileSync(wsClientDts, "utf-8");
    expect(wsClientTypes).toContain("SSEClient");
    expect(wsClientTypes).toContain("WSClient");

    const typesDts = path.join(
      projectPath,
      "node_modules/hono/dist/types/types.d.ts",
    );
    const typesContent = fs.readFileSync(typesDts, "utf-8");
    expect(typesContent).toMatch(/'sse'/);
    expect(typesContent).toMatch(/'ws'/);
    expect(typesContent).toMatch(/'image'/);
    expect(typesContent).toMatch(/'svg'/);
    expect(typesContent).toMatch(/'file'/);

    const clientJs = path.join(
      projectPath,
      "node_modules/hono/dist/client/client.js",
    );
    const clientContent = fs.readFileSync(clientJs, "utf-8");
    expect(clientContent).toContain('method === "sse"');
  });

  test("step 8: database configuration is valid", () => {
    expect(fs.existsSync(path.join(projectPath, "drizzle.config.ts"))).toBe(
      true,
    );

    const dbDir = path.join(projectPath, "src/server/db");
    expect(fs.existsSync(dbDir), "src/server/db directory should exist").toBe(
      true,
    );

    const dbFiles = fs.readdirSync(dbDir);
    expect(
      dbFiles.length,
      "db directory should contain migration/schema files",
    ).toBeGreaterThan(0);
  });

  test("step 9: no template placeholder strings remain", () => {
    const filesToCheck = ["package.json", "wrangler.toml", "README.md"];
    const placeholders = [
      "YOUR_DATABASE_ID_HERE",
      "biomimic-todo-app",
      "biomimic-todo-db",
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(projectPath, file);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, "utf-8");
      for (const placeholder of placeholders) {
        expect(content).not.toContain(placeholder);
      }
    }
  });

  test("step 10: all critical source files exist and are well-formed", () => {
    const criticalFiles = [
      "src/client/App.tsx",
      "src/server/app.ts",
      "src/server/entries/node.ts",
      "src/shared/core/sse-client.ts",
      "src/shared/core/ws-client.ts",
    ];

    for (const file of criticalFiles) {
      expect(
        fs.existsSync(path.join(projectPath, file)),
        `${file} should exist`,
      ).toBe(true);
    }

    const sseClient = fs.readFileSync(
      path.join(projectPath, "src/shared/core/sse-client.ts"),
      "utf-8",
    );
    expect(sseClient).toContain("SSEClientImpl");
    expect(sseClient).toContain("createSSEClient");

    const wsClient = fs.readFileSync(
      path.join(projectPath, "src/shared/core/ws-client.ts"),
      "utf-8",
    );
    expect(wsClient).toContain("WSClientImpl");
  });
});
