/**
 * Backlog filtering, ordering, and hygiene helpers.
 */

import { getTaskReadiness } from './next-work';
import { RefinementState, Repository, Task, TaskPriority } from './types';

export interface BacklogOptions {
  refinementState?: RefinementState | RefinementState[];
  assignee?: string;
  epic?: string;
  milestone?: string;
  priority?: TaskPriority;
  tags?: string[];
  query?: string;
  requireEpic?: boolean;
  requireMilestone?: boolean;
  includeDone?: boolean;
  now?: Date;
  staleAfterDays?: number;
}

export interface BacklogReadiness {
  ready: boolean;
  missing: string[];
  blockingTaskIds: string[];
  missingDependencyIds: string[];
}

export interface BacklogReviewItem {
  task: Task;
  stale: boolean;
  incomplete: boolean;
  reasons: string[];
  recommendations: string[];
}

const DEFAULT_STALE_AFTER_DAYS = 60;
const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

export function getTaskRefinementState(task: Task): RefinementState {
  return task.refinementState ?? 'ready';
}

export function listBacklogTasks(
  repository: Repository,
  options: BacklogOptions = {}
): Task[] {
  return Array.from(repository.tasks.values())
    .filter(task => options.includeDone || task.status !== 'done')
    .filter(task => matchesBacklogFilters(task, options))
    .sort((a, b) => compareBacklogTasks(a, b, repository, options.now ?? new Date()));
}

export function getBacklogReadiness(
  task: Task,
  repository: Repository,
  options: Pick<BacklogOptions, 'requireEpic' | 'requireMilestone'> = {}
): BacklogReadiness {
  const missing: string[] = [];
  if (!task.body.trim()) {
    missing.push('body');
  }
  if (!task.priority) {
    missing.push('priority');
  }
  if (options.requireEpic && !task.epic) {
    missing.push('epic');
  }
  if (options.requireMilestone && !task.milestone) {
    missing.push('milestone');
  }

  const readiness = getTaskReadiness(task, repository);
  return {
    ready: missing.length === 0
      && readiness.blockingTaskIds.length === 0
      && readiness.missingDependencyIds.length === 0,
    missing,
    blockingTaskIds: readiness.blockingTaskIds,
    missingDependencyIds: readiness.missingDependencyIds
  };
}

export function reviewBacklog(
  repository: Repository,
  options: BacklogOptions = {}
): BacklogReviewItem[] {
  const now = options.now ?? new Date();
  return listBacklogTasks(repository, { ...options, now })
    .map(task => {
      const readiness = getBacklogReadiness(task, repository, options);
      const stale = isStaleBacklogTask(task, {
        now,
        staleAfterDays: options.staleAfterDays
      });
      const reasons = [
        ...readiness.missing.map(field => `Missing ${field}`),
        ...readiness.blockingTaskIds.map(id => `Blocked by ${id}`),
        ...readiness.missingDependencyIds.map(id => `Missing dependency ${id}`)
      ];

      if (stale) {
        reasons.push(`No updates in ${options.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS} days`);
      }

      return {
        task,
        stale,
        incomplete: !readiness.ready,
        reasons,
        recommendations: reviewRecommendations(task, readiness, stale)
      };
    })
    .filter(item => item.stale || item.incomplete);
}

export function isStaleBacklogTask(
  task: Task,
  options: { now?: Date; staleAfterDays?: number } = {}
): boolean {
  const state = getTaskRefinementState(task);
  if (task.status === 'done' || state === 'discarded') {
    return false;
  }

  const updatedAt = task.updatedAt ? Date.parse(task.updatedAt) : undefined;
  if (!updatedAt || Number.isNaN(updatedAt)) {
    return true;
  }

  const staleAfterDays = options.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
  const now = options.now ?? new Date();
  return now.getTime() - updatedAt >= staleAfterDays * 86_400_000;
}

function matchesBacklogFilters(task: Task, options: BacklogOptions): boolean {
  if (options.refinementState) {
    const states = Array.isArray(options.refinementState)
      ? options.refinementState
      : [options.refinementState];
    if (!states.includes(getTaskRefinementState(task))) {
      return false;
    }
  }
  if (options.assignee && task.assignee !== options.assignee) {
    return false;
  }
  if (options.epic && task.epic !== options.epic) {
    return false;
  }
  if (options.milestone && task.milestone !== options.milestone) {
    return false;
  }
  if (options.priority && task.priority !== options.priority) {
    return false;
  }
  if (options.tags?.length) {
    const tags = new Set(task.tags ?? []);
    if (!options.tags.every(tag => tags.has(tag))) {
      return false;
    }
  }
  if (options.query && !searchableText(task).includes(options.query.trim().toLowerCase())) {
    return false;
  }
  return true;
}

function compareBacklogTasks(a: Task, b: Task, repository: Repository, now: Date): number {
  return compareScopedOrder(a, b)
    || comparePriority(a.priority, b.priority)
    || compareDates(a.dueDate, b.dueDate, now)
    || compareDates(targetDateForTask(a, repository), targetDateForTask(b, repository), now)
    || a.id.localeCompare(b.id);
}

function compareScopedOrder(a: Task, b: Task): number {
  const aScope = a.epic ?? 'global';
  const bScope = b.epic ?? 'global';
  if (aScope === bScope) {
    return orderValue(a) - orderValue(b);
  }
  return aScope.localeCompare(bScope);
}

function comparePriority(a?: TaskPriority, b?: TaskPriority): number {
  return priorityValue(a) - priorityValue(b);
}

function priorityValue(priority: TaskPriority | undefined): number {
  return priority ? PRIORITY_RANK[priority] : 99;
}

function orderValue(task: Task): number {
  return typeof task.backlogOrder === 'number'
    ? task.backlogOrder
    : Number.POSITIVE_INFINITY;
}

function compareDates(a: string | undefined, b: string | undefined, now: Date): number {
  return dateRank(a, now) - dateRank(b, now);
}

function dateRank(value: string | undefined, now: Date): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time - now.getTime();
}

function targetDateForTask(task: Task, repository: Repository): string | undefined {
  return task.epic
    ? repository.epics.get(task.epic)?.targetDate
    : task.milestone
      ? repository.milestones.get(task.milestone)?.targetDate
      : undefined;
}

function reviewRecommendations(
  task: Task,
  readiness: BacklogReadiness,
  stale: boolean
): string[] {
  const recommendations: string[] = [];
  if (readiness.missing.includes('body')) {
    recommendations.push('refine');
  }
  if (readiness.missing.includes('priority')) {
    recommendations.push('prioritize');
  }
  if (readiness.missing.includes('epic')) {
    recommendations.push('link to an epic');
  }
  if (readiness.missing.includes('milestone')) {
    recommendations.push('link to a milestone');
  }
  if (readiness.blockingTaskIds.length || readiness.missingDependencyIds.length) {
    recommendations.push('review dependencies');
  }
  if (stale && getTaskRefinementState(task) === 'deferred') {
    recommendations.push('discard or reactivate');
  } else if (stale) {
    recommendations.push('refine, defer, or discard');
  }
  return Array.from(new Set(recommendations));
}

function searchableText(task: Task): string {
  return [
    task.id,
    task.title,
    task.status,
    task.priority,
    task.assignee,
    task.epic,
    task.milestone,
    getTaskRefinementState(task),
    task.tags?.join(' '),
    task.body
  ].filter(Boolean).join(' ').toLowerCase();
}
