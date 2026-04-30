# CLAUDE.md

## Project

create-biomimic-app — A CLI scaffolding tool that generates full-stack React + Hono applications using a "subtraction mode" approach.

## Commands

```bash
npm run dev          # Run CLI in dev mode
npm run test         # Run tests (Node test runner)
npm run typecheck    # TypeScript type check
npm run prepare      # Install husky hooks
```

## Architecture

The project is a CLI tool + a full-stack template app:

```
src/                    # CLI source code
├── index.ts            # CLI entry point
├── types.ts            # Generator types (Module, Channel, Config)
├── module-registry.ts  # Module registry with dependency resolution
├── commands/           # CLI commands (generator, prompts)
└── utils.ts            # Utility functions
template/               # Full-stack app template (separate project)
```

**Key Concept — Subtraction Mode:** The template is a full-featured app with ALL modules. The generator removes unwanted modules based on user selection, rather than assembling from scratch.

## Key Files

- `src/module-registry.ts` — Module definitions, dependency graph, file mapping
- `src/types.ts` — Core types for generator configuration
- `src/commands/generator.ts` — File deletion logic
- `src/commands/prompts.ts` — Interactive CLI prompts

## Template Project

The `template/` directory is a self-contained full-stack app with its own:

- ESLint config (29 custom rules), Vitest tests, Drizzle ORM, Hono RPC
- Pre-commit hooks (typecheck → validate → test → lint-staged)
- See `template/CLAUDE.md` for template-specific guidance

## Conventions

- Commit messages follow conventional commits (feat/fix/docs/style/refactor/test/chore/revert)
- Subject max 80 chars, lowercase
- No console.log in source (use console.warn/error)
