import type { ResolvedPreset } from "./template-generator";

export interface FileFilterRule {
  pattern: string;
  action: "include" | "exclude";
  condition: string;
}

export function getExcludePatterns(resolved: ResolvedPreset): string[] {
  const excludes: string[] = [];

  const allModuleNames = [
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
  ];

  for (const name of allModuleNames) {
    if (!resolved.modules.has(name)) {
      excludes.push(`src/server/module-${name}`);
    }
  }

  for (const name of allModuleNames) {
    if (!resolved.modules.has(name)) {
      const sharedName = name === "file" ? "files" : name;
      excludes.push(`src/shared/modules/${sharedName}`);
      if (name === "permission") {
        excludes.push("src/shared/modules/role");
        excludes.push("src/shared/modules/audit");
      }
    }
  }

  const dbSchemaFiles = [
    { module: "todos", files: ["todos.ts", "todo-attachments.ts"] },
    { module: "notifications", files: ["notifications.ts"] },
    {
      module: "permission",
      files: [
        "permissions.ts",
        "roles.ts",
        "role-permissions.ts",
        "user-roles.ts",
        "api-endpoints.ts",
        "permission-route-mappings.ts",
        "permission-audit-logs.ts",
      ],
    },
    { module: "order", files: ["orders.ts"] },
    { module: "ticket", files: ["tickets.ts"] },
    { module: "dispute", files: ["disputes.ts"] },
    { module: "content", files: ["contents.ts"] },
  ];

  for (const { module, files } of dbSchemaFiles) {
    if (!resolved.modules.has(module)) {
      for (const file of files) {
        excludes.push(`src/server/db/schema/${file}`);
      }
    }
  }

  const clientPages = [
    { module: "todos", file: "src/client/pages/TodoPage.tsx" },
    { module: "chat", file: "src/client/pages/WebSocketPage.tsx" },
    { module: "notifications", file: "src/client/pages/NotificationPage.tsx" },
  ];
  for (const { module, file } of clientPages) {
    if (!resolved.modules.has(module)) {
      excludes.push(file);
    }
  }

  const clientStores = [
    { module: "todos", file: "src/client/stores/todoStore.ts" },
    { module: "chat", file: "src/client/stores/chatWSStore.ts" },
    { module: "notifications", file: "src/client/stores/notificationStore.ts" },
    { module: "admin", file: "src/client/stores/authStore.ts" },
  ];
  for (const { module, file } of clientStores) {
    if (!resolved.modules.has(module)) {
      excludes.push(file);
    }
  }

  if (!resolved.hasAdmin) {
    excludes.push("src/client/components/AuthButton.tsx");
  }

  if (!resolved.hasAdmin) {
    excludes.push("src/admin");
    excludes.push("admin.html");
    excludes.push("auth-inject.html");
  }

  const adminPages = [
    {
      module: "admin",
      files: [
        "DashboardPage.tsx",
        "LoginPage.tsx",
        "RegisterPage.tsx",
        "SettingsPage.tsx",
        "UsersPage.tsx",
        "MediaTestPage.tsx",
      ],
    },
    {
      module: "permission",
      files: ["PermissionsPage.tsx", "RolesPage.tsx", "SystemLogsPage.tsx"],
    },
    { module: "order", files: ["OrdersPage.tsx"] },
    { module: "ticket", files: ["TicketsPage.tsx"] },
    { module: "dispute", files: ["DisputesPage.tsx"] },
    { module: "content", files: ["ContentPage.tsx"] },
    { module: "captcha", files: ["TestCaptchaPage.tsx"] },
  ];
  for (const { module, files } of adminPages) {
    if (!resolved.modules.has(module)) {
      for (const file of files) {
        excludes.push(`src/admin/pages/${file}`);
      }
    }
  }

  if (!resolved.hasCaptcha) {
    excludes.push("src/server/middleware/captcha.ts");
  }
  if (!resolved.hasPermission) {
    excludes.push("src/server/middleware/permission.ts");
    excludes.push("src/server/middleware/audit-log.ts");
    excludes.push("src/server/utils/permission-utils.ts");
    excludes.push("src/server/middleware/__tests__/auth-simple.test.ts");
    excludes.push("src/server/middleware/__tests__/auth.test.ts");
    excludes.push(
      "src/server/middleware/__tests__/error-response-format.test.ts",
    );
  }

  if (!resolved.modules.has("notifications")) {
    excludes.push("src/cli/modules/notification");
    excludes.push("src/client/pages/__tests__/NotificationPage.test.tsx");
  }
  if (!resolved.modules.has("chat")) {
    excludes.push("src/client/pages/__tests__/WebSocketPage.test.tsx");
  }
  if (!resolved.hasAdmin) {
    excludes.push("src/client/components/__tests__/AuthButton.test.tsx");
  }

  for (const name of allModuleNames) {
    if (!resolved.modules.has(name)) {
      excludes.push(`src/server/module-${name}`);
    }
  }

  return excludes;
}

export function getGeneratedFiles(resolved: ResolvedPreset): string[] {
  const files: string[] = [
    "src/server/route-registry.ts",
    "src/server/db/schema/index.ts",
    "src/client/App.tsx",
    "src/client/components/Navigation.tsx",
    "src/shared/modules/index.ts",
    "src/shared/schemas/index.ts",
    "src/server/middleware/index.ts",
    "src/client/components/index.ts",
    "src/cli/modules/index.ts",
  ];

  if (resolved.hasAdmin) {
    files.push("src/admin/App.tsx");
  }

  if (!resolved.hasPermission) {
    files.push("src/server/middleware/auth.ts");
    files.push("src/server/utils/auth.ts");
  }

  files.push("src/server/app.ts");

  if (!resolved.hasAdmin) {
    files.push("vite.config.ts");
  }

  const seedModules = ["order", "ticket", "dispute", "content"];
  if (
    seedModules.some((m) => !resolved.modules.has(m)) ||
    !resolved.hasPermission
  ) {
    files.push("src/server/db/init.ts");
  }

  return files;
}
