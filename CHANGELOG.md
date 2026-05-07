# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Multi-template architecture with 3 presets (fullstack-admin, todo-app, minimal)
- Module manifest system (module.ts) for all 11 modules
- `--preset` flag and `presets` command for CLI
- Interactive preset selection when no flag provided
- 15+ code generators for per-preset file generation
- Per-preset dependency filtering
- Module validation script (`npm run validate:modules`)
- `template-modules` CI job for manifest validation
- Per-preset build verification in CI matrix

### Changed

- Package renamed from `create-biomimic-app` to `create-fullstack-scaffold`
- CLI banner now includes Hono
- Module generators are manifest-driven (no parallel hardcoded lists)
- server-app.ts and db-init.ts generators build from scratch (no regex replacement)
- Manifest parser uses tsx dynamic import instead of regex

### Removed

- Unused dependencies (lodash-es, chalk, mysql2) from template
- 250+ lines of fragile regex parsing code

### Fixed

- vite.config.ts generation for non-admin presets (build failure)
- CI working directory for validate:modules step
