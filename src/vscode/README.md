# planfs-vscode

VS Code extension for PlanFS project management.

## Features

- **PlanFS Explorer** - Tree view showing all tasks, epics, milestones, and decisions
- **Kanban Board** - Webview board for dragging tasks between statuses
- **Insights** - Dependency graph, timeline, and reports
- **Create Tasks** - Quick command to create new tasks
- **Open Task Files** - Click to open and edit task files directly
- **Structured Editor** - Form-based task, epic, and milestone editing with validation
- **Auto Refresh** - Automatically refreshes explorer when files change
- **Board Refresh** - Automatically refreshes an open board when files change
- **Saved Filters** - Apply reusable `.planfs/filters/*.json` definitions in the explorer and board
- **Status Badges** - Visual indicators for task status

## Installation

For development, launch the extension from this repository:

```bash
npm install
npm run build --workspaces
```

Then use `Run PlanFS Extension` from the VS Code Run and Debug view.

For a local installable VSIX, see the [VS Code Extension Build and Local Install guide](https://github.com/dijgrid/planfs/blob/main/docs/VSCODE_EXTENSION.md).

## Usage

### Explorer View

Click the PlanFS icon in the Activity Bar to see the explorer view showing:

- **Tasks** - All tasks grouped by ID
- **Epics** - All epics
- **Milestones** - All milestones
- **Decisions** - All decisions

Use `PlanFS: Apply Saved Filter` to filter the explorer with a named filter from `.planfs/filters/`. Use `PlanFS: Clear Saved Filter` to return to the full repository view.

Use `PlanFS: Open Structured Editor` to edit tasks, epics, and milestones through forms. The editor keeps Markdown body content editable, offers assisted inputs for related PlanFS entities, and blocks invalid saves with validation feedback.

### Create Task

1. Press Cmd+Shift+P (or Ctrl+Shift+P on Windows/Linux)
2. Type "PlanFS: Create Task"
3. Enter task title
4. New task file is created in `.planfs/tasks/`

### Open Board

1. Press Cmd+Shift+P (or Ctrl+Shift+P on Windows/Linux)
2. Type "PlanFS: Open Board"
3. Drag cards between status columns to update task files
4. Select a saved filter to reuse repository-wide filter definitions

### Open Insights

1. Press Cmd+Shift+P (or Ctrl+Shift+P on Windows/Linux)
2. Type "PlanFS: Open Insights"
3. Review dependency graph, roadmap timeline, and reports

### Open Task Or Structured Editor

Click on any task in the explorer to open the task file in the editor.

To use the form editor:

1. Press Cmd+Shift+P (or Ctrl+Shift+P on Windows/Linux)
2. Type "PlanFS: Open Structured Editor"
3. Select a task, epic, or milestone

### Refresh Explorer

Use "PlanFS: Refresh Explorer" command to manually refresh if needed (auto-refresh is on by default).

## Development

### Build

```bash
npm run build
```

### Test Extension

1. Open VS Code
2. Open `src/vscode` folder
3. Press F5 to launch extension in debug mode
4. Open a workspace with `.planfs/` directory

### Debug

Set breakpoints in TypeScript and use VS Code debugging tools.

## Architecture

The extension uses `planfs-core` for all file operations and validation. See the [Architecture Documentation](https://github.com/dijgrid/planfs/blob/main/docs/ARCHITECTURE.md).

## Known Limitations (MVP)

- Create Epic/Milestone not yet implemented
- Structured entity editors are still in progress

## License

MIT
