import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedPreset } from "./template-generator";

export function generateDbInit(
  resolved: ResolvedPreset,
  templateDir: string,
): string {
  if (!resolved.hasPermission) {
    return generateMinimalDbInit();
  }

  const originalPath = join(templateDir, "src", "server", "db", "init.ts");
  let content = readFileSync(originalPath, "utf-8");

  const seedModules = [
    {
      module: "order",
      importLine:
        "import { seedOrdersIfEmpty } from '../module-order/services/order-service'",
      call: "seedOrdersIfEmpty()",
    },
    {
      module: "ticket",
      importLine:
        "import { seedTicketsIfEmpty } from '../module-ticket/services/ticket-service'",
      call: "seedTicketsIfEmpty()",
    },
    {
      module: "dispute",
      importLine:
        "import { seedDisputesIfEmpty } from '../module-dispute/services/dispute-service'",
      call: "seedDisputesIfEmpty()",
    },
    {
      module: "content",
      importLine:
        "import { seedContentsIfEmpty } from '../module-content/services/content-service'",
      call: "seedContentsIfEmpty()",
    },
  ];

  for (const seed of seedModules) {
    if (!resolved.modules.has(seed.module)) {
      content = content.replace(seed.importLine + "\n", "");
    }
  }

  const activeSeeds = seedModules.filter((s) => resolved.modules.has(s.module));
  if (activeSeeds.length === 0) {
    content = content.replace(
      /\s*log\.info\(\{\}, 'Seeding module data\.\.\.'\)[\s\S]*?log\.info\(\{\}, 'Module data seeding complete!'\)\n/,
      "\n",
    );
  } else {
    const seedCalls = activeSeeds.map((s) => `    ${s.call}(),`).join("\n");
    content = content.replace(
      /await Promise\.all\(\[[\s\S]*?\]\)/,
      `await Promise.all([\n${seedCalls}\n  ])`,
    );
  }

  content = content.replace(/\n{3,}/g, "\n\n");
  return content;
}

function generateMinimalDbInit(): string {
  return `import { getDb } from './driver'
import { logger } from '../utils/logger'

const log = logger.db()

export async function initializeDatabase() {
  await getDb()

  log.info({}, 'Initializing database...')
  log.info({}, 'Database initialization complete!')
}
`;
}
