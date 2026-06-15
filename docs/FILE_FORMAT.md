# File Format Specification

PlanFS uses a simple, human-readable format combining Markdown with YAML frontmatter. This ensures that files remain accessible to version control systems and readable by humans, even without specialized tooling.

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
| `links` | object | External references |

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
links:
  github: "https://github.com/user/repo/issues/123"
  figma: "https://figma.com/..."
```

### File Location & Naming

Tasks are stored in `.planfs/tasks/`:

```
.planfs/tasks/TASK-001.md
.planfs/tasks/TASK-002.md
```

File name must match the task ID in the frontmatter.

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
| `owner` | string | GitHub username or email |
| `description` | string | Longer description (also in body) |
| `tags` | array | Labels for categorization |
| `createdAt` | datetime | ISO 8601 timestamp |
| `updatedAt` | datetime | ISO 8601 timestamp |
| `targetDate` | datetime | Optional target completion |
| `links` | object | External references |

### Full Schema

```yaml
id: EPIC-auth-system
title: "Authentication System"
status: active  # active | completed | on-hold | archived
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

---

## Milestone Entity

Milestones represent delivery targets or release points.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `MILESTONE-v1-beta`) |
| `title` | string | Milestone title |
| `targetDate` | datetime | Target delivery date |
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
3. **Dependencies exist** - All `dependsOn` tasks exist
4. **No circular deps** - Task cannot indirectly depend on itself

### Global Validation

1. **Unique IDs** - No duplicate IDs of same type
2. **Filename match** - File name matches entity ID
3. **Well-formed YAML** - Frontmatter is valid YAML
4. **Markdown parseable** - Body is valid Markdown

---

## Evolution & Versioning

The format uses semantic versioning:

- `v1.0` - Current stable
- `v1.1` - Minor improvements (backward compatible)
- `v2.0` - Breaking changes

Each schema version is independently versioned. Tools support multiple versions during migration periods.

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
