/**
 * Transaction-like bulk task update workflows.
 */

import { readFile, writeFile } from './files';
import * as repositoryApi from './repository';
import { Repository, Task, TaskPriority, TaskStatus, ValidationError } from './types';

export type BulkTaskUpdateField =
  | 'status'
  | 'priority'
  | 'assignee'
  | 'milestone'
  | 'estimate';

export type BulkTaskUpdatePatch = Partial<Pick<
  Task,
  'status' | 'priority' | 'assignee' | 'milestone' | 'estimate'
>>;

export interface BulkTaskUpdateOptions {
  taskIds: string[];
  patch: BulkTaskUpdatePatch;
  dryRun?: boolean;
  now?: Date;
  expectedUpdatedAt?: Record<string, string | undefined>;
}

export interface BulkTaskUpdateChange {
  id: string;
  before: Task;
  task: Task;
  changedFields: BulkTaskUpdateField[];
  preview: string;
}

export interface BulkTaskUpdateResult {
  dryRun: boolean;
  taskIds: string[];
  changedTasks: BulkTaskUpdateChange[];
  changedFields: BulkTaskUpdateField[];
}

const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

export async function bulkUpdateTasks(
  rootPath: string,
  repository: Repository,
  options: BulkTaskUpdateOptions
): Promise<BulkTaskUpdateResult> {
  const taskIds = normalizeTaskIds(options.taskIds);
  if (taskIds.length === 0) {
    throw new Error('At least one task ID is required');
  }

  const patch = normalizeBulkTaskPatch(options.patch);
  const conflicts = findBulkUpdateConflicts(repository, taskIds, options.expectedUpdatedAt);
  if (conflicts.length > 0) {
    throw new Error(`Bulk update conflict: ${conflicts.join('; ')}`);
  }

  const originals = new Map<string, Task>();
  const changedTasks: BulkTaskUpdateChange[] = [];
  const changedFields = new Set<BulkTaskUpdateField>();
  const updatedAt = (options.now ?? new Date()).toISOString();

  try {
    for (const taskId of taskIds) {
      const task = repository.tasks.get(taskId)!;
      const before = cloneTask(task);
      const updated = cloneTask(task);
      const fields = applyBulkTaskPatch(updated, patch);

      originals.set(taskId, before);
      if (fields.length === 0) {
        continue;
      }

      updated.updatedAt = updatedAt;
      repository.tasks.set(taskId, updated);
      fields.forEach(field => changedFields.add(field));
      changedTasks.push({
        id: taskId,
        before,
        task: updated,
        changedFields: fields,
        preview: repositoryApi.generateEntityContent(updated)
      });
    }

    const validation = repositoryApi.validateRepositoryState(repository);
    const errors = validation.errors.filter(error => error.severity === 'error');
    if (errors.length > 0) {
      throw new Error(`Bulk update failed validation: ${formatValidationErrors(errors)}`);
    }
  } finally {
    for (const [taskId, original] of originals) {
      repository.tasks.set(taskId, original);
    }
  }

  const result: BulkTaskUpdateResult = {
    dryRun: Boolean(options.dryRun),
    taskIds,
    changedTasks,
    changedFields: Array.from(changedFields)
  };

  if (options.dryRun || changedTasks.length === 0) {
    return result;
  }

  const originalContents = new Map<string, string>();
  try {
    for (const change of changedTasks) {
      if (!change.before.filePath) {
        throw new Error(`Task file path is unavailable: ${change.id}`);
      }
      originalContents.set(change.before.filePath, await readFile(change.before.filePath));
    }

    for (const change of changedTasks) {
      await repositoryApi.saveEntity(rootPath, change.task);
    }
  } catch (error) {
    await rollbackTaskFiles(originalContents);
    throw error;
  }

  return result;
}

export function normalizeBulkTaskPatch(patch: BulkTaskUpdatePatch): BulkTaskUpdatePatch {
  const normalized: BulkTaskUpdatePatch = {};
  for (const [field, value] of Object.entries(patch) as Array<[BulkTaskUpdateField, unknown]>) {
    switch (field) {
      case 'status':
        normalized.status = parseEnum(value, TASK_STATUSES, 'status');
        break;
      case 'priority':
        normalized.priority = parseOptionalEnum(value, TASK_PRIORITIES, 'priority');
        break;
      case 'assignee':
      case 'milestone':
      case 'estimate':
        normalized[field] = parseOptionalString(value);
        break;
      default:
        throw new Error(`Unsupported bulk task update field: ${field}`);
    }
  }
  return normalized;
}

function findBulkUpdateConflicts(
  repository: Repository,
  taskIds: string[],
  expectedUpdatedAt?: Record<string, string | undefined>
): string[] {
  const conflicts: string[] = [];

  for (const taskId of taskIds) {
    const task = repository.tasks.get(taskId);
    if (!task) {
      conflicts.push(`Task not found: ${taskId}`);
      continue;
    }
    if (!task.filePath) {
      conflicts.push(`Task file path is unavailable: ${taskId}`);
    }
    if (
      expectedUpdatedAt
      && Object.prototype.hasOwnProperty.call(expectedUpdatedAt, taskId)
      && task.updatedAt !== expectedUpdatedAt[taskId]
    ) {
      conflicts.push(`Task changed since preview: ${taskId}`);
    }
  }

  return conflicts;
}

function applyBulkTaskPatch(task: Task, patch: BulkTaskUpdatePatch): BulkTaskUpdateField[] {
  const changed: BulkTaskUpdateField[] = [];
  for (const field of Object.keys(patch) as BulkTaskUpdateField[]) {
    const nextValue = patch[field];
    if (task[field] === nextValue) {
      continue;
    }
    (task as Record<BulkTaskUpdateField, unknown>)[field] = nextValue;
    changed.push(field);
  }
  return changed;
}

function normalizeTaskIds(taskIds: string[]): string[] {
  return Array.from(new Set(taskIds.map(taskId => taskId.trim()).filter(Boolean)));
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

async function rollbackTaskFiles(originalContents: Map<string, string>): Promise<void> {
  await Promise.all(
    Array.from(originalContents.entries()).map(([filePath, content]) =>
      writeFile(filePath, content)
    )
  );
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

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    throw new Error('Expected a string value');
  }
  return value.trim() || undefined;
}

function formatValidationErrors(errors: ValidationError[]): string {
  return errors.slice(0, 3).map(error => error.message).join('; ');
}
