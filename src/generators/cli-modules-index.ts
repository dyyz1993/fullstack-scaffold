import type { ResolvedPreset } from "./template-generator";

export function generateCliModulesIndex(resolved: ResolvedPreset): string {
  const modules: string[] = [];
  const registrations: string[] = [];

  if (resolved.modules.has("todos")) {
    modules.push("import { registerTodoCommands } from './todo'");
    registrations.push("registerTodoCommands(program)");
  }

  if (resolved.modules.has("notifications")) {
    modules.push(
      "import { registerNotificationCommands } from './notification'",
    );
    registrations.push("registerNotificationCommands(program)");
  }

  modules.push("import { registerConfigCommands } from './config'");
  registrations.push("registerConfigCommands(program)");

  const imports = `import type { Command } from 'commander'\n${modules.join("\n")}`;
  const exports = modules
    .map((m) => {
      const match = m.match(/\{ (\w+) \}/);
      return match ? match[1] : "";
    })
    .filter(Boolean);

  return `${imports}

export function registerModules(program: Command) {
${registrations.map((r) => `  ${r}`).join("\n")}
}

export { ${exports.join(", ")} }
`;
}
