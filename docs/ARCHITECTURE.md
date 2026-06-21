# Architecture

PlanFS is a TypeScript monorepo for Git-native project planning. Planning data lives in Markdown files with YAML frontmatter under `.planfs/`; the library, CLI, and VS Code extension all operate on that same file format.

The main architectural rule is simple: PlanFS features should preserve clean, human-editable files. UI and CLI workflows are conveniences over the repository format, not a separate source of truth.

## System Structure

```text
┌───────────────────────────┐       ┌───────────────────────────┐
│ VS Code Extension          │       │ CLI                       │
│ src/vscode                 │       │ src/cli                   │
│ Explorer, board, insights, │       │ init, validate, list,     │
│ editors, commands          │       │ show, create, git, pr     │
└─────────────┬─────────────┘       └─────────────┬─────────────┘
              │                                   │
              └───────────────┬───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Core Library       │
                    │ src/core           │
                    │ parsing, loading,  │
                    │ validation, graph, │
                    │ repository APIs    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Schema Package     │
                    │ src/schema         │
                    │ JSON schema data   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ .planfs Markdown   │
                    │ tasks, epics,      │
                    │ milestones, etc.   │
                    └───────────────────┘
```

The VS Code extension and CLI should stay thin. Shared behavior belongs in `planfs-core` so every interface reads, validates, and writes PlanFS data consistently.

## Packages

### `src/schema`

`planfs-schema` owns JSON schema definitions for PlanFS entities. It is intentionally small and has no runtime dependencies on the rest of the system.

Responsibilities:

- Export schema objects for tasks, epics, milestones, decisions, and shared metadata.
- Keep schema behavior versionable and reusable by `planfs-core`.
- Avoid UI, CLI, or filesystem concerns.

### `src/core`

`planfs-core` is the domain and repository layer. It parses files, normalizes metadata, validates entities, builds graphs, and exposes repository APIs used by the CLI and extension.

Key areas:

- `parser.ts`: YAML frontmatter parsing and Markdown body separation.
- `files.ts`: entity file discovery and repository directory initialization.
- `loader.ts`: loading `.planfs` files into typed entities.
- `validator.ts`: schema and cross-reference validation.
- `repository.ts`: read/write repository operations and entity templates.
- `graph.ts`: dependency graph and blocked-task analysis.
- `search.ts`: saved filter loading and entity filtering.
- `git.ts`: branch and commit-message helpers.
- `pull-request.ts`: provider-neutral pull request summary support.

Core code should not depend on VS Code APIs or command-line formatting.

### `src/cli`

`planfs-cli` provides command-line access to the core APIs. It is built with `yargs` and should mostly translate command arguments into core operations, then format output.

Current command groups:

```sh
planfs init
planfs validate
planfs list tasks
planfs list epics
planfs list milestones
planfs list decisions
planfs show TASK-001
planfs create task --title "Example"
planfs create epic --title "Example"
planfs create milestone --title "Example" --target-date 2026-12-31
planfs branch
planfs git commit-message
planfs git validate-message "TASK-001: message"
planfs pr summary
planfs pr providers
planfs ai summary
planfs ai update-task --id TASK-001 --status in-progress --dry-run
```

The CLI is also the CI integration surface. Automation should prefer JSON-capable commands such as:

```sh
node src/cli/dist/cli.js validate --format json
```

### `src/vscode`

`planfs-vscode` is the editor UI over PlanFS files. It uses `planfs-core` for repository behavior and VS Code APIs for views, commands, file watching, and webviews.

Primary surfaces:

- Activity bar container and PlanFS Explorer tree.
- Repository initialization command.
- Task, epic, and milestone creation commands.
- Structured editor for task, epic, and milestone metadata.
- Kanban board webview.
- Insights webview for dependency, roadmap, and branch views.
- Saved filter selection and clearing.
- File watchers for `.planfs/**/*.md` and `.planfs/**/*.json`.
- Lightweight Explorer decoration for the `.planfs` directory.

The extension should avoid duplicating parser or validation logic. When it needs new repository behavior, add that behavior to `planfs-core` first and consume it from the extension.

## Data Model

PlanFS stores each planning entity as a Markdown file with YAML frontmatter:

```text
.planfs/
  tasks/
  epics/
  milestones/
  decisions/
  filters/
```

Common entity fields include:

- `id`
- `title`
- `status`
- `priority`
- `assignee` or `owner`
- `epic`
- `milestone`
- `dependsOn`
- `tags`
- `createdAt`
- `updatedAt`

New writer code should serialize metadata as camelCase. The parser accepts selected kebab-case and snake_case aliases for compatibility, but generated output should remain consistent with the documented format.

For the complete file format, see [File Format](./FILE_FORMAT.md).

## Read Flow

```text
CLI or VS Code command
  -> planfs-core loads .planfs directories
  -> Markdown frontmatter is parsed
  -> metadata is normalized into typed entities
  -> schemas and cross-references are validated
  -> callers render tables, trees, boards, insights, or JSON
```

All read paths should tolerate direct human edits to Markdown files and report useful validation errors when files are malformed.

## Write Flow

```text
User action
  -> CLI or VS Code command gathers input
  -> planfs-core creates or updates entity content
  -> Markdown file is written under .planfs
  -> file watchers refresh VS Code views
  -> validation can be run locally or in CI
```

Writers should preserve the human-readable nature of the files:

- Keep frontmatter compact and deterministic.
- Avoid generated noise and hidden state.
- Preserve Markdown body content where possible.
- Prefer core serializers and templates over ad hoc string formatting.

## Validation

Validation has two layers:

- Schema validation confirms entity fields, structure, and values.
- Repository validation checks references across files, such as task dependencies, epic links, and milestone links.

Use these commands during development:

```sh
npm run build --workspaces
node src/cli/dist/cli.js validate
node src/cli/dist/cli.js validate --format json
```

See [CI Validation](./CI.md) for automation examples.

AI-assisted workflows should start from `planfs ai summary` and apply common metadata changes through `planfs ai update-task --dry-run` before writing. See [AI-Assisted Planning Workflows](./AI_WORKFLOWS.md).

## Extension Packaging

The VS Code extension depends on local workspace packages, so it is packaged from a clean staging directory rather than directly from `src/vscode`.

```sh
npm run package:vscode
```

The packaging script builds all workspaces, packs local runtime dependencies, stages the extension under `dist/vscode-package`, and creates a `.vsix` under `dist/`.

See [VS Code Extension Build and Local Install](./VSCODE_EXTENSION.md) and [Release Process](./RELEASE.md) for deployment details.

## Roadmap

The roadmap is tracked in PlanFS itself. The `.planfs/` directory is the source of truth for phases, milestones, tasks, dependencies, and status.

Useful commands:

```sh
node src/cli/dist/cli.js list epics
node src/cli/dist/cli.js list milestones
node src/cli/dist/cli.js list tasks
node src/cli/dist/cli.js show TASK-029
```

Do not maintain a second implementation roadmap document. Add or update `.planfs` artifacts instead.
