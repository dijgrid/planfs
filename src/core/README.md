# planfs-core

Core parsing and validation library for PlanFS.

## Overview

`planfs-core` provides the foundation for all PlanFS tools:

- **File Discovery** - Discover `.planfs/` files in a repository
- **Parsing** - Extract YAML frontmatter and markdown body
- **Semantic Markdown** - Inspect body structure without rewriting source files
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

### Inspecting Semantic Markdown

Semantic parsing is explicit and deferred, so loading a repository does not parse every body automatically:

```typescript
import { parseSemanticDocument } from 'planfs-core';

const semantic = parseSemanticDocument('task', task.body, {
  filePath: task.filePath
});

console.log(semantic.preamble.text);
console.log(semantic.criteria);
console.log(semantic.findings);
console.log(semantic.questions);
console.log(semantic.mentions); // advisory; never authoritative metadata
```

The result preserves the original Markdown and exact source ranges. It exposes PlanFS concepts rather than the underlying parser's syntax tree.

For a complete read-only entity view with authoritative metadata, content-profile diagnostics, advisory mentions, and optional local analysis, use the inspection API:

```typescript
import {
  inspectSemanticEntity,
  selectSemanticInspectionView
} from 'planfs-core';

const inspection = await inspectSemanticEntity(task, {
  analysis: true,
  language: 'en'
});
const criteria = selectSemanticInspectionView(
  inspection,
  'acceptance-criteria'
);
```

The result keeps authoritative frontmatter relationships separate from advisory body mentions. Core analysis remains explicit; interactive PlanFS inspection enables it by default and offers an opt-out.

### Previewing and Applying Semantic Formatting

Semantic formatting is explicit, source-fingerprinted, and limited to edits proven by the shared semantic model:

```typescript
import {
  applySemanticFormats,
  previewSemanticFormats
} from 'planfs-core';

const preview = await previewSemanticFormats(rootPath, ['TASK-001']);
const applied = await applySemanticFormats(
  rootPath,
  ['TASK-001'],
  preview.expectedFingerprints
);
```

Preview never writes. Apply refuses stale fingerprints, validates all proposed results before writing, preserves unknown Markdown and frontmatter, and is idempotent.

### Optional Local Prose Analysis

Advisory analysis is explicit and local. Omitting `enabled: true` performs no analysis:

```typescript
import {
  parseSemanticDocument,
  runSemanticAnalysis
} from 'planfs-core';

const semantic = parseSemanticDocument('task', task.body, {
  filePath: task.filePath
});
const analysis = await runSemanticAnalysis(semantic, {
  enabled: true,
  language: 'en'
});
```

The built-in analyzer emits only the English-language rule signals promoted by the v1.4 spikes: modality, negation, condition introducers, explicit dates/durations, and possible relationship mentions. Every signal is `nlp-inferred`, includes exact source evidence, and has `authoritative: false`. It never updates frontmatter or repository relationships, makes no network calls, and does not require an NLP model or runtime download. Unsupported languages return an advisory diagnostic and no signals.

### Validating Semantic Content

Semantic validation is explicit and separate from existing schema/repository validation:

```typescript
import { validateSemanticEntity } from 'planfs-core';

const result = await validateSemanticEntity(task, {
  tier: 'automation-ready',
  lifecycle: true,
  criterionCheckState: 'warning',
  analysis: false
});
```

Baseline, automation-ready, lifecycle, and optional analysis diagnostics retain distinct conformance domains. Results contain stable codes, entity/file identity, source ranges, section keys, provenance, and repair guidance. Validation never changes Markdown, metadata, criterion state, or repository relationships.

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
- `parseSemanticDocument(entityType, body, options)` - Parse a body into the loss-aware semantic document model
- `runSemanticAnalysis(document, options)` - Explicitly run optional advisory prose analysis
- `LocalRuleSemanticAnalyzer` - Reusable local analyzer with a bounded content/version-aware cache
- `validateSemanticDocument(entity, document, options)` - Deterministically validate an already parsed document
- `validateSemanticEntity(entity, options)` - Parse and validate one loaded entity, optionally including local analysis
- `validateSemanticRepository(repository, options)` - Validate semantic content across active repository entities
- `inspectSemanticEntity(entity, options)` - Build a complete read-only semantic inspection result
- `selectSemanticInspectionView(inspection, view)` - Select a deterministic JSON-ready inspection view

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
