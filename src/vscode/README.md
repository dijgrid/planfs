# planfs-vscode

VS Code extension for PlanFS project management.

## Features

- **PlanFS Explorer** - Tree view showing all tasks, epics, milestones, and decisions
- **Kanban Board** - Webview board for dragging tasks between statuses
- **Create Tasks** - Quick command to create new tasks
- **Open Task Files** - Click to open and edit task files directly
- **Auto Refresh** - Automatically refreshes explorer when files change
- **Board Refresh** - Automatically refreshes an open board when files change
- **Status Badges** - Visual indicators for task status

## Installation

Install from VS Code Extensions marketplace or build locally:

```bash
npm install
npm run build
# Then use F5 in VS Code to test
```

## Usage

### Explorer View

Click the PlanFS icon in the Activity Bar to see the explorer view showing:

- **Tasks** - All tasks grouped by ID
- **Epics** - All epics
- **Milestones** - All milestones
- **Decisions** - All decisions

### Create Task

1. Press Cmd+Shift+P (or Ctrl+Shift+P on Windows/Linux)
2. Type "PlanFS: Create Task"
3. Enter task title
4. New task file is created in `.planfs/tasks/`

### Open Board

1. Press Cmd+Shift+P (or Ctrl+Shift+P on Windows/Linux)
2. Type "PlanFS: Open Board"
3. Drag cards between status columns to update task files

### Open Task

Click on any task in the explorer to open the task file in the editor.

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

The extension uses `planfs-core` for all file operations and validation. See [Architecture Documentation](../../docs/ARCHITECTURE.md).

## Known Limitations (MVP)

- Create Epic/Milestone not yet implemented
- Board filtering and sorting are local to the open webview
- No dependency graph visualization (Phase 3)
- No git integration (Phase 4)

## License

MIT
