# AI-Assisted Planning Workflows

PlanFS stores planning data in Markdown, so AI-assisted workflows should use small, targeted reads and safe repository APIs instead of broad file rewrites.

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

Applied updates set `updatedAt` and validate the repository before writing. Invalid references, unsupported metadata fields, and broken task metadata fail before partial writes.

## Validate AI Changes

After any AI-assisted update, run:

```sh
node src/cli/dist/cli.js validate
```

Validation reports common AI update mistakes, including unsupported frontmatter fields, broken references, stale or inconsistent `updatedAt` values, and open tasks linked to completed or archived planning containers.
