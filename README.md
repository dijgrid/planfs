# PlanFS

PlanFS is planning as code: a Git-native project management system where planning artifacts live in the repository as human-readable Markdown files with YAML frontmatter.

The repository becomes the source of truth for tasks, epics, milestones, decisions, and roadmap work. The core rule is simple: every UI or CLI action should produce files that remain clean, readable, reviewable, and editable by humans.

## Purpose

PlanFS is for engineering teams that want project planning to branch, diff, review, and merge alongside code instead of living only in an external SaaS tool.

It currently provides:

- `planfs-core`: parsing, loading, serialization, and validation
- `planfs-cli`: command-line validation and querying
- `planfs-vscode`: VS Code explorer, board, insights views, and task creation commands
- `planfs-schema`: shared entity schemas
- `.planfs/`: this repository's own roadmap represented as PlanFS data

PlanFS is not trying to replace enterprise portfolio management, time tracking, billing, or every Jira feature.

## Development Setup

Prerequisites:

- Node.js 16 or newer
- npm 7 or newer
- Git
- VS Code 1.60 or newer for extension development

Install dependencies:

```sh
npm install
```

Build all workspaces:

```sh
npm run build --workspaces
```

Run tests:

```sh
npm test --workspaces
```

Run lint:

```sh
npm run lint
```

Useful full verification pass:

```sh
npm run lint
npm run build --workspaces
npm test --workspaces
node src/cli/dist/cli.js validate
```

Generated `dist/` directories are build output and should not be committed.

## Brief Usage

After building, use the CLI against a repository containing `.planfs/`:

```sh
node src/cli/dist/cli.js validate
node src/cli/dist/cli.js list tasks
node src/cli/dist/cli.js list epics
node src/cli/dist/cli.js show TASK-001
node src/cli/dist/cli.js branch
node src/cli/dist/cli.js git commit-message
node src/cli/dist/cli.js git validate-message "TASK-001: update planning docs"
node src/cli/dist/cli.js list tasks --status todo --epic EPIC-phase-2-enhanced
node src/cli/dist/cli.js create task --title "Write the next thing"
```

A task file looks like this:

```markdown
---
id: TASK-001
title: Set up project repository
status: todo
priority: high
epic: EPIC-mvp-core
milestone: MILESTONE-v0-1
---

Describe the work in Markdown.
```

## VS Code Extension Development

The extension package lives in `src/vscode`, but it depends on the workspace packages. Build from the repository root first:

```sh
npm install
npm run build --workspaces
```

Then load and test the extension:

1. Open this repository in VS Code.
2. Open the Run and Debug view.
3. Select `Run PlanFS Extension`.
4. Press `F5` to launch an Extension Development Host.
5. In the Extension Development Host, open this repository or another folder containing `.planfs/`.
6. Use the command palette to run `PlanFS: Open Board`, `PlanFS: Open Insights`, `PlanFS: Create Task`, or `PlanFS: Refresh Explorer`.
7. Check the PlanFS activity bar view for tasks, epics, milestones, and decisions.

After changing TypeScript, rebuild before relaunching:

```sh
npm run build --workspaces
```

For package-specific notes, see [src/vscode/README.md](./src/vscode/README.md).

## Documentation

- [Getting Started](./docs/GETTING_STARTED.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [File Format](./docs/FILE_FORMAT.md)
- [CI Validation](./docs/CI.md)
- [VS Code Extension Build and Local Install](./docs/VSCODE_EXTENSION.md)
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)
- [Contributing](./docs/CONTRIBUTING.md)
- [Changelog](./docs/CHANGELOG.md)

Agent-specific guidance lives in [AGENTS.md](./AGENTS.md).

## License

MIT

## Contributing

Contributions are welcome. Start with [Contributing](./docs/CONTRIBUTING.md), keep changes focused, and run the verification commands before handing work off.
