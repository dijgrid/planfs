# Getting Started

## Project Overview

PlanFS is a Git-native project management system built as a VS Code extension with CLI tooling. Project artifacts (tasks, epics, milestones) are stored as Markdown files in the `.planfs/` directory.

## Prerequisites

- **Node.js** 16.x or higher
- **npm** 7.x or higher (or yarn/pnpm)
- **Git** 2.x or higher
- **VS Code** 1.60 or higher (for extension development)

## Repository Structure

```
planfs/
├── src/
│   ├── core/              # Core library (parsing, validation)
│   ├── vscode/            # VS Code extension
│   ├── cli/               # Command-line interface
│   └── schema/            # Entity schemas
├── docs/                  # Documentation
├── examples/              # Example projects
└── package.json
```

## Development Setup

### 1. Clone Repository

```bash
cd planfs
git clone https://github.com/your-org/planfs.git
cd planfs
```

### 2. Install Dependencies

```bash
npm install
```

This installs dependencies for all workspaces (core, vscode, cli).

### 3. Build All Components

```bash
npm run build
```

### 4. Run Tests

```bash
npm test
```

## Component Setup

### planfs-core

Shared library for parsing and validating PlanFS files.

**Develop:**
```bash
cd src/core
npm install
npm run build
npm test
```

**Export types for extension/CLI:**
```bash
npm run build:types
```

### planfs-vscode

VS Code extension providing UI and commands.

**Develop:**
```bash
cd src/vscode
npm install
npm run build
```

**Test in VS Code:**
1. Open `src/vscode` in VS Code
2. Press `F5` to start debugging
3. A new VS Code window opens with the extension installed
4. Open a folder with `.planfs/` directory
5. Click PlanFS icon in Activity Bar

**Package extension:**
```bash
vsce package  # Creates .vsix file
```

### planfs-cli

Command-line tool for validation and management.

**Develop:**
```bash
cd src/cli
npm install
npm link  # Makes 'planfs' command available globally
npm run build
```

**Run commands:**
```bash
planfs validate
planfs list tasks
planfs branch
planfs git commit-message
planfs git validate-message "TASK-001: update planning docs"
planfs create task
```

### planfs-schema

Entity schemas and validation rules.

**Develop:**
```bash
cd src/schema
npm run build
npm test
```

## Creating Your First Project

### 1. Create Project Directory

```bash
mkdir my-project
cd my-project
git init
```

### 2. Create .planfs Directory

```bash
mkdir -p .planfs/{tasks,epics,milestones,decisions}
```

### 3. Create First Task

Create `.planfs/tasks/TASK-001.md`:

```markdown
---
id: TASK-001
title: Set up project repository
status: todo
priority: high
---

Initialize the project repository with core structure and documentation.

## Acceptance Criteria

- [ ] Repository created
- [ ] Initial commit made
- [ ] README documented
- [ ] Team can clone and build
```

### 4. Validate Repository

```bash
planfs validate
```

### 5. Commit to Git

```bash
git add .planfs/
git commit -m "TASK-001: Set up project repository"
```

### 6. Open in VS Code

```bash
code .
```

Install the PlanFS extension and you'll see the PlanFS explorer in the sidebar.

## Common Tasks

### List All Tasks

```bash
planfs list tasks
planfs list tasks --status todo
planfs list tasks --assignee justin
```

### Create Task from CLI

```bash
planfs create task --title "Write the next thing"
```

The MVP CLI requires `--title`.

### Create Task from VS Code

1. Open command palette (Cmd+Shift+P)
2. Type "PlanFS: Create Task"
3. Enter the task title

### View Kanban Board

1. Open command palette (Cmd+Shift+P)
2. Type "PlanFS: Open Board"
3. Drag cards between status columns to update task files

### View Insights

1. Open command palette (Cmd+Shift+P)
2. Type "PlanFS: Open Insights"
3. Review dependency graph, timeline, and reports

### Edit Task

1. Open task file in VS Code editor
2. Edit YAML frontmatter and markdown body
3. Save changes
4. Changes automatically validate

## File Format Basics

### Task

```yaml
---
id: TASK-001
title: Task title
status: todo          # todo | in-progress | review | done
priority: high        # low | medium | high | critical
assignee: username    # optional
epic: EPIC-xxx        # optional
milestone: MILESTONE-xxx  # optional
dependsOn:            # optional
  - TASK-000
tags: []              # optional
---

Description of what needs to be done.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
```

### Epic

```yaml
---
id: EPIC-auth-system
title: Epic title
status: active        # active | completed | on-hold | archived
owner: username       # optional
---

Description of the epic and its goals.
```

### Milestone

```yaml
---
id: MILESTONE-v1-beta
title: Milestone title
targetDate: 2026-09-01
status: active        # active | completed | delayed
---

What needs to be delivered.
```

See [File Format](./FILE_FORMAT.md) for complete specification.

## Development Workflow

### Adding a Feature

1. Create a branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make changes in appropriate component

3. Build and test:
   ```bash
   npm run build
   npm test
   ```

4. Commit with clear message:
   ```bash
   git commit -m "feat: Add new feature description"
   ```

5. Push and create pull request:
   ```bash
   git push origin feature/my-feature
   ```

### Running Tests

Run all tests:
```bash
npm test
```

Run tests for specific component:
```bash
cd src/core
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

### Code Quality

Format code:
```bash
npm run format
```

Lint code:
```bash
npm run lint
```

## Debugging

### VS Code Extension

1. Open `src/vscode` in VS Code
2. Set breakpoints in TypeScript files
3. Press F5 to start debugging
4. Test extension in the debug window

### CLI

```bash
node --inspect-brk node_modules/.bin/planfs validate
# Then open chrome://inspect in Chrome
```

### Core Library

```bash
# In src/core
npm test -- --verbose
```

## Example Projects

Check out `examples/` directory for sample projects:

```bash
cd examples/basic-project
planfs validate
planfs list tasks
planfs branch
planfs git commit-message
```

## Troubleshooting

### Extension not showing in VS Code

1. Ensure VS Code is reopened after installation
2. Check if extension is enabled: VS Code → Extensions → PlanFS
3. Check output panel for errors: View → Output

### Validation errors

```bash
planfs validate
```

Shows detailed errors and suggestions for fixes.

### Git issues

Ensure `.planfs/` files are not ignored by `.gitignore`:

```bash
git check-ignore .planfs/
# Should return nothing
```

## Next Steps

1. Read [Architecture](./ARCHITECTURE.md) to understand system design
2. Check [File Format](./FILE_FORMAT.md) for detailed specifications
3. Review [Implementation Plan](./IMPLEMENTATION_PLAN.md) for development roadmap
4. Explore examples in `examples/` directory
5. Join the community for questions and discussions

## Additional Resources

- [VS Code Extension Guide](https://code.visualstudio.com/api)
- [Markdown Specification](https://spec.commonmark.org/)
- [YAML Specification](https://yaml.org/)
- [JSON Schema Documentation](https://json-schema.org/)

## Getting Help

- **Documentation:** Check the `docs/` directory
- **Examples:** Review `examples/` for reference projects
- **Issues:** Report bugs on GitHub issues
- **Discussions:** Ask questions in GitHub discussions
- **Community:** Join our community chat

---

Happy planning! 🚀
