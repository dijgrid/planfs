# AI-Assisted Planning Workflows

PlanFS stores planning data in Markdown, so AI-assisted workflows should use small, targeted reads and safe repository APIs instead of broad file rewrites.

## Initialize Agent Awareness

Install or refresh repo-level agent guidance with:

```sh
planfs ai initialize
```

Preview the change first with:

```sh
planfs ai initialize --dry-run
```

The command creates or updates a marked PlanFS section in `AGENTS.md` so future AI coding agents know to start planning questions with the compact summary command. Generated guidance uses the portable `planfs` executable by default. Repositories with a wrapper can override it, for example `planfs ai initialize --command "./tools/planfs"`.

## Review Board State

Use the AI summary before recommending next work or cleanup:

```sh
planfs ai summary
planfs ai summary --assignee justin
planfs ai summary --epic EPIC-ai-integration --limit 10
planfs ai summary --only review --compact
planfs ai summary --only blocked --format text
```

The summary is JSON and includes:

- open tasks, active epics, and active milestones
- ready and blocked work with readiness reasons
- stale plan indicators
- recently completed work
- IDs and file paths for targeted follow-up reads

Use `--only open|ready|blocked|review|stale|recent` to return one section without repeated entities. `--compact` minifies JSON while preserving the default structured output, and `--format text` produces a concise terminal-oriented summary.

For a focused next-work list, use:

```sh
planfs next --format json
```

## Read Semantic Planning Context

After the summary identifies a relevant task, epic, milestone, or decision, retrieve a compact semantic context instead of reparsing its Markdown:

```sh
planfs ai context --id TASK-061
planfs ai context --id TASK-061 --compact
planfs ai context --id TASK-061 --format text
```

The shared core projection includes the entity's intent, recognized sections, acceptance criteria, findings, decisions, open questions, references, diagnostics, and authoritative relationships. Task context also includes readiness and resolved summaries for dependencies, its epic, and its milestone. Unresolved relationship IDs stay visible.

Context generation is read-only. Frontmatter relationships remain authoritative, source ranges trace extracted content back to Markdown, and advisory prose analysis is disabled by default. Enable the bundled local English rules explicitly with `--nlp`; those signals remain separate and never update planning data.

## Preview Planning Updates

Use `ai update-task` for common task metadata changes. Preview first:

```sh
planfs ai update-task \
  --id TASK-061 \
  --status in-progress \
  --assignee justin \
  --dry-run \
  --format json
```

The dry run returns changed fields, the current `expectedUpdatedAt` concurrency token, and a full Markdown preview without writing files. If the token is `null`, pass `--expected-updated-at none` when applying so a newly added timestamp still causes a conflict.

## Apply Planning Updates

When the preview is correct, run the same command without `--dry-run`:

```sh
planfs ai update-task \
  --id TASK-061 \
  --status in-progress \
  --assignee justin \
  --expected-updated-at 2026-06-20T00:00:00.000Z
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

Applied updates set `updatedAt` and validate the repository before writing. When `--expected-updated-at` is supplied, the command refuses to overwrite a task changed since the preview. Invalid references and broken task metadata fail before partial writes. Unsupported metadata fields are preserved and reported as warnings so human-authored files can be reviewed without losing information.

## Preview Bulk Task Updates

Use `ai bulk-update-tasks` when the same bounded metadata change should apply to several existing tasks:

```sh
planfs ai bulk-update-tasks \
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
planfs create task \
  --title "Draft rollout notes" \
  --assignee justin \
  --dry-run \
  --format json

planfs archive archive \
  --id TASK-061 \
  --expected-updated-at 2026-06-20T00:00:00.000Z \
  --dry-run \
  --format json
```

Create previews show the Markdown that would be written. Archive previews show the archived entities and Markdown output without moving files. Pass `--expected-updated-at` to archive when replaying a preview so changed files are refused instead of overwritten.

## Validate AI Changes

After any AI-assisted update, run:

```sh
planfs validate
```

Validation reports common AI update mistakes, including unsupported frontmatter fields, broken references, stale or inconsistent `updatedAt` values, and open tasks linked to completed or archived planning containers.
