import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
const CLI_PATH = path.join(PROJECT_ROOT, "src/index.ts");
const TSX_BIN = path.join(PROJECT_ROOT, "node_modules/.bin/tsx");

function tmpDir(prefix = "fullstack-scaffold-test-"): string {
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

describe("CLI", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = tmpDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("shows help text with --help", () => {
    const result = runCli(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("create-fullstack-scaffold");
    expect(result.stdout).toContain("project-name");
    expect(result.stdout).toContain("--current-dir");
  });

  test("creates project directory with correct files", () => {
    const projectDir = path.join(tempDir, "my-test-app");
    const result = runCli(["my-test-app"], tempDir);

    expect(result.status).toBe(0);
    expect(fs.existsSync(projectDir)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "node_modules"))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, ".wrangler"))).toBe(false);
  });

  test("replaces project name in package.json", () => {
    const projectDir = path.join(tempDir, "my-awesome-project");
    runCli(["my-awesome-project"], tempDir);

    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkgJson.name).toBe("my-awesome-project");
    expect(pkgJson.name).not.toBe("biomimic-todo-app");
    expect(pkgJson.bin).toBeUndefined();
  });

  test("replaces project name in package-lock.json", () => {
    const projectDir = path.join(tempDir, "lockfile-test");
    runCli(["lockfile-test"], tempDir);

    const lockPath = path.join(projectDir, "package-lock.json");
    if (fs.existsSync(lockPath)) {
      const lockJson = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
      expect(lockJson.name).toBe("lockfile-test");
    }
  });

  test("copies .env.example but not other .env files", () => {
    const projectDir = path.join(tempDir, "env-test");
    runCli(["env-test"], tempDir);

    expect(fs.existsSync(path.join(projectDir, ".env.example"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, ".env"))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, ".env.local"))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, ".env.production"))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, ".env.test"))).toBe(false);
  });

  test("handles existing directory with error", () => {
    fs.mkdirSync(path.join(tempDir, "existing-dir"), { recursive: true });
    const result = runCli(["existing-dir"], tempDir);
    expect(result.status).not.toBe(0);
  });

  test("--current-dir flag creates in current directory", () => {
    const result = runCli(["--current-dir"], tempDir);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(tempDir, "package.json"))).toBe(true);
  });

  test("replaces wrangler.toml values", () => {
    const projectDir = path.join(tempDir, "wrangler-test");
    runCli(["wrangler-test"], tempDir);

    const wranglerPath = path.join(projectDir, "wrangler.toml");
    if (fs.existsSync(wranglerPath)) {
      const content = fs.readFileSync(wranglerPath, "utf-8");
      expect(content).not.toContain('name = "biomimic-todo-app"');
      expect(content).toContain("wrangler-test");
      expect(content).toContain("wrangler-test-db");
      expect(content).toMatch(/database_id = ""/);
    }
  });

  test("replaces README.md project name", () => {
    const projectDir = path.join(tempDir, "readme-test");
    runCli(["readme-test"], tempDir);

    const readmePath = path.join(projectDir, "README.md");
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, "utf-8");
      expect(content).not.toMatch(/^# biomimic-todo-app/m);
      expect(content).toContain("readme-test");
    }
  });

  test("default project name is my-fullstack-app when no name provided", () => {
    const defaultDir = path.join(tempDir, "my-fullstack-app");
    const result = runCli([], tempDir);
    expect(result.status).toBe(0);
    expect(fs.existsSync(defaultDir)).toBe(true);
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(defaultDir, "package.json"), "utf-8"),
    );
    expect(pkgJson.name).toBe("my-fullstack-app");
  });
});
