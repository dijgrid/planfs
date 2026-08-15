# File Format Specification

PlanFS uses a simple, human-readable format combining Markdown with YAML frontmatter. This ensures that files remain accessible to version control systems and readable by humans, even without specialized tooling.

Semantic inspection and validation are additive derived views over this source. Optional semantic formatting is explicit and previewable: it canonicalizes only uniquely recognized section headings and acceptance/release checklist markers, preserves all other source text, and requires a whole-file fingerprint before applying a preview. See [Semantic Markdown Formatting](SEMANTIC_FORMATTING.md).

## Semantic Markdown profiles (v1.4)

The YAML schema, Markdown profile, advisory analysis, and repository validation are separate layers. YAML frontmatter is authoritative for `status`, `dependsOn`, `epic`, `milestone`, parents, supersession, and every other planning relationship. Markdown is authoritative only as human-authored content. PlanFS derives a loss-aware structural view from it, while prose mentions and local analyzer signals are advisory and never alter metadata by themselves. Repository validation checks cross-file integrity and is read-only.

The semantic contract and each entity profile are version `1.0.0`. A body consists of an exact preamble followed by source-ordered level-two sections. Level-three through level-six headings remain nested content. Unknown, duplicate, empty, malformed, raw-HTML, fenced-code, and imported content is preserved. Source ranges use zero-based UTF-16 offsets, one-based lines/columns, inclusive starts, and exclusive ends against the exact raw Markdown body.

| Entity | Canonical section | Explicit aliases | Expected shape |
| --- | --- | --- | --- |
| Task | Scope | In Scope | prose or list |
| Task | Acceptance Criteria | Acceptance; Success Criteria | task list |
| Task | Non-Goals | Out of Scope | prose or list |
| Task | Implementation Notes | Technical Notes | mixed |
| Task | Testing Strategy | Test Plan | prose or list |
| Epic | Outcomes | Goals | prose or list |
| Epic | Child Tasks | Tasks | list or references |
| Milestone | Release Criteria | Exit Criteria; Success Criteria | task list |
| Milestone | Child Epics | Epics | list or references |
| Milestone | Risks | Known Risks | prose or list |
| Decision | Context | Background | prose |
| Decision | Decision | Resolution | prose |
| Decision | Consequences | Implications | prose or list |
| Decision | Alternatives | Options Considered | prose or list |
| All applicable profiles | Findings | none | prose or list |
| All applicable profiles | References | Links | list or references |
| All applicable profiles | Questions | Open Questions | prose or list |

Tasks and epics also recognize the shared Scope and Non-Goals rows; epics and milestones recognize Outcomes; task, epic, and milestone profiles recognize Decisions (`Decision Log`); exact per-profile definitions live in [the semantic contract](SEMANTIC_DOCUMENTS_V1_4.md). Every recognized section has cardinality `0..1`. Reads remain tolerant when cardinality or shape is violated and report stable diagnostics instead of discarding content.

Acceptance and release criteria preserve all list items. `[x]`/`[X]` becomes `checked: true`, `[ ]` becomes `checked: false`, and an ordinary list item becomes `checked: null`. The provenance values are `canonical`, `alias`, `rule-inferred`, and `nlp-inferred`. Only the first three can describe structural extraction; `nlp-inferred` is always advisory.

Conformance is explicit: baseline checks parseability and unambiguous structure; automation-ready adds required sections, expected shapes, and criterion-state policy; lifecycle checks compare authored content with authoritative lifecycle metadata; optional analysis contributes advisory diagnostics without changing structural conformance. Diagnostic consumers should key on code and structured fields, not English messages. See [Semantic Validation](SEMANTIC_VALIDATION.md), [Compatibility and Automation](SEMANTIC_COMPATIBILITY_AND_AUTOMATION.md), and [Local Advisory Analysis](SEMANTIC_ANALYSIS.md).

Repositories use `.planfs/planfs.json` to declare `formatVersion`. Version 1 is the current format; repositories created before this marker are treated as compatible v1 repositories until `planfs migrate --apply` writes the marker. Normal reads and saves never add it implicitly. Use `planfs migrate` to preview changes first, and keep version-control backups available before applying a migration. A repository declaring a newer format is refused with an upgrade message rather than rewritten.

Archived tasks and epics retain an `archive` object with `archivedAt`, `originalPath`, and, for unfinished work, an explicit `disposition` (`cancelled`, `duplicate`, `deferred`, or `superseded`). An optional `note` records the human reason. Older archives without a disposition remain readable and appear as legacy archives; restoring removes archive-only metadata.

---

## General Format

All PlanFS entities follow this structure:

```
---
<YAML frontmatter with metadata>
---

<Markdown body content>
```

### Example

```markdown
---
id: TASK-001
title: Add login endpoint
status: todo
priority: high
assignee: justin
epic: EPIC-auth-system
milestone: MILESTONE-v1-beta
dependsOn:
  - TASK-000
tags:
  - api
  - auth
createdAt: 2026-06-14T10:00:00Z
updatedAt: 2026-06-14T10:00:00Z
---

Implement JWT-based login endpoint with proper error handling.

## Acceptance Criteria

- [ ] Accept username/password combination
- [ ] Return JWT token on success
- [ ] Return 401 on invalid credentials
- [ ] Log authentication attempts
- [ ] Rate limit login attempts

## Implementation Notes

Consider using bcrypt for password hashing. See TASK-000 for related infrastructure setup.

## Testing Strategy

- Unit tests for token generation
- Integration tests with auth service
- Manual testing with curl
```

---

## Task Entity

Tasks represent units of work.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `TASK-001`) |
| `title` | string | Short, descriptive title |
| `status` | enum | One of: `todo`, `in-progress`, `review`, `done` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `priority` | enum | One of: `low`, `medium`, `high`, `critical` |
| `assignee` | string | GitHub username or email |
| `epic` | string | Parent epic ID (e.g., `EPIC-auth`) |
| `milestone` | string | Associated milestone ID |
| `dependsOn` | array | List of task IDs this task depends on |
| `tags` | array | Arbitrary labels for categorization |
| `createdAt` | datetime | ISO 8601 timestamp (auto-generated) |
| `updatedAt` | datetime | ISO 8601 timestamp (auto-updated) |
| `dueDate` | datetime | Optional target completion date |
| `estimate` | string | Optional effort estimate (e.g., "2d", "5h") |
| `refinementState` | enum | Optional backlog refinement state: `captured`, `needs-refinement`, `ready`, `deferred`, or `discarded` |
| `backlogOrder` | number | Optional human-editable ordering value within an epic, or globally when no epic is set |
| `links` | object | External references |
| `archive` | object | Archive metadata when the task has been moved to `.planfs/archive/tasks/` |

### Full Schema

```yaml
id: TASK-001
title: "Implementation task title"
status: todo  # todo | in-progress | review | done
priority: high  # low | medium | high | critical
assignee: "username"
epic: "EPIC-xxx"
milestone: "MILESTONE-xxx"
dependsOn:
  - TASK-000
  - TASK-002
tags:
  - backend
  - critical
createdAt: "2026-06-14T10:00:00Z"
updatedAt: "2026-06-14T10:00:00Z"
dueDate: "2026-07-01"
estimate: "3d"
refinementState: ready
backlogOrder: 10
links:
  github: "https://github.com/user/repo/issues/123"
  figma: "https://figma.com/..."
```

Backlog refinement metadata is separate from task `status`. Missing `refinementState` is treated as `ready` for backward compatibility, while explicit `captured`, `needs-refinement`, `deferred`, and `discarded` items stay out of next-work recommendations until refined.

### File Location & Naming

Tasks are stored in `.planfs/tasks/`:

```
.planfs/tasks/TASK-001.md
.planfs/tasks/TASK-002.md
```

File name must match the task ID in the frontmatter.

### Archived Tasks

Archived tasks are moved out of the active task directory and stored in `.planfs/archive/tasks/`. They keep their normal task metadata and body, plus an `archive` object:

```yaml
archive:
  archivedAt: "2026-06-21T18:44:00Z"
  originalPath: ".planfs/tasks/TASK-001.md"
```

Archived tasks are hidden from normal list, board, backlog, next-work, search, and explorer views by default. They remain readable Markdown files and can be browsed, restored, or permanently deleted through archive workflows.

Active tasks may keep `dependsOn` references to archived tasks as historical prerequisites. Validation reports those references as warnings, not errors, and next-work readiness treats archived dependencies as satisfied.

---

## Epic Entity

Epics represent larger bodies of work comprising multiple tasks.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `EPIC-auth-system`) |
| `title` | string | Epic title |
| `status` | enum | One of: `active`, `completed`, `on-hold`, `archived` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `priority` | enum | One of: `low`, `medium`, `high`, `critical` |
| `owner` | string | GitHub username or email |
| `description` | string | Longer description (also in body) |
| `tags` | array | Labels for categorization |
| `createdAt` | datetime | ISO 8601 timestamp |
| `updatedAt` | datetime | ISO 8601 timestamp |
| `targetDate` | datetime | Optional epic planning horizon; retained for compatibility |
| `links` | object | External references |
| `archive` | object | Archive metadata when the epic has been moved to `.planfs/archive/epics/` |

### Full Schema

```yaml
id: EPIC-auth-system
title: "Authentication System"
status: active  # active | completed | on-hold | archived
priority: high  # low | medium | high | critical
owner: "username"
description: "Build user authentication and authorization"
tags:
  - core
  - security
createdAt: "2026-06-14T10:00:00Z"
updatedAt: "2026-06-14T10:00:00Z"
targetDate: "2026-09-01"
links:
  design: "https://..."
```

### File Location & Naming

Epics are stored in `.planfs/epics/`:

```
.planfs/epics/EPIC-auth-system.md
.planfs/epics/EPIC-payment-processing.md
```

An epic `targetDate` is an optional planning hint for the scope described by the epic. When tasks also belong to a milestone, use the milestone `targetDate` as the delivery commitment; the epic date should not be interpreted as a competing release date.

### Archived Epics

Archived epics are moved to `.planfs/archive/epics/` and use the same `archive` metadata object as archived tasks. Archiving an epic can also archive its child tasks when the user confirms that action. Archived epics are hidden from normal planning surfaces by default, but archive views can still display them for inspection, restore, or permanent deletion.

---

## Milestone Entity

Milestones represent delivery targets or release points.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `MILESTONE-v1-beta`) |
| `title` | string | Milestone title |
| `targetDate` | datetime | Preferred delivery commitment for the milestone |
| `status` | enum | One of: `active`, `completed`, `delayed` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Milestone description |
| `owner` | string | Responsible party |
| `createdAt` | datetime | ISO 8601 timestamp |
| `updatedAt` | datetime | ISO 8601 timestamp |
| `links` | object | External references |

### Full Schema

```yaml
id: MILESTONE-v1-beta
title: "Beta Release"
targetDate: "2026-09-01"
status: active  # active | completed | delayed
description: "Initial beta release with core features"
owner: "username"
createdAt: "2026-06-14T10:00:00Z"
updatedAt: "2026-06-14T10:00:00Z"
links:
  announcement: "https://..."
```

### File Location & Naming

Milestones are stored in `.planfs/milestones/`:

```
.planfs/milestones/MILESTONE-v1-beta.md
.planfs/milestones/MILESTONE-v1-release.md
```

### Choosing Epic and Milestone Dates

- Use a milestone target date for a release, sprint, launch, external commitment, or checkpoint.
- Use an epic target date only when a scope-oriented planning horizon is useful.
- Use both when the epic horizon provides useful context and the milestone carries the actual delivery commitment.
- Use neither for an epic without a meaningful planning horizon and for tasks that do not need a milestone. Milestones themselves still require `targetDate`.

---

## Decision Entity

Decisions document architecture decisions (ADR-style).

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `DECISION-001`) |
| `title` | string | Decision title |
| `status` | enum | One of: `proposed`, `accepted`, `rejected`, `superseded` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | datetime | When decision was made |
| `context` | string | Problem/context (also in body) |
| `decision` | string | Decision made (also in body) |
| `consequences` | string | Implications (also in body) |
| `author` | string | Author |
| `supersedes` | string | ID of decision this supersedes |
| `supersededBy` | string | ID of decision that supersedes this |

### Full Schema

```yaml
id: DECISION-001
title: "Use PostgreSQL as primary datastore"
status: accepted  # proposed | accepted | rejected | superseded
date: "2026-06-14"
context: "Need to evaluate databases for v1"
decision: "PostgreSQL provides best balance of features and operational simplicity"
consequences: "Must manage schema migrations, backup strategy, scaling architecture"
author: "username"
supersedes: null
supersededBy: null
```

### File Location & Naming

Decisions are stored in `.planfs/decisions/`:

```
.planfs/decisions/DECISION-001.md
.planfs/decisions/DECISION-002.md
```

---

## Task Findings

Use an optional `## Findings` section in a task's Markdown body to record observations, evidence, and review context discovered while doing that work. Findings deliberately stay with the task: they do not need frontmatter, IDs, or a separate lifecycle.

```markdown
## Findings

- Automatic file-change refreshes reconstructed some webviews, clearing active tabs and filters.
- Updating the webview through a message preserves valid local state while refreshing task data.
```

When a finding drives a durable cross-project decision, link to an ADR-style decision file from the task's `## References` section.

---

## Body Content

The body (after the YAML frontmatter) is pure Markdown and can contain:

- Detailed descriptions
- Acceptance criteria (task checklists)
- Implementation notes
- Context and rationale
- Links and references
- Code snippets
- Images/diagrams (as links)

**Important:** The body is human-readable and searchable. Keep it concise but informative.

### Example Task Body

```markdown
Implement JWT-based login endpoint with proper error handling.

## Acceptance Criteria

- [ ] Accept username/password combination
- [ ] Return JWT token on success (expires in 24h)
- [ ] Return 401 on invalid credentials
- [ ] Log all authentication attempts
- [ ] Rate limit: max 5 failed attempts per IP per hour

## Implementation Notes

- Use bcrypt for password hashing (see TASK-000)
- Consider token refresh token rotation
- Integrate with user service (TASK-002)

## Testing Strategy

- Unit tests for token generation and validation
- Integration tests with database
- Load testing with 1000 concurrent requests

## References

- Auth service API: docs/api/auth.md
- Security guidelines: docs/SECURITY.md
```

---

## Saved Filters

Saved filters are named reusable query definitions stored as JSON under `.planfs/filters/`. They are not project entities, so they do not use Markdown frontmatter.

```json
{
  "id": "open-phase-2",
  "name": "Open Phase 2 Work",
  "description": "Open tasks in the Phase 2 enhanced editing epic.",
  "criteria": {
    "query": "editor",
    "status": ["todo", "in-progress", "review"],
    "assignee": "justin",
    "epic": "EPIC-phase-2-enhanced",
    "priority": "high",
    "tags": ["vscode", "phase-2"]
  }
}
```

All criteria fields are optional. `query` searches IDs, titles, metadata, and Markdown body content. Structured task filters can target `status`, `assignee`, `epic`, `priority`, and `tags`. `status` accepts either a single status string or an array of statuses.

Saved filters are stored in `.planfs/filters/`:

```
.planfs/filters/open-phase-2.json
.planfs/filters/my-work.json
```

---

## ID Format & Conventions

### Naming Conventions

- **Task IDs:** `TASK-NNN` (e.g., `TASK-001`, `TASK-100`)
- **Epic IDs:** `EPIC-<slug>` (e.g., `EPIC-auth-system`, `EPIC-payment-flow`)
- **Milestone IDs:** `MILESTONE-<slug>` (e.g., `MILESTONE-v1-beta`, `MILESTONE-q3-2026`)
- **Decision IDs:** `DECISION-NNN` (e.g., `DECISION-001`, `DECISION-025`)

### ID Constraints

- IDs must be unique within their entity type
- IDs are case-sensitive
- IDs should be immutable (never change)
- IDs form the basis of commit messages and references

---

## Timestamps

All timestamps use ISO 8601 format:

```yaml
createdAt: "2026-06-14T10:30:45Z"
updatedAt: "2026-06-15T14:22:30Z"
```

- Use UTC timezone (Z suffix)
- Auto-generated by tooling (don't edit manually)
- Allows sorting and filtering

---

## References & Dependencies

### Task Dependencies

Tasks declare what they depend on:

```yaml
dependsOn:
  - TASK-001  # Wait for this task
  - TASK-002  # And this one
```

The system validates:
- Referenced tasks exist
- No circular dependencies
- Detects blocked tasks

### Epic References

Tasks reference their parent epic:

```yaml
epic: EPIC-auth-system
```

### Milestone References

Tasks can reference their target milestone:

```yaml
milestone: MILESTONE-v1-beta
```

### External Links

References to external systems:

```yaml
links:
  github: "https://github.com/user/repo/issues/123"
  figma: "https://figma.com/file/abc123"
  slack: "https://slack.com/archives/C123/p123456"
```

---

## Validation Rules

### Schema Validation

1. **Required fields** - Must be present (id, title, status)
2. **Type validation** - Fields have correct types
3. **Enum validation** - Status values from allowed set
4. **Format validation** - Dates in ISO 8601, IDs match patterns

### Reference Validation

1. **Epic exists** - Referenced epic must exist
2. **Milestone exists** - Referenced milestone must exist
3. **Dependencies exist** - All `dependsOn` tasks exist in active tasks or archived tasks; archived dependency references warn but do not fail validation
4. **No circular deps** - Task cannot indirectly depend on itself

### Global Validation

1. **Unique IDs** - No duplicate IDs of same type
2. **Filename match** - File name matches entity ID
3. **Well-formed YAML** - Frontmatter is valid YAML
4. **Markdown parseable** - Body is valid Markdown

---

## Malformed File Recovery

PlanFS tries to keep human-edited task and epic files visible even when the Markdown frontmatter is incomplete or malformed.

PlanFS can recover automatically enough to display a file when:

- Optional metadata is missing. Tasks default missing `status` to `todo`; epics default missing `status` to `active`.
- `id` is missing but the file name provides an ID, such as `.planfs/tasks/TASK-123.md`.
- YAML frontmatter is malformed but the file is still in a known entity directory and has a usable file name.
- Unknown metadata fields are present. They are preserved and reported as warnings.

PlanFS reports diagnostics when repair is required:

- Missing `id` diagnostics include the file path, the inferred ID if one is available, and guidance to add `id: ...` to frontmatter.
- Missing `title` diagnostics include the file path and guidance to add `title: <short summary>`.
- Malformed YAML diagnostics include the parser message and guidance to repair the frontmatter syntax.
- Invalid enum values, such as unsupported task or epic statuses, remain validation errors until corrected.

Save flows are intentionally conservative. PlanFS refuses to save when an entity ID is missing or when the entity ID no longer matches the source file name, because that could rewrite the wrong file or create a duplicate. After repairing the required fields in the structured editor or Markdown file, saving rewrites the file into normal YAML frontmatter plus Markdown body format.

---

## Evolution & Versioning

The format uses semantic versioning:

- `v1.0` - Current stable
- `v1.1` - Minor improvements (backward compatible)
- `v2.0` - Breaking changes

Each schema version is independently versioned. Semantic reads are an additive capability of repository format v1 and require no source rewrite. The semantic document, inspection JSON, content profiles, diagnostics, and formatter plan each expose their own version. New optional JSON fields, diagnostics, or aliases may be additive within a compatible release; removing an alias, changing a field's meaning/type, or changing a diagnostic code's meaning requires the corresponding semantic/profile contract version to change. A repository `formatVersion` transition is reserved for source syntax or authority changes that older tools cannot safely read. Tools support multiple versions during migration periods.

---

## Git Diffs

The format is designed for clean Git diffs:

```diff
---
-status: todo
+status: in-progress
---

-## Acceptance Criteria
+## Acceptance Criteria (Updated)
```

- YAML changes show clearly
- Line-based diffs work well
- Easy to review in pull requests
- Human reviewers understand changes

---

## Best Practices

1. **Keep IDs simple** - Use sequential numbers for tasks when possible
2. **Use meaningful epic names** - `EPIC-auth-system` > `EPIC-feature-x`
3. **Write clear descriptions** - Assume someone else will read this
4. **Update timestamps** - Tooling auto-updates these
5. **Atomic commits** - One entity change per commit when possible
6. **Reference related work** - Use task dependencies and links
7. **Keep bodies focused** - Body explains the "why", frontmatter is the "what"
