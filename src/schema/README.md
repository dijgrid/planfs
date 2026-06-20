# planfs-schema

JSON Schema definitions for PlanFS entities.

## Overview

`planfs-schema` provides versioned schema definitions for all entity types:

- Task schema (v1.0)
- Epic schema (v1.0)
- Milestone schema (v1.0)
- Decision schema (v1.0)

## Usage

```typescript
import { taskSchema, epicSchema, milestoneSchema, decisionSchema } from 'planfs-schema';

// Use with AJV for validation
import Ajv from 'ajv';

const ajv = new Ajv();
const validateTask = ajv.compile(taskSchema);

const task = {
  id: 'TASK-001',
  title: 'My task',
  status: 'todo'
};

if (validateTask(task)) {
  console.log('Valid task');
} else {
  console.log('Invalid task:', validateTask.errors);
}
```

## Schemas

### Task Schema

- Required: `id`, `title`, `status`
- Optional: `priority`, `assignee`, `epic`, `milestone`, `dependsOn`, `tags`, `dueDate`, `estimate`, `refinementState`, `backlogOrder`, `links`

### Epic Schema

- Required: `id`, `title`, `status`
- Optional: `owner`, `description`, `targetDate`, `tags`, `links`

### Milestone Schema

- Required: `id`, `title`, `targetDate`, `status`
- Optional: `description`, `owner`, `links`

### Decision Schema

- Required: `id`, `title`, `status`
- Optional: `date`, `context`, `decision`, `consequences`, `author`, `supersedes`, `supersededBy`

## License

MIT
