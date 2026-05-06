/**
 * Template Generator Core
 *
 * Reads module manifests and produces generated file contents
 * for scaffolded projects based on a selected preset.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface ModuleManifest {
  name: string;
  description: string;
  category: "core" | "communication" | "business" | "system";
  dependsOn: string[];
  routes: {
    client?: { importPath: string; exportName: string };
    admin?: { importPath: string; exportName: string }[];
    standalone?: { importPath: string; exportName: string; mountPath: string };
  };
  sharedSchemas?: { path: string };
  clientPages?: { name: string; route: string }[];
  adminPages?: {
    name: string;
    route: string;
    isPublic?: boolean;
    requiredPermission?: string;
  }[];
  dbSchemas?: { files: string[]; hasSeed: boolean };
  dependencies?: Record<string, string>;
  clientStores?: string[];
  providesMiddleware?: {
    name: string;
    importPath: string;
    appliesTo: string;
  }[];
  hasSSE?: boolean;
  hasWebSocket?: boolean;
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  modules: string[];
}

export interface ResolvedPreset {
  preset: TemplatePreset;
  modules: Map<string, ModuleManifest>;
  hasAdmin: boolean;
  hasClient: boolean;
  hasSSE: boolean;
  hasWebSocket: boolean;
  hasPermission: boolean;
  hasCaptcha: boolean;
}

/**
 * Load all module manifests from the template directory
 */
export function loadManifests(
  templateDir: string,
): Map<string, ModuleManifest> {
  const serverDir = join(templateDir, "src", "server");
  const modules = new Map<string, ModuleManifest>();

  const entries = readdirSync(serverDir);
  const moduleDirs = entries.filter(
    (e) =>
      e.startsWith("module-") && statSync(join(serverDir, e)).isDirectory(),
  );

  for (const dir of moduleDirs) {
    const manifestPath = join(serverDir, dir, "module.ts");
    if (!existsSync(manifestPath)) continue;

    const content = readFileSync(manifestPath, "utf-8");
    const manifest = parseManifest(content);
    if (manifest) {
      modules.set(manifest.name, manifest);
    }
  }

  return modules;
}

/**
 * Parse a module.ts file to extract the manifest data.
 */
function parseManifest(content: string): ModuleManifest | null {
  try {
    const objMatch = content.match(
      /:\s*ModuleManifest\s*=\s*\{([\s\S]*)\};?\s*export\s/,
    );
    if (!objMatch) {
      const altMatch = content.match(
        /const\s+\w+Manifest[^=]*=\s*\{([\s\S]*)\}\s*;/,
      );
      if (!altMatch) return null;
      return parseManifestObject(altMatch[1]);
    }
    return parseManifestObject(objMatch[1]);
  } catch {
    return null;
  }
}

/**
 * Parse the manifest object content into a structured object
 */
function parseManifestObject(objContent: string): ModuleManifest {
  const manifest: Partial<ModuleManifest> = {};

  manifest.name = extractStringValue(objContent, "name") ?? "";
  manifest.description = extractStringValue(objContent, "description") ?? "";
  manifest.category =
    (extractStringValue(
      objContent,
      "category",
    ) as ModuleManifest["category"]) ?? "core";
  manifest.dependsOn = extractStringArray(objContent, "dependsOn");
  manifest.hasSSE = extractBooleanValue(objContent, "hasSSE");
  manifest.hasWebSocket = extractBooleanValue(objContent, "hasWebSocket");

  manifest.routes = parseRoutes(objContent);
  manifest.sharedSchemas = parseSharedSchemas(objContent);
  manifest.clientPages = parsePages(objContent, "clientPages");
  manifest.adminPages = parseAdminPages(objContent);
  manifest.dbSchemas = parseDbSchemas(objContent);
  manifest.clientStores = extractStringArray(objContent, "clientStores");
  manifest.providesMiddleware = parseMiddleware(objContent);

  return manifest as ModuleManifest;
}

function extractStringValue(content: string, prop: string): string | null {
  const regex = new RegExp(`${prop}:\\s*['"\`]([^'"\`]*)['"\`]`);
  const match = content.match(regex);
  return match ? match[1] : null;
}

function extractBooleanValue(content: string, prop: string): boolean {
  const regex = new RegExp(`${prop}:\\s*(true|false)`);
  const match = content.match(regex);
  return match ? match[1] === "true" : false;
}

function extractStringArray(content: string, prop: string): string[] {
  const regex = new RegExp(`${prop}:\\s*\\[([^\\]]*)\\]`);
  const match = content.match(regex);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim().replace(/['"`]/g, ""))
    .filter(Boolean);
}

function parseRoutes(content: string): ModuleManifest["routes"] {
  const routes: ModuleManifest["routes"] = {};

  const clientMatch = content.match(
    /client:\s*\{[^}]*importPath:\s*['"]([^'"]*)['"][^}]*exportName:\s*['"]([^'"]*)['"][^}]*\}/,
  );
  if (clientMatch) {
    routes.client = {
      importPath: clientMatch[1],
      exportName: clientMatch[2],
    };
  }

  const adminSection = extractSection(content, "admin:");
  if (adminSection) {
    if (adminSection.trim().startsWith("[")) {
      routes.admin = parseRouteArray(adminSection);
    }
  }

  const standaloneMatch = content.match(
    /standalone:\s*\{[^}]*importPath:\s*['"]([^'"]*)['"][^}]*exportName:\s*['"]([^'"]*)['"][^}]*mountPath:\s*['"]([^'"]*)['"][^}]*\}/,
  );
  if (standaloneMatch) {
    routes.standalone = {
      importPath: standaloneMatch[1],
      exportName: standaloneMatch[2],
      mountPath: standaloneMatch[3],
    };
  }

  return routes;
}

function parseRouteArray(
  content: string,
): { importPath: string; exportName: string }[] {
  const results: { importPath: string; exportName: string }[] = [];
  const regex =
    /\{[^}]*importPath:\s*['"]([^'"]*)['"][^}]*exportName:\s*['"]([^'"]*)['"][^}]*\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push({ importPath: match[1], exportName: match[2] });
  }
  return results;
}

function parseSharedSchemas(content: string): { path: string } | undefined {
  const match = content.match(
    /sharedSchemas:\s*\{[^}]*path:\s*['"]([^'"]*)['"][^}]*\}/,
  );
  if (!match) return undefined;
  return { path: match[1] };
}

function parsePages(
  content: string,
  prop: string,
): { name: string; route: string }[] {
  const section = extractSection(content, `${prop}:`);
  if (!section) return [];

  const results: { name: string; route: string }[] = [];
  const regex =
    /\{\s*name:\s*['"]([^'"]*)['"][^}]*route:\s*['"]([^'"]*)['"][^}]*\}/g;
  let match;
  while ((match = regex.exec(section)) !== null) {
    results.push({ name: match[1], route: match[2] });
  }
  return results;
}

function parseAdminPages(content: string): ModuleManifest["adminPages"] {
  const section = extractSection(content, "adminPages:");
  if (!section) return [];

  const results: ModuleManifest["adminPages"] = [];
  const regex =
    /\{\s*name:\s*['"]([^'"]*)['"][^}]*route:\s*['"]([^'"]*)['"][^}]*\}/g;
  let match;
  while ((match = regex.exec(section)) !== null) {
    const entry: {
      name: string;
      route: string;
      isPublic?: boolean;
      requiredPermission?: string;
    } = {
      name: match[1],
      route: match[2],
    };

    const fullMatch = match[0];
    if (fullMatch.includes("isPublic: true")) {
      entry.isPublic = true;
    }

    const permMatch = fullMatch.match(/requiredPermission:\s*['"]([^'"]*)['"]/);
    if (permMatch) {
      entry.requiredPermission = permMatch[1];
    }

    results.push(entry);
  }
  return results;
}

function parseDbSchemas(content: string): ModuleManifest["dbSchemas"] {
  const match = content.match(
    /dbSchemas:\s*\{[^}]*files:\s*\[([^\]]*)\][^}]*hasSeed:\s*(true|false)[^}]*\}/,
  );
  if (!match) return undefined;

  return {
    files: match[1]
      .split(",")
      .map((s) => s.trim().replace(/['"`]/g, ""))
      .filter(Boolean),
    hasSeed: match[2] === "true",
  };
}

function parseMiddleware(
  content: string,
): ModuleManifest["providesMiddleware"] {
  const section = extractSection(content, "providesMiddleware:");
  if (!section) return undefined;

  const results: {
    name: string;
    importPath: string;
    appliesTo: string;
  }[] = [];
  const regex =
    /\{[^}]*name:\s*['"]([^'"]*)['"][^}]*importPath:\s*['"]([^'"]*)['"][^}]*appliesTo:\s*['"]([^'"]*)['"][^}]*\}/g;
  let match;
  while ((match = regex.exec(section)) !== null) {
    results.push({
      name: match[1],
      importPath: match[2],
      appliesTo: match[3],
    });
  }
  return results.length > 0 ? results : undefined;
}

/**
 * Extract a section from content starting at a property name.
 * Handles nested braces.
 */
function extractSection(content: string, startMarker: string): string | null {
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) return null;

  let braceCount = 0;
  let started = false;
  let result = "";

  for (let i = startIdx + startMarker.length; i < content.length; i++) {
    const char = content[i];

    if (char === "{" || char === "[") {
      braceCount++;
      started = true;
    }
    if (started) result += char;
    if (char === "}" || char === "]") {
      braceCount--;
      if (braceCount === 0 && started) return result;
    }
  }

  return result || null;
}

/**
 * Load presets from modules.config.ts
 */
export function loadPresets(templateDir: string): TemplatePreset[] {
  const configPath = join(templateDir, "modules.config.ts");
  if (!existsSync(configPath)) {
    return [getDefaultPreset()];
  }

  const content = readFileSync(configPath, "utf-8");
  const presets: TemplatePreset[] = [];

  const presetRegex =
    /\{\s*id:\s*['"]([^'"]*)['"][^}]*name:\s*['"]([^'"]*)['"][^}]*description:\s*['"]([^'"]*)['"][^}]*modules:\s*\[([^\]]*)\][^}]*\}/gs;
  let match;
  while ((match = presetRegex.exec(content)) !== null) {
    presets.push({
      id: match[1],
      name: match[2],
      description: match[3],
      modules: match[4]
        .replace(/\/\/[^\n]*/g, "")
        .split(",")
        .map((s) => s.trim().replace(/['"`]/g, ""))
        .filter(Boolean),
    });
  }

  return presets.length > 0 ? presets : [getDefaultPreset()];
}

function getDefaultPreset(): TemplatePreset {
  return {
    id: "fullstack-admin",
    name: "Full Admin",
    description: "All modules included",
    modules: [
      "todos",
      "chat",
      "notifications",
      "file",
      "captcha",
      "permission",
      "admin",
      "order",
      "ticket",
      "dispute",
      "content",
    ],
  };
}

/**
 * Resolve a preset: load manifests, expand dependencies, compute flags
 */
export function resolvePreset(
  preset: TemplatePreset,
  allManifests: Map<string, ModuleManifest>,
): ResolvedPreset {
  const modules = new Map<string, ModuleManifest>();

  const toProcess = [...preset.modules];
  const processed = new Set<string>();

  while (toProcess.length > 0) {
    const name = toProcess.shift()!;
    if (processed.has(name)) continue;
    processed.add(name);

    const manifest = allManifests.get(name);
    if (manifest) {
      modules.set(name, manifest);
      for (const dep of manifest.dependsOn) {
        if (!processed.has(dep)) {
          toProcess.push(dep);
        }
      }
    }
  }

  let hasSSE = false;
  let hasWebSocket = false;
  let hasAdmin = false;

  for (const manifest of modules.values()) {
    if (manifest.hasSSE) hasSSE = true;
    if (manifest.hasWebSocket) hasWebSocket = true;
    if (manifest.adminPages && manifest.adminPages.length > 0) hasAdmin = true;
    if (manifest.routes.admin && manifest.routes.admin.length > 0)
      hasAdmin = true;
  }

  return {
    preset,
    modules,
    hasAdmin,
    hasClient: true,
    hasSSE,
    hasWebSocket,
    hasPermission: modules.has("permission"),
    hasCaptcha: modules.has("captcha"),
  };
}

/**
 * Get the list of module directories to include for a resolved preset
 */
export function getModuleDirectories(resolved: ResolvedPreset): string[] {
  const dirs: string[] = [];
  for (const [name] of resolved.modules) {
    dirs.push(`module-${name}`);
  }
  return dirs;
}

/**
 * Get the list of shared module directories to include
 */
export function getSharedModuleDirs(resolved: ResolvedPreset): string[] {
  const dirs: string[] = [];
  for (const [, manifest] of resolved.modules) {
    if (manifest.sharedSchemas) {
      dirs.push(manifest.sharedSchemas.path);
    }
  }
  return dirs;
}

/**
 * Get the list of DB schema files to include
 */
export function getDbSchemaFiles(resolved: ResolvedPreset): string[] {
  const files: string[] = [];
  for (const [, manifest] of resolved.modules) {
    if (manifest.dbSchemas) {
      files.push(...manifest.dbSchemas.files);
    }
  }
  return files;
}

/**
 * Get the list of client pages to include
 */
export function getClientPages(
  resolved: ResolvedPreset,
): { name: string; route: string }[] {
  const pages: { name: string; route: string }[] = [];
  for (const [, manifest] of resolved.modules) {
    if (manifest.clientPages) {
      pages.push(...manifest.clientPages);
    }
  }
  return pages;
}

/**
 * Get the list of admin pages to include
 */
export function getAdminPages(
  resolved: ResolvedPreset,
): ModuleManifest["adminPages"] {
  const pages: ModuleManifest["adminPages"] = [];
  for (const [, manifest] of resolved.modules) {
    if (manifest.adminPages) {
      pages.push(...manifest.adminPages);
    }
  }
  return pages;
}

/**
 * Get the list of client store files to include
 */
export function getClientStores(resolved: ResolvedPreset): string[] {
  const stores: string[] = [];
  for (const [, manifest] of resolved.modules) {
    if (manifest.clientStores) {
      stores.push(...manifest.clientStores);
    }
  }
  return stores;
}

/**
 * Get the default redirect route for client app
 */
export function getDefaultRoute(resolved: ResolvedPreset): string {
  const pages = getClientPages(resolved);
  if (pages.length > 0) {
    return pages[0].route;
  }
  return "/";
}
