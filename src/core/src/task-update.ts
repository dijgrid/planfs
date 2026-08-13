/**
 * Conflict-safe task metadata updates shared by CLI and UI consumers.
 */

import { generateEntityContent, saveEntity, validateRepositoryState } from './repository';
import {
  RefinementState,
  Repository,
  Task,
  TaskPriority,
  TaskStatus,
  ValidationError
} from './types';

export type TaskUpdateField =
  | 'title'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'refinementState'
  | 'dueDate'
  | 'epic'
  | 'milestone'
  | 'tags'
  | 'estimate';

export type TaskUpdatePatch = Partial<Pick<
  Task,
  'title' | 'status' | 'priority' | 'assignee' | 'refinementState' | 'dueDate' | 'epic' | 'milestone' | 'tags' | 'estimate'
>>;

export interface TaskUpdateOptions {
  id: string;
  patch: TaskUpdatePatch;
  dryRun?: boolean;
  now?: Date;
  expectedUpdatedAt?: string | null;
  validationScope?: 'repository' | 'task';
}

export interface TaskUpdateResult {
  task: Task;
  before: Task;
  changedFields: TaskUpdateField[];
  dryRun: boolean;
  preview?: string;
}

const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
const REFINEMENT_STATES: RefinementState[] = ['captured', 'needs-refinement', 'ready', 'deferred', 'discarded'];

export async function updateTask(
  rootPath: string,
  repository: Repository,
  options: TaskUpdateOptions
): Promise<TaskUpdateResult> {
  const task = repository.tasks.get(options.id);
  if (!task) {
    throw new Error(`Task not found: ${options.id}`);
  }
  const expectedUpdatedAt = options.expectedUpdatedAt === null ? undefined : options.expectedUpdatedAt;
  if (options.expectedUpdatedAt !== undefined && task.updatedAt !== expectedUpdatedAt) {
    throw new Error(`Update conflict: ${options.id} changed since preview`);
  }

  const before = cloneTask(task);
  const updated = cloneTask(task);
  const changedFields = applyTaskPatch(updated, options.patch);
  if (changedFields.length === 0) {
    return { task: updated, before, changedFields, dryRun: Boolean(options.dryRun) };
  }

  updated.updatedAt = (options.now ?? new Date()).toISOString();
  repository.tasks.set(updated.id, updated);
  let errors: ValidationError[];
  try {
    errors = validateRepositoryState(repository).errors.filter(error =>
      error.severity === 'error'
      && (
        options.validationScope !== 'task'
        || error.id === updated.id
        || error.path === updated.filePath
      )
    );
  } finally {
    repository.tasks.set(before.id, before);
  }

  if (errors.length > 0) {
    throw new Error(`Update failed validation: ${formatValidationErrors(errors)}`);
  }

  if (!options.dryRun) {
    await saveEntity(rootPath, updated);
  }

  return {
    task: updated,
    before,
    changedFields,
    dryRun: Boolean(options.dryRun),
    preview: options.dryRun ? generateEntityContent(updated) : undefined
  };
}

/** Backward-compatible name retained for AI-oriented consumers. */
export const updateTaskPlanning = updateTask;

export function parseTaskUpdatePatch(values: Record<string, unknown>): TaskUpdatePatch {
  const patch: TaskUpdatePatch = {};
  for (const [field, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }

    switch (field) {
      case 'title':
        patch.title = parseRequiredString(value, 'title');
        break;
      case 'status':
        patch.status = parseEnum(value, TASK_STATUSES, 'status');
        break;
      case 'priority':
        patch.priority = parseOptionalEnum(value, TASK_PRIORITIES, 'priority');
        break;
      case 'refinementState':
        patch.refinementState = parseOptionalEnum(value, REFINEMENT_STATES, 'refinementState');
        break;
      case 'assignee':
      case 'dueDate':
      case 'epic':
      case 'milestone':
      case 'estimate':
        patch[field] = parseOptionalString(value);
        break;
      case 'tags':
        patch.tags = parseTags(value);
        break;
      default:
        throw new Error(`Unsupported task update field: ${field}`);
    }
  }
  return patch;
}

function applyTaskPatch(task: Task, patch: TaskUpdatePatch): TaskUpdateField[] {
  const changed: TaskUpdateField[] = [];
  for (const field of Object.keys(patch) as TaskUpdateField[]) {
    const nextValue = patch[field];
    if (JSON.stringify(task[field]) === JSON.stringify(nextValue)) {
      continue;
    }
    (task as Record<TaskUpdateField, unknown>)[field] = nextValue;
    if (nextValue === undefined) {
      delete task.metadata[field];
    } else {
      task.metadata[field] = nextValue;
    }
    changed.push(field);
  }
  return changed;
}

function cloneTask(task: Task): Task {
  return {
    ...task,
    dependsOn: task.dependsOn ? [...task.dependsOn] : undefined,
    tags: task.tags ? [...task.tags] : undefined,
    links: task.links ? { ...task.links } : undefined,
    metadata: { ...task.metadata }
  };
}

function parseEnum<T extends string>(value: unknown, allowed: T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

function parseOptionalEnum<T extends string>(value: unknown, allowed: T[], field: string): T | undefined {
  if (value === '') {
    return undefined;
  }
  return parseEnum(value, allowed, field);
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    throw new Error('Expected a string value');
  }
  return value.trim() || undefined;
}

function parseTags(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    return tags.length ? tags : undefined;
  }
  if (Array.isArray(value) && value.every(tag => typeof tag === 'string')) {
    const tags = value.map(tag => tag.trim()).filter(Boolean);
    return tags.length ? tags : undefined;
  }
  throw new Error('tags must be a comma-separated string or string array');
}

function formatValidationErrors(errors: ValidationError[]): string {
  return errors.slice(0, 3).map(error => error.message).join('; ');
}
