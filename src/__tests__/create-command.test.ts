import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
const CLI_PATH = path.join(PROJECT_ROOT, "src/index.ts");
const TSX_BIN = path.join(PROJECT_ROOT, "node_modules/.bin/tsx");

function tmpDir(prefix = "biomimic-create-"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runCli(
  args: string[],
  cwd?: string,
): { stdout: string; stderr: string; status: number | null } {
  try {
    const stdout = execSync(`"${TSX_BIN}" "${CLI_PATH}" ${args.join(" ")}`, {
      cwd: cwd ?? os.tmpdir(),
      encoding: "utf-8",
      timeout: 30_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      status: e.status ?? 1,
    };
  }
}

describe("create command - file filtering", () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = tmpDir();
    projectDir = path.join(tempDir, "filter-test");
    runCli(["filter-test"], tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("excludes node_modules from copy", () => {
    expect(fs.existsSync(path.join(projectDir, "node_modules"))).toBe(false);
  });

  test("excludes .wrangler from copy", () => {
    expect(fs.existsSync(path.join(projectDir, ".wrangler"))).toBe(false);
  });

  test("excludes .test-history from copy", () => {
    expect(fs.existsSync(path.join(projectDir, ".test-history"))).toBe(false);
  });

  test("excludes dist from copy", () => {
    expect(fs.existsSync(path.join(projectDir, "dist"))).toBe(false);
  });

  test("excludes logs from copy", () => {
    expect(fs.existsSync(path.join(projectDir, "logs"))).toBe(false);
  });

  test("excludes coverage from copy", () => {
    expect(fs.existsSync(path.join(projectDir, "coverage"))).toBe(false);
  });

  test("excludes data directory from copy", () => {
    expect(fs.existsSync(path.join(projectDir, "data"))).toBe(false);
  });
});

describe("create command - template variable substitution", () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = tmpDir();
    projectDir = path.join(tempDir, "subst-test");
    runCli(["subst-test"], tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("package.json has new project name", () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkgJson.name).toBe("subst-test");
  });

  test("package.json bin field is removed", () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkgJson.bin).toBeUndefined();
  });

  test("wrangler.toml has new worker name", () => {
    const wranglerPath = path.join(projectDir, "wrangler.toml");
    if (fs.existsSync(wranglerPath)) {
      const content = fs.readFileSync(wranglerPath, "utf-8");
      expect(content).toMatch(/^name = "subst-test"/m);
    }
  });

  test("wrangler.toml has new database name", () => {
    const wranglerPath = path.join(projectDir, "wrangler.toml");
    if (fs.existsSync(wranglerPath)) {
      const content = fs.readFileSync(wranglerPath, "utf-8");
      expect(content).toContain('database_name = "subst-test-db"');
    }
  });

  test("wrangler.toml has cleared database_id", () => {
    const wranglerPath = path.join(projectDir, "wrangler.toml");
    if (fs.existsSync(wranglerPath)) {
      const content = fs.readFileSync(wranglerPath, "utf-8");
      expect(content).toMatch(/database_id = ""/);
      expect(content).not.toContain("e4253b7e-be6b-4ca7-bf19-7c3725f8e32c");
    }
  });
});

describe("create command - file structure integrity", () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = tmpDir();
    projectDir = path.join(tempDir, "structure-test");
    runCli(["structure-test"], tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates src directory", () => {
    expect(fs.existsSync(path.join(projectDir, "src"))).toBe(true);
    expect(fs.statSync(path.join(projectDir, "src")).isDirectory()).toBe(true);
  });

  test("creates src/client directory", () => {
    expect(fs.existsSync(path.join(projectDir, "src/client"))).toBe(true);
  });

  test("creates src/server directory", () => {
    expect(fs.existsSync(path.join(projectDir, "src/server"))).toBe(true);
  });

  test("creates src/shared directory", () => {
    expect(fs.existsSync(path.join(projectDir, "src/shared"))).toBe(true);
  });

  test("creates vite.config.ts", () => {
    expect(fs.existsSync(path.join(projectDir, "vite.config.ts"))).toBe(true);
  });

  test("creates tsconfig.json", () => {
    expect(fs.existsSync(path.join(projectDir, "tsconfig.json"))).toBe(true);
  });

  test("creates index.html", () => {
    expect(fs.existsSync(path.join(projectDir, "index.html"))).toBe(true);
  });

  test("creates wrangler.toml", () => {
    expect(fs.existsSync(path.join(projectDir, "wrangler.toml"))).toBe(true);
  });

  test("creates .env.example", () => {
    expect(fs.existsSync(path.join(projectDir, ".env.example"))).toBe(true);
  });

  test("creates README.md", () => {
    expect(fs.existsSync(path.join(projectDir, "README.md"))).toBe(true);
  });
});

describe("create command - database name generation", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = tmpDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("rejects invalid project name with special characters", () => {
    const result = runCli(["My_Special.Project"], tempDir);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Invalid project name");
  });
});
