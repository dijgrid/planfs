# Architecture

## Overview

PlanFS is organized into four main components, each with clear responsibilities. The system follows a layered architecture where core logic is separated from UI concerns, allowing multiple interfaces to share the same data model.

```
┌─────────────────────────────────────────────────────┐
│              VS Code Extension (UI)                  │
│         planfs-vscode                               │
└──────────────┬──────────────────────────────────────┘
                 │
┌────────────────┴──────────────────────────────────────┐
│              VS Code API / File System                │
└──────────────┬──────────────────────────────────────┘
                 │
┌────────────────┴──────────────────────────────────────┐
│          Command-Line Interface                       │
│         planfs-cli                                   │
└──────────────┬──────────────────────────────────────┘
                 │
┌────────────────┴──────────────────────────────────────┐
│          Core Library & Domain Model                  │
│         planfs-core                                  │
├─────────────────────────────────────────────────────┤
│  • File Discovery & Loading                          │
│  • YAML Frontmatter Parsing                          │
│  • Schema Validation                                 │
│  • Dependency Resolution                             │
│  • Entity Model                                      │
└────────────────┬──────────────────────────────────────┘
                 │
┌────────────────┴──────────────────────────────────────┐
│          Schema Definitions                           │
│         planfs-schema                                │
├─────────────────────────────────────────────────────┤
│  • Task Schema v1.0                                  │
│  • Epic Schema v1.0                                  │
│  • Milestone Schema v1.0                             │
│  • Decision Schema v1.0                              │
│  • Validation Rules                                  │
└────────────────────────────────────────────────────────┘
```

---

## Components

### 1. **planfs-core**

**Language:** TypeScript

**Location:** `src/core/`

**Responsibilities:**

- File system discovery of `.planfs/` directories
- Parse YAML frontmatter from markdown files
- Load and deserialize entity files
- Validate entities against schemas
- Resolve references between entities (tasks → epics, dependencies)
- Build dependency graphs
- Provide query interfaces for entity collections

**Key Exports:**

```typescript
// File loading
loadRepository(rootPath: string): Promise<Repository>
discoverEntities(rootPath: string): Promise<Entity[]>

// Parsing
parseFrontmatter(content: string): { metadata: Record<string, any>, body: string }

// Validation
validateEntity(entity: Entity, schema: Schema): ValidationResult[]

// Querying
findTask(id: string): Task | undefined
getTasksByStatus(status: string): Task[]
getDependencies(taskId: string): Task[]
getBlockedTasks(): Task[]
```

**Key Types:**

```typescript
interface Entity {
  id: string
  type: 'task' | 'epic' | 'milestone' | 'decision'
  filePath: string
  metadata: Record<string, any>
  body: string
}

interface Task extends Entity {
  title: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  assignee?: string
  epic?: string
  milestone?: string
  dependencies?: string[]
  tags?: string[]
}

interface Repository {
  root: string
  tasks: Map<string, Task>
  epics: Map<string, Epic>
  milestones: Map<string, Milestone>
  decisions: Map<string, Decision>
}
```

---

### 2. **planfs-vscode**

**Language:** TypeScript/TSX

**Location:** `src/vscode/`

**Responsibilities:**

- Implement VS Code extension lifecycle
- Provide Explorer view (tree view of tasks, epics, milestones)
- Implement Kanban board view
- Provide command palette commands for creating entities
- Edit task files and sync changes back to repository
- Watch file system for external changes
- Integrate with VS Code's file explorer and editor

**Key Features:**

1. **Explorer View**
   - Tree view: Tasks, Epics, Milestones, Decisions
   - Filter by status, assignee, priority
   - Quick actions: Open, Create, Delete

2. **Kanban Board**
   - Columns: Backlog, Todo, In Progress, Review, Done
   - Drag-and-drop to change status
   - Quick task details in hover

3. **Commands**
   - `planfs.createTask` - Create new task
   - `planfs.createEpic` - Create new epic
   - `planfs.createMilestone` - Create new milestone
   - `planfs.validateRepository` - Run full validation
   - `planfs.refreshExplorer` - Refresh views

4. **Editor Integration**
   - Edit task files directly
   - Syntax highlighting for YAML frontmatter
   - Validation on save
   - Quick actions in editor

---

### 3. **planfs-cli**

**Language:** TypeScript/Node.js

**Location:** `src/cli/`

**Responsibilities:**

- Command-line interface for validation and querying
- Batch operations (export, import)
- CI/CD integration hooks
- Performance analysis and reporting

**Commands:**

```bash
planfs validate                  # Validate repository schema
planfs list tasks               # List all tasks
planfs list tasks --status todo # Filter by status
planfs show TASK-001            # Show task details
planfs create task              # Interactive task creation
planfs graph                    # Show dependency graph
planfs export --format json     # Export to JSON
```

---

### 4. **planfs-schema**

**Language:** JSON Schema / TypeScript

**Location:** `src/schema/`

**Responsibilities:**

- Define versioned schemas for all entity types
- Provide validation rules and constraints
- Support schema evolution/versioning
- Generate TypeScript types from schemas

**Supported Schemas:**

- `task@1.0.json` - Task entity schema
- `epic@1.0.json` - Epic entity schema
- `milestone@1.0.json` - Milestone entity schema
- `decision@1.0.json` - Decision entity schema

---

## Data Flow

### Reading Tasks

```
File System (.planfs/tasks/*.md)
    ↓
planfs-core: discoverEntities()
    ↓
planfs-core: parseFrontmatter()
    ↓
planfs-core: validateEntity()
    ↓
Task Objects (in-memory)
    ↓
VS Code Extension / CLI
    ↓
User UI
```

### Creating Tasks

```
User Input (Form / Command Palette)
    ↓
planfs-vscode: Command Handler
    ↓
planfs-core: generateTaskFile()
    ↓
File System: Write to .planfs/tasks/TASK-XXX.md
    ↓
File Watcher: Detect change
    ↓
Refresh UI
```

### Editing Tasks

```
User Edit (VS Code Editor)
    ↓
File Save Event
    ↓
File Watcher Detection
    ↓
planfs-core: Reload Entity
    ↓
planfs-core: validateEntity()
    ↓
UI Update
```

---

## Dependency Resolution

### Task Dependencies

Tasks declare dependencies via `dependsOn` field:

```yaml
dependsOn:
  - TASK-001
  - TASK-002
```

The core library can compute:

- **Direct dependencies** - Immediate parent tasks
- **Transitive dependencies** - All ancestors
- **Dependents** - Tasks that depend on this one
- **Blocked tasks** - Tasks with unresolved dependencies
- **Critical path** - Longest dependency chain
- **Circular dependencies** - Validation errors

### Epic Dependencies

Epics contain multiple tasks. The system can compute:

- **Epic completion** - % of child tasks complete
- **Epic timeline** - Derived from child task milestones
- **Epic dependencies** - Inferred from child task dependencies

---

## File System Layout

```
repo/
├── .planfs/
│   ├── tasks/
│   │   ├── TASK-001.md
│   │   ├── TASK-002.md
│   │   └── TASK-003.md
│   │
│   ├── epics/
│   │   └── EPIC-auth-system.md
│   │
│   ├── milestones/
│   │   └── MILESTONE-v1-beta.md
│   │
│   ├── decisions/
│   │   └── DECISION-001.md
│   │
│   └── .planfs-config.yaml  # Optional: Repository-level config
│
└── src/
```

---

## Validation Pipeline

```
Entity File
    ↓
Parse YAML Frontmatter
    ↓
Check Required Fields
    ↓
Validate Against Schema
    ↓
Check Reference Integrity
    ├─ Epic exists?
    ├─ Milestone exists?
    ├─ Dependencies exist?
    └─ Assignee valid?
    ↓
Check Global Constraints
    ├─ Duplicate IDs?
    ├─ Circular dependencies?
    └─ Orphaned tasks?
    ↓
Validation Result
    ├─ ✅ Valid
    └─ ❌ Errors + Warnings
```

---

## Extension Points

### Future Integrations

1. **Git Integration** - Auto-link commits to tasks
2. **PR Integration** - Link pull requests to tasks (GitHub, GitLab, Azure DevOps)
3. **CI/CD Validation** - Run schema validation on commits
4. **Time Tracking** - Optional time estimation fields
5. **Risk Management** - Risk tracking entities
6. **Roadmap Visualization** - Timeline view for milestones

---

## Performance Considerations

- **Lazy loading** - Load only active repository on demand
- **Caching** - Cache parsed entities in memory with file watch invalidation
- **Incremental updates** - Watch file system for changes, update incrementally
- **Virtual scrolling** - For large task lists in UI
- **Indexed queries** - Build indexes by status, assignee, epic for fast filtering

---

## Error Handling

- **Graceful degradation** - Show errors but don't crash
- **Validation messages** - Clear, actionable error messages
- **Recovery** - Suggest fixes for common issues
- **Logging** - Optional verbose logging for debugging
