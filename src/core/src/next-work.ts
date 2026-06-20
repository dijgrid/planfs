/**
 * Next-work readiness and ranking helpers.
 */

import { buildTaskGraph } from './graph';
import { Repository, Task, TaskPriority, TaskStatus } from './types';

export type TaskReadiness =
  | 'ready'
  | 'blocked'
  | 'missing-dependency'
  | 'in-progress'
  | 'needs-review'
  | 'done';

export interface TaskReadinessResult {
  status: TaskReadiness;
  blockingTaskIds: string[];
  missingDependencyIds: string[];
}

export interface NextWorkOptions {
  assignee?: string;
  epic?: string;
  milestone?: string;
  tags?: string[];
  status?: TaskStatus | TaskStatus[];
  includeBlocked?: boolean;
  now?: Date;
  limit?: number;
}

export interface NextWorkCandidate {
  task: Task;
  readiness: TaskReadinessResult;
  reasons: string[];
  downstreamCount: number;
  critical: boolean;
}

const OPEN_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review'];
const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

export function getTaskReadiness(
  task: Task,
  repository: Repository
): TaskReadinessResult {
  const dependencyIds = task.dependsOn ?? [];
  const missingDependencyIds = dependencyIds.filter(
    dependencyId => !repository.tasks.has(dependencyId)
  );
  const blockingTaskIds = dependencyIds.filter(dependencyId => {
    const dependency = repository.tasks.get(dependencyId);
    return dependency && dependency.status !== 'done';
  });

  if (task.status === 'done') {
    return { status: 'done', blockingTaskIds: [], missingDependencyIds };
  }

  if (missingDependencyIds.length > 0) {
    return { status: 'missing-dependency', blockingTaskIds, missingDependencyIds };
  }

  if (blockingTaskIds.length > 0) {
    return { status: 'blocked', blockingTaskIds, missingDependencyIds };
  }

  if (task.status === 'review') {
    return { status: 'needs-review', blockingTaskIds, missingDependencyIds };
  }

  if (task.status === 'in-progress') {
    return { status: 'in-progress', blockingTaskIds, missingDependencyIds };
  }

  return { status: 'ready', blockingTaskIds, missingDependencyIds };
}

export function getNextWorkCandidates(
  repository: Repository,
  options: NextWorkOptions = {}
): NextWorkCandidate[] {
  const graph = buildTaskGraph(repository.tasks.values());
  const statuses = toStatusSet(options.status ?? OPEN_STATUSES);
  const now = options.now ?? new Date();

  const candidates = Array.from(repository.tasks.values())
    .filter(task => statuses.has(task.status))
    .filter(task => matchesScope(task, options))
    .map(task => {
      const readiness = getTaskReadiness(task, repository);
      const graphNode = graph.nodes.get(task.id);
      return {
        task,
        readiness,
        reasons: explainNextWork(task, repository, { readiness, now }),
        downstreamCount: graphNode?.dependents.filter(id => {
          const dependent = repository.tasks.get(id);
          return dependent?.status !== 'done';
        }).length ?? 0,
        critical: graphNode?.critical ?? false
      };
    })
    .filter(candidate =>
      options.includeBlocked
        ? candidate.readiness.status !== 'done'
        : isActionable(candidate.readiness.status)
    )
    .sort((a, b) => compareCandidates(a, b, repository, options, now));

  return typeof options.limit === 'number'
    ? candidates.slice(0, options.limit)
    : candidates;
}

export function explainNextWork(
  task: Task,
  repository: Repository,
  context: { readiness?: TaskReadinessResult; now?: Date } = {}
): string[] {
  const readiness = context.readiness ?? getTaskReadiness(task, repository);
  const now = context.now ?? new Date();
  const graph = buildTaskGraph(repository.tasks.values());
  const node = graph.nodes.get(task.id);
  const reasons = [readinessReason(readiness)];

  if (task.priority) {
    reasons.push(`${capitalize(task.priority)} task priority`);
  }

  const epic = task.epic ? repository.epics.get(task.epic) : undefined;
  if (epic?.priority) {
    reasons.push(`${capitalize(epic.priority)} epic priority`);
  }

  const dueReason = dateReason('Due', task.dueDate, now);
  if (dueReason) {
    reasons.push(dueReason);
  }

  const targetDate = epic?.targetDate
    ?? (task.milestone ? repository.milestones.get(task.milestone)?.targetDate : undefined);
  const targetReason = dateReason('Target', targetDate, now);
  if (targetReason) {
    reasons.push(targetReason);
  }

  if (node?.critical) {
    reasons.push('On critical path');
  }

  const downstreamCount = node?.dependents.filter(id => {
    const dependent = repository.tasks.get(id);
    return dependent?.status !== 'done';
  }).length ?? 0;
  if (downstreamCount > 0) {
    reasons.push(`Unblocks ${downstreamCount} downstream ${downstreamCount === 1 ? 'task' : 'tasks'}`);
  }

  return reasons;
}

function compareCandidates(
  a: NextWorkCandidate,
  b: NextWorkCandidate,
  repository: Repository,
  options: NextWorkOptions,
  now: Date
): number {
  return compareReadiness(a.readiness.status, b.readiness.status)
    || compareAssignee(a.task, b.task, options.assignee)
    || comparePriority(a.task.priority, b.task.priority)
    || compareEpicPriority(a.task, b.task, repository)
    || compareDates(a.task.dueDate, b.task.dueDate, now)
    || compareBooleans(a.critical, b.critical)
    || b.downstreamCount - a.downstreamCount
    || compareTargetDates(a.task, b.task, repository, now)
    || compareDates(a.task.createdAt, b.task.createdAt, now)
    || a.task.id.localeCompare(b.task.id);
}

function compareReadiness(a: TaskReadiness, b: TaskReadiness): number {
  const rank: Record<TaskReadiness, number> = {
    ready: 0,
    'in-progress': 1,
    'needs-review': 2,
    blocked: 3,
    'missing-dependency': 4,
    done: 5
  };
  return rank[a] - rank[b];
}

function compareAssignee(a: Task, b: Task, assignee?: string): number {
  if (!assignee) {
    return 0;
  }
  return Number(b.assignee === assignee) - Number(a.assignee === assignee);
}

function comparePriority(a?: TaskPriority, b?: TaskPriority): number {
  return priorityValue(a) - priorityValue(b);
}

function compareEpicPriority(a: Task, b: Task, repository: Repository): number {
  return priorityValue(a.epic ? repository.epics.get(a.epic)?.priority : undefined)
    - priorityValue(b.epic ? repository.epics.get(b.epic)?.priority : undefined);
}

function compareBooleans(a: boolean, b: boolean): number {
  return Number(b) - Number(a);
}

function compareTargetDates(
  a: Task,
  b: Task,
  repository: Repository,
  now: Date
): number {
  return compareDates(targetDateForTask(a, repository), targetDateForTask(b, repository), now);
}

function compareDates(a: string | undefined, b: string | undefined, now: Date): number {
  const aTime = dateRank(a, now);
  const bTime = dateRank(b, now);
  return aTime - bTime;
}

function dateRank(value: string | undefined, now: Date): number {
  const time = parseDate(value);
  if (time === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  return time - startOfDay(now).getTime();
}

function priorityValue(priority: TaskPriority | undefined): number {
  return priority ? PRIORITY_RANK[priority] : 99;
}

function targetDateForTask(task: Task, repository: Repository): string | undefined {
  const epicTargetDate = task.epic
    ? repository.epics.get(task.epic)?.targetDate
    : undefined;
  return epicTargetDate
    ?? (task.milestone ? repository.milestones.get(task.milestone)?.targetDate : undefined);
}

function matchesScope(task: Task, options: NextWorkOptions): boolean {
  if (options.assignee && task.assignee !== options.assignee) {
    return false;
  }
  if (options.epic && task.epic !== options.epic) {
    return false;
  }
  if (options.milestone && task.milestone !== options.milestone) {
    return false;
  }
  if (options.tags?.length) {
    const tags = new Set(task.tags ?? []);
    if (!options.tags.every(tag => tags.has(tag))) {
      return false;
    }
  }
  return true;
}

function isActionable(status: TaskReadiness): boolean {
  return status === 'ready' || status === 'in-progress' || status === 'needs-review';
}

function toStatusSet(status: TaskStatus | TaskStatus[]): Set<TaskStatus> {
  return new Set(Array.isArray(status) ? status : [status]);
}

function readinessReason(readiness: TaskReadinessResult): string {
  switch (readiness.status) {
    case 'ready':
      return 'Ready: dependencies complete';
    case 'in-progress':
      return 'Already in progress';
    case 'needs-review':
      return 'Needs review';
    case 'blocked':
      return `Blocked by ${readiness.blockingTaskIds.join(', ')}`;
    case 'missing-dependency':
      return `Missing dependency ${readiness.missingDependencyIds.join(', ')}`;
    case 'done':
      return 'Done';
  }
}

function dateReason(label: string, value: string | undefined, now: Date): string | undefined {
  const time = parseDate(value);
  if (time === undefined) {
    return undefined;
  }

  const days = Math.floor((time - startOfDay(now).getTime()) / 86_400_000);
  if (days < 0) {
    return `${label} overdue`;
  }
  if (days === 0) {
    return `${label} today`;
  }
  return `${label} in ${days} ${days === 1 ? 'day' : 'days'}`;
}

function parseDate(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3])
    ).getTime();
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
