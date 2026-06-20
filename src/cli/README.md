# planfs-cli

Command-line interface for PlanFS.

## Overview

`planfs-cli` provides command-line tools for managing PlanFS repositories:

- **Validate** - Check repository integrity
- **Init** - Create repository structure
- **List** - Query entities with filtering
- **Backlog** - Capture, refine, order, and review backlog items
- **Next** - List ranked next-work candidates with explanations
- **Show** - Display entity details
- **Create** - Create new entities
- **PR** - Generate pull request planning context

## Installation

```bash
npm install -g planfs-cli
```

Or use locally:

```bash
npm install planfs-cli
npx planfs --help
```

## Commands

### Init

Initialize the repository structure:

```bash
planfs init
planfs init --format json
```

### Validate

Validate the repository for errors:

```bash
planfs validate
planfs validate --verbose
```

### List

List entities:

```bash
# List all tasks
planfs list tasks

# List tasks by status
planfs list tasks --status todo

# List tasks by assignee
planfs list tasks --assignee user@example.com

# List by epic
planfs list tasks --epic EPIC-auth-system

# Output as JSON
planfs list tasks --format json

# List other entity types
planfs list epics
planfs list milestones
planfs list decisions
```

### Next

List the most actionable work:

```bash
planfs next
planfs next --assignee justin
planfs next --epic EPIC-auth-system --explain
planfs next --include-blocked
planfs next --format json
```

`planfs next` filters out completed work by default, ranks ready and active tasks, and explains blockers when `--include-blocked` is used.

### Backlog

Capture and refine work before it becomes actionable:

```bash
planfs backlog capture --title "Investigate import workflow"
planfs backlog list
planfs backlog list --state needs-refinement --assignee justin
planfs backlog set-state --id TASK-060 --state ready
planfs backlog review
planfs backlog list --format json
```

Backlog refinement states are `captured`, `needs-refinement`, `ready`, `deferred`, and `discarded`. Explicit non-ready backlog items are separate from next-work recommendations.

### Show

Display entity details:

```bash
planfs show TASK-001
planfs show TASK-001 --format json
```

### Create

Create new entities:

```bash
# Create task
planfs create task --title "Implement feature X" --priority high

# With assignee
planfs create task --title "Fix bug" --status todo --assignee user@example.com

# Create epic
planfs create epic --title "Phase 6 - Polish" --owner justin

# Create milestone
planfs create milestone --title "v0.2" --target-date 2026-09-01 --owner justin
```

### Pull Requests

Generate pull request planning context from the current branch:

```bash
planfs pr summary
planfs pr summary --format json
planfs pr providers --format json
```

## Usage

### As a Module

```typescript
import { validateCommand, listCommand } from 'planfs-cli';

// Validate repository
const exitCode = await validateCommand('/path/to/repo', { verbose: true });

// List tasks
const code = await listCommand('/path/to/repo', {
  type: 'tasks',
  status: 'todo',
  format: 'json'
});
```

## Architecture

See [Architecture Documentation](../../docs/ARCHITECTURE.md) for system design.

## License

MIT
