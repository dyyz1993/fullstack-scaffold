import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedPreset } from "./template-generator";

export function generateViteConfig(
  resolved: ResolvedPreset,
  templateDir: string,
): string {
  const originalPath = join(templateDir, "vite.config.ts");
  let content = readFileSync(originalPath, "utf-8");

  if (!resolved.hasAdmin) {
    content = content.replace(
      /,\n\s*admin:\s*path\.resolve\(__dirname,\s*['"]admin\.html['"]\)/,
      "",
    );
  }

  return content;
}
