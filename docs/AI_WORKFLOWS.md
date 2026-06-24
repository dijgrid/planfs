# AI-Assisted Planning Workflows

PlanFS stores planning data in Markdown, so AI-assisted workflows should use small, targeted reads and safe repository APIs instead of broad file rewrites.

## Initialize Agent Awareness

Install or refresh repo-level agent guidance with:

```sh
node src/cli/dist/cli.js ai initialize
```

Preview the change first with:

```sh
node src/cli/dist/cli.js ai initialize --dry-run
```

The command creates or updates a marked PlanFS section in `AGENTS.md` so future AI coding agents know to start planning questions with the compact summary command.

## Review Board State

Use the AI summary before recommending next work or cleanup:

```sh
node src/cli/dist/cli.js ai summary
node src/cli/dist/cli.js ai summary --assignee justin
node src/cli/dist/cli.js ai summary --epic EPIC-ai-integration --limit 10
```

The summary is JSON and includes:

- open tasks, active epics, and active milestones
- ready and blocked work with readiness reasons
- stale plan indicators
- recently completed work
- IDs and file paths for targeted follow-up reads

For a focused next-work list, use:

```sh
node src/cli/dist/cli.js next --format json
```

## Preview Planning Updates

Use `ai update-task` for common task metadata changes. Preview first:

```sh
node src/cli/dist/cli.js ai update-task \
  --id TASK-061 \
  --status in-progress \
  --assignee justin \
  --dry-run \
  --format json
```

The dry run returns changed fields and a full Markdown preview without writing files.

## Apply Planning Updates

When the preview is correct, run the same command without `--dry-run`:

```sh
node src/cli/dist/cli.js ai update-task \
  --id TASK-061 \
  --status in-progress \
  --assignee justin
```

Supported fields are:

- `status`
- `priority`
- `assignee`
- `refinement-state`
- `due-date`
- `epic`
- `milestone`
- `tags`
- `estimate`

Applied updates set `updatedAt` and validate the repository before writing. Invalid references, unsupported metadata fields, and broken task metadata fail before partial writes.

## Preview Bulk Task Updates

Use `ai bulk-update-tasks` when the same bounded metadata change should apply to several existing tasks:

```sh
node src/cli/dist/cli.js ai bulk-update-tasks \
  --ids TASK-061,TASK-062 \
  --status review \
  --estimate 2d \
  --dry-run \
  --format json
```

Supported bulk fields are `status`, `priority`, `assignee`, `milestone`, and `estimate`. Bulk updates validate the full repository before writing and roll back task files if a later write in the batch fails.

## Preview Create And Archive Workflows

Existing create and archive commands also support preview/apply workflows for AI-assisted changes:

```sh
node src/cli/dist/cli.js create task \
  --title "Draft rollout notes" \
  --assignee justin \
  --dry-run \
  --format json

node src/cli/dist/cli.js archive archive \
  --id TASK-061 \
  --expected-updated-at 2026-06-20T00:00:00.000Z \
  --dry-run \
  --format json
```

Create previews show the Markdown that would be written. Archive previews show the archived entities and Markdown output without moving files. Pass `--expected-updated-at` to archive when replaying a preview so changed files are refused instead of overwritten.

## Validate AI Changes

After any AI-assisted update, run:

```sh
node src/cli/dist/cli.js validate
```

Validation reports common AI update mistakes, including unsupported frontmatter fields, broken references, stale or inconsistent `updatedAt` values, and open tasks linked to completed or archived planning containers.
