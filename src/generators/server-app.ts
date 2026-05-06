import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedPreset } from "./template-generator";

export function generateServerApp(
  resolved: ResolvedPreset,
  templateDir: string,
): string {
  const originalPath = join(templateDir, "src", "server", "app.ts");
  let content = readFileSync(originalPath, "utf-8");

  if (!resolved.hasCaptcha) {
    content = content.replace(
      /import \{ captchaMiddleware \} from '\.\/middleware\/captcha'\n/g,
      "",
    );
    content = content.replace(
      /\n\s*\.use\(\s*\n\s*'\/api\/admin\/\*',\s*\n\s*captchaMiddleware\(\{[^}]*\}\)\s*\n\s*\)/,
      "",
    );
  }

  if (!resolved.hasPermission) {
    content = content.replace(
      /import \{ auditLogMiddleware \} from '\.\/middleware\/audit-log'\n/g,
      "",
    );
    content = content.replace(
      /\n\s*\.use\('\/api\/\*',\s*auditLogMiddleware\(\)\)/,
      "",
    );
  }

  if (!resolved.hasSSE && !resolved.hasWebSocket) {
    content = content.replace(
      /import \{ realtimeEnvMiddleware \} from '\.\/middleware\/realtime-env'\n/g,
      "",
    );
    content = content.replace(
      /\n\s*\.use\('\*',\s*realtimeEnvMiddleware\(\)\)/,
      "",
    );
  }

  if (!resolved.modules.has("file")) {
    content = content.replace(
      /import \{ fileRoutes \} from '\.\/module-file\/routes\/file-routes'\n/g,
      "",
    );
    content = content.replace(/\n\s*\.route\('\/files',\s*fileRoutes\)/, "");
  }

  content = content.replace(/\n{3,}/g, "\n\n");
  return content;
}
