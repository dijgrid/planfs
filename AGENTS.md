# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

PlanFS is a TypeScript monorepo for Git-native project planning. Planning artifacts live as Markdown files with YAML frontmatter under `.planfs/`; the codebase provides a core library, CLI, schema package, and VS Code extension.

The core design rule is important: UI and CLI actions must write files that stay clean, readable, and directly editable by humans.

## Repository Layout

- `src/core`: parsing, loading, repository APIs, validation, and unit tests.
- `src/cli`: command-line interface built on `yargs`.
- `src/vscode`: VS Code extension and tree explorer.
- `src/schema`: JSON schema definitions.
- `docs`: architecture, file format, getting started, and implementation plan.
- `.planfs`: example planning artifacts for this repository.

## Common Commands

Run these from the repository root:

```sh
npm run lint
npm run build --workspaces
npm test --workspaces
```

Useful CLI smoke checks after building:

```sh
node src/cli/dist/cli.js validate
node src/cli/dist/cli.js list tasks
```

Generated `dist/` directories are ignored and should not be committed.

## Development Notes

- Prefer keeping behavior in `planfs-core`; CLI and VS Code should be thin consumers of the shared APIs.
- Preserve strict TypeScript settings. Avoid weakening `tsconfig` or lint rules to work around local issues.
- Use the existing `yaml` dependency for frontmatter serialization and parsing. Do not add hand-rolled YAML formatting.
- Metadata currently serializes as camelCase, for example `dependsOn`, `dueDate`, `targetDate`, `createdAt`, and `updatedAt`.
- The parser accepts kebab-case and snake_case for compatibility, but new output should remain camelCase unless the file format spec is intentionally changed.
- When changing validation, add focused tests in `src/core/src/*.test.ts`.
- The CLI currently supports creating tasks only. Do not advertise unsupported entity creation without implementing it end to end.
- Packages without tests use `jest --passWithNoTests`; add real package tests when behavior grows.

## Safety Rules

- Do not commit generated build output, coverage, `node_modules`, or local editor files.
- Do not delete or rewrite `.planfs` artifacts casually; they are project data, not throwaway fixtures.
- If changing file format behavior, update `docs/FILE_FORMAT.md`, examples in `.planfs`, serializer/parser code, and tests together.
- Keep documentation grounded in actual behavior. Avoid generated completion reports or optimistic claims that are not backed by build/test output.

## Verification Expectations

Before handing off code changes, run:

```sh
npm run lint
npm run build --workspaces
npm test --workspaces
```

For CLI or repository-format changes, also run:

```sh
node src/cli/dist/cli.js validate
```

<!-- PLANFS-AI-AWARENESS:START -->
## AI Planning Awareness

Before answering planning-status questions, recommending next work, or proposing planning updates, start with:

```sh
node src/cli/dist/cli.js ai summary
```

Use the returned IDs and file paths for targeted follow-up reads instead of scanning all of `.planfs`.

Preview metadata updates before writing:

```sh
node src/cli/dist/cli.js ai update-task --id TASK-061 --status in-progress --dry-run
```

After applying AI-assisted planning updates, run:

```sh
node src/cli/dist/cli.js validate
```
<!-- PLANFS-AI-AWARENESS:END -->
