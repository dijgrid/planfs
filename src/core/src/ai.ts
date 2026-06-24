/**
 * AI-oriented planning helpers.
 */

import { isStaleBacklogTask } from './backlog';
import { getNextWorkCandidates, getTaskReadiness } from './next-work';
import { generateEntityContent, saveEntity, validateRepositoryState } from './repository';
import {
  RefinementState,
  Repository,
  Task,
  TaskPriority,
  TaskStatus,
  ValidationError
} from './types';

export interface PlanningSummaryOptions {
  assignee?: string;
  epic?: string;
  milestone?: string;
  status?: TaskStatus | TaskStatus[];
  refinementState?: RefinementState | RefinementState[];
  limit?: number;
  recentLimit?: number;
  now?: Date;
}

export interface PlanningSummaryTask {
  id: string;
  title: string;
  status: TaskStatus;
  filePath: string;
  priority?: TaskPriority;
  assignee?: string;
  epic?: string;
  milestone?: string;
  dueDate?: string;
  refinementState?: RefinementState;
}

export interface PlanningSummaryReadinessTask extends PlanningSummaryTask {
  readiness: string;
  blockingTaskIds: string[];
  missingDependencyIds: string[];
  reasons: string[];
}

export interface PlanningSummary {
  generatedAt: string;
  scope: {
    assignee?: string;
    epic?: string;
    milestone?: string;
    status?: TaskStatus[];
    refinementState?: RefinementState[];
  };
  counts: {
    tasks: number;
    openTasks: number;
    activeEpics: number;
    activeMilestones: number;
    blockedTasks: number;
    readyTasks: number;
    staleTasks: number;
    recentlyCompletedTasks: number;
  };
  openTasks: PlanningSummaryTask[];
  activeEpics: Array<{ id: string; title: string; status: string; filePath: string; priority?: string; targetDate?: string }>;
  activeMilestones: Array<{ id: string; title: string; status: string; filePath: string; targetDate: string }>;
  blockedWork: PlanningSummaryReadinessTask[];
  readyWork: PlanningSummaryReadinessTask[];
  stalePlanIndicators: Array<{ id: string; title: string; filePath: string; updatedAt?: string; reasons: string[] }>;
  recentlyCompletedWork: PlanningSummaryTask[];
}

export type TaskUpdateField =
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
  'status' | 'priority' | 'assignee' | 'refinementState' | 'dueDate' | 'epic' | 'milestone' | 'tags' | 'estimate'
>>;

export interface TaskUpdateOptions {
  id: string;
  patch: TaskUpdatePatch;
  dryRun?: boolean;
  now?: Date;
}

export interface TaskUpdateResult {
  task: Task;
  before: Task;
  changedFields: TaskUpdateField[];
  dryRun: boolean;
  preview?: string;
}

const DEFAULT_SUMMARY_LIMIT = 25;
const DEFAULT_RECENT_LIMIT = 10;
const OPEN_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review'];
const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
const REFINEMENT_STATES: RefinementState[] = ['captured', 'needs-refinement', 'ready', 'deferred', 'discarded'];

export function buildPlanningSummary(
  repository: Repository,
  options: PlanningSummaryOptions = {}
): PlanningSummary {
  const now = options.now ?? new Date();
  const scopedTasks = Array.from(repository.tasks.values())
    .filter(task => matchesSummaryScope(task, options));
  const openTasks = scopedTasks.filter(task => OPEN_STATUSES.includes(task.status));
  const nextWork = getNextWorkCandidates(repository, {
    assignee: options.assignee,
    epic: options.epic,
    milestone: options.milestone,
    status: options.status,
    includeBlocked: true,
    limit: options.limit
  }).filter(candidate => matchesSummaryScope(candidate.task, options));
  const readyWork = nextWork.filter(candidate =>
    ['ready', 'in-progress', 'needs-review'].includes(candidate.readiness.status)
  );
  const blockedWork = nextWork.filter(candidate =>
    ['blocked', 'missing-dependency'].includes(candidate.readiness.status)
  );
  const stalePlanIndicators = openTasks
    .filter(task => isStaleBacklogTask(task, { now }))
    .map(task => ({
      id: task.id,
      title: task.title,
      filePath: task.filePath,
      updatedAt: task.updatedAt,
      reasons: [task.updatedAt ? 'Task has not been updated recently' : 'Task has no updatedAt timestamp']
    }));
  const recentlyCompletedWork = scopedTasks
    .filter(task => task.status === 'done')
    .sort((a, b) => compareUpdatedAtDesc(a, b))
    .slice(0, options.recentLimit ?? DEFAULT_RECENT_LIMIT)
    .map(toSummaryTask);

  return {
    generatedAt: now.toISOString(),
    scope: {
      assignee: options.assignee,
      epic: options.epic,
      milestone: options.milestone,
      status: normalizeArray(options.status),
      refinementState: normalizeArray(options.refinementState)
    },
    counts: {
      tasks: scopedTasks.length,
      openTasks: openTasks.length,
      activeEpics: Array.from(repository.epics.values()).filter(epic => epic.status === 'active').length,
      activeMilestones: Array.from(repository.milestones.values()).filter(milestone => milestone.status === 'active').length,
      blockedTasks: blockedWork.length,
      readyTasks: readyWork.length,
      staleTasks: stalePlanIndicators.length,
      recentlyCompletedTasks: recentlyCompletedWork.length
    },
    openTasks: openTasks.slice(0, options.limit ?? DEFAULT_SUMMARY_LIMIT).map(toSummaryTask),
    activeEpics: Array.from(repository.epics.values())
      .filter(epic => epic.status === 'active')
      .map(epic => ({
        id: epic.id,
        title: epic.title,
        status: epic.status,
        filePath: epic.filePath,
        priority: epic.priority,
        targetDate: epic.targetDate
      })),
    activeMilestones: Array.from(repository.milestones.values())
      .filter(milestone => milestone.status === 'active')
      .map(milestone => ({
        id: milestone.id,
        title: milestone.title,
        status: milestone.status,
        filePath: milestone.filePath,
        targetDate: milestone.targetDate
      })),
    blockedWork: blockedWork.map(candidate => toReadinessTask(candidate.task, repository, candidate.reasons)),
    readyWork: readyWork.map(candidate => toReadinessTask(candidate.task, repository, candidate.reasons)),
    stalePlanIndicators: stalePlanIndicators.slice(0, options.limit ?? DEFAULT_SUMMARY_LIMIT),
    recentlyCompletedWork
  };
}

export async function updateTaskPlanning(
  rootPath: string,
  repository: Repository,
  options: TaskUpdateOptions
): Promise<TaskUpdateResult> {
  const task = repository.tasks.get(options.id);
  if (!task) {
    throw new Error(`Task not found: ${options.id}`);
  }

  const before = cloneTask(task);
  const updated = cloneTask(task);
  const changedFields = applyTaskPatch(updated, options.patch);
  if (changedFields.length === 0) {
    return { task: updated, before, changedFields, dryRun: Boolean(options.dryRun) };
  }

  updated.updatedAt = (options.now ?? new Date()).toISOString();
  repository.tasks.set(updated.id, updated);
  const validation = validateRepositoryState(repository);
  const errors = validation.errors.filter(error => error.severity === 'error');
  repository.tasks.set(before.id, before);

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

export function parseTaskUpdatePatch(values: Record<string, unknown>): TaskUpdatePatch {
  const patch: TaskUpdatePatch = {};
  for (const [field, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }

    switch (field) {
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

function matchesSummaryScope(task: Task, options: PlanningSummaryOptions): boolean {
  if (options.assignee && task.assignee !== options.assignee) {
    return false;
  }
  if (options.epic && task.epic !== options.epic) {
    return false;
  }
  if (options.milestone && task.milestone !== options.milestone) {
    return false;
  }
  if (options.status && !normalizeArray(options.status).includes(task.status)) {
    return false;
  }
  if (options.refinementState && !normalizeArray(options.refinementState).includes(task.refinementState ?? 'ready')) {
    return false;
  }
  return true;
}

function toReadinessTask(task: Task, repository: Repository, reasons: string[]): PlanningSummaryReadinessTask {
  const readiness = getTaskReadiness(task, repository);
  return {
    ...toSummaryTask(task),
    readiness: readiness.status,
    blockingTaskIds: readiness.blockingTaskIds,
    missingDependencyIds: readiness.missingDependencyIds,
    reasons
  };
}

function toSummaryTask(task: Task): PlanningSummaryTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    filePath: task.filePath,
    priority: task.priority,
    assignee: task.assignee,
    epic: task.epic,
    milestone: task.milestone,
    dueDate: task.dueDate,
    refinementState: task.refinementState
  };
}

function applyTaskPatch(task: Task, patch: TaskUpdatePatch): TaskUpdateField[] {
  const changed: TaskUpdateField[] = [];
  for (const field of Object.keys(patch) as TaskUpdateField[]) {
    const nextValue = patch[field];
    if (JSON.stringify(task[field]) === JSON.stringify(nextValue)) {
      continue;
    }
    (task as Record<TaskUpdateField, unknown>)[field] = nextValue;
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

function compareUpdatedAtDesc(a: Task, b: Task): number {
  return dateValue(b.updatedAt) - dateValue(a.updatedAt) || b.id.localeCompare(a.id);
}

function dateValue(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
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

function parseTags(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    return tags.length ? tags : undefined;
  }
  if (Array.isArray(value) && value.every(tag => typeof tag === 'string')) {
    return value.map(tag => tag.trim()).filter(Boolean);
  }
  throw new Error('tags must be a comma-separated string or string array');
}

function formatValidationErrors(errors: ValidationError[]): string {
  return errors.slice(0, 3).map(error => error.message).join('; ');
}
