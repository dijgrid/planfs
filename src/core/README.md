# planfs-core

Core parsing and validation library for PlanFS.

## Overview

`planfs-core` provides the foundation for all PlanFS tools:

- **File Discovery** - Discover `.planfs/` files in a repository
- **Parsing** - Extract YAML frontmatter and markdown body
- **Type System** - Strong typing for all entity types
- **Validation** - Schema validation and constraint checking
- **Repository API** - Load and query repositories
- **Entity Generation** - Create and serialize entities

## Installation

```bash
npm install planfs-core
```

## Usage

### Loading a Repository

```typescript
import { loadRepository, validateRepositoryState } from 'planfs-core';

const repo = await loadRepository('/path/to/project');

console.log(`Found ${repo.tasks.size} tasks`);
console.log(`Found ${repo.epics.size} epics`);

// Validate
const result = validateRepositoryState(repo);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Creating Entities

```typescript
import { createTaskTemplate, saveEntity } from 'planfs-core';

const task = createTaskTemplate('TASK-042', 'Implement feature X');
task.priority = 'high';
task.body = 'Detailed description of the work.';

await saveEntity('/path/to/project', task);
```

### Querying

```typescript
import { getTasksByStatus, getTasksByAssignee } from 'planfs-core';

const todoTasks = getTasksByStatus(repo, 'todo');
const myTasks = getTasksByAssignee(repo, 'user@example.com');
```

## API Reference

### Types

- `Entity` - Base entity interface
- `Task` - Task entity with status, priority, assignee, etc.
- `Epic` - Epic entity for larger bodies of work
- `Milestone` - Delivery milestone with target date
- `Decision` - Architecture decision record
- `Repository` - Container for all entities

### Functions

**File I/O:**
- `loadRepository(rootPath)` - Load entire repository
- `initializeRepository(rootPath)` - Initialize new repository
- `saveEntity(rootPath, entity)` - Save entity to disk
- `readFile(path)` - Read file content
- `writeFile(path, content)` - Write file content

**Validation:**
- `validateEntity(entity)` - Validate single entity
- `validateRepository(entities)` - Validate collection
- `validateAll(entities)` - Full validation

**Querying:**
- `getTasksByStatus(repo, status)` - Filter tasks by status
- `getTasksByAssignee(repo, assignee)` - Filter tasks by assignee
- `getTasksByEpic(repo, epicId)` - Get tasks in epic
- `getAllEntities(repo)` - Get all entities
- `getNextTaskId(repo)` - Generate next task ID

**Entity Creation:**
- `createTaskTemplate(id, title)` - Create new task template
- `generateEntityContent(entity)` - Generate file content from entity

### Parsing

- `parseFrontmatter(content)` - Parse YAML frontmatter and markdown
- `normalizeMetadata(metadata)` - Convert kebab-case and snake_case to camelCase

## Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

## Architecture

See [Architecture Documentation](../../docs/ARCHITECTURE.md) for system design details.

## File Format

See [File Format Specification](../../docs/FILE_FORMAT.md) for complete format details.

## License

MIT
