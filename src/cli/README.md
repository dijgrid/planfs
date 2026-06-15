# planfs-cli

Command-line interface for PlanFS.

## Overview

`planfs-cli` provides command-line tools for managing PlanFS repositories:

- **Validate** - Check repository integrity
- **List** - Query entities with filtering
- **Show** - Display entity details
- **Create** - Create new entities

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

# Epic and milestone creation are planned, but not implemented in the MVP CLI.
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
