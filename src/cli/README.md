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
planfs validate --semantic baseline
planfs validate --semantic automation-ready --lifecycle
planfs validate --semantic automation-ready --criterion-check-state error --format json
planfs validate --semantic automation-ready --nlp --language en
```

Semantic validation is opt-in and remains separate from existing YAML and repository-integrity checks. `baseline` checks loss-preserving Markdown interpretation; `automation-ready` applies entity content profiles; `--lifecycle` adds read-only status-sensitive policy. Ordinary criteria can be ignored or reported at `info`, `warning`, or `error` severity. `--strict` fails on repository or semantic warnings. Enabled semantic JSON appears under a separate `semantic` key, leaving default JSON unchanged.

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
planfs show TASK-001 --nlp
planfs show TASK-001 --nlp --language en --format json
```

`--nlp` explicitly enables local, advisory English prose analysis. It reports promoted modality, negation, condition, date/duration, and possible relationship-mention signals with source locations. Analysis never edits the file or treats prose as authoritative metadata. It makes no network calls and downloads no model. Other languages return an advisory unsupported-language diagnostic without hiding the entity or failing the command.

Without `--nlp`, JSON output retains the existing entity shape. With `--nlp`, JSON is `{ "entity": ..., "analysis": ... }`; every signal is marked `nlp-inferred` and `authoritative: false`.

### Semantic Inspection

Inspect normalized Markdown content, authoritative relationships, diagnostics, and advisory suggestions through one stable surface:

```bash
planfs inspect TASK-001
planfs inspect TASK-001 --format json
planfs inspect TASK-001 --view acceptance-criteria --format json
planfs inspect TASK-001 --view relationships
planfs inspect TASK-001 --view raw --no-nlp
```

Semantic inspection runs the bundled local analyzer by default and can be made structural-only with `--no-nlp`. Normal text output shows deduplicated actionable suggestions; full JSON preserves analyzer identity, language, evidence, confidence, provenance, raw signals, exact source ranges, and raw Markdown. Analysis remains advisory and never modifies frontmatter. This does not change `validate`: analysis during validation is still explicitly enabled with `--nlp`.

Focused views are `all`, `acceptance-criteria`, `findings`, `sections`, `mentions`, `relationships`, and `raw`. See [Semantic Entity Inspection](../../docs/SEMANTIC_INSPECTION.md) for the stable envelope and integration examples.

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
