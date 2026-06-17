# PlanFS

PlanFS brings Git-native project planning into VS Code. It reads and writes human-editable Markdown files under `.planfs/`, so tasks, epics, milestones, decisions, filters, and planning state can live beside the code they describe.

## Features

- **PlanFS Explorer** - Browse tasks, epics, milestones, and decisions from the activity bar.
- **Repository initialization** - Create the standard `.planfs` directory structure from VS Code.
- **Kanban board** - Move tasks between status columns and persist updates back to Markdown.
- **Insights** - Review dependency graphs, roadmap timelines, and planning reports.
- **Entity creation** - Create tasks, epics, and milestones without leaving the editor.
- **Structured editing** - Edit task, epic, and milestone metadata with validation while keeping Markdown bodies readable.
- **Saved filters** - Reuse `.planfs/filters/*.json` definitions across the explorer and board.
- **Auto refresh** - Keep the explorer and board in sync when PlanFS files change on disk.

## Installation

Install PlanFS from the VS Code Marketplace once published, or install a local VSIX built from this repository:

```sh
npm run package:vscode
code --install-extension dist/planfs-vscode-0.1.0.vsix
```

For development setup and local packaging details, see the [VS Code Extension Build and Local Install guide](https://github.com/dijgrid/planfs/blob/main/docs/VSCODE_EXTENSION.md).

## Getting Started

Open a workspace containing `.planfs/`, or run `PlanFS: Initialize Repository` from the command palette to create the starter directory structure.

### Explorer View

Click the PlanFS icon in the activity bar to browse:

- Tasks
- Epics
- Milestones
- Decisions

Use `PlanFS: Apply Saved Filter` to filter the explorer with a named filter from `.planfs/filters/`. Use `PlanFS: Clear Saved Filter` to return to the full repository view.

### Create Planning Items

Use the command palette to create new files:

- `PlanFS: Create Task`
- `PlanFS: Create Epic`
- `PlanFS: Create Milestone`

Each command writes a clean Markdown file with YAML frontmatter to the matching `.planfs/` directory.

### Board And Insights

Use `PlanFS: Open Board` to work with tasks in a kanban view. Drag cards between status columns to update task files, or apply saved filters to focus the board.

Use `PlanFS: Open Insights` to inspect dependency graphs, roadmap timing, and summary reports.

### Structured Editor

Click a planning item in the explorer to open the Markdown file directly, or run `PlanFS: Open Structured Editor` to edit task, epic, and milestone metadata through a form. The structured editor keeps Markdown body content editable, offers assisted inputs for related PlanFS entities, and blocks invalid saves with validation feedback.

### Refreshing

PlanFS refreshes automatically when files under `.planfs/` change. Use `PlanFS: Refresh Explorer` if you want to force a manual refresh.

## Development

From the repository root:

```sh
npm install
npm run build --workspaces
```

Then open the repository in VS Code, select `Run PlanFS Extension`, and press `F5`.

## Architecture

The extension uses `planfs-core` for all file operations and validation. See the [Architecture Documentation](https://github.com/dijgrid/planfs/blob/main/docs/ARCHITECTURE.md).

## License

MIT
