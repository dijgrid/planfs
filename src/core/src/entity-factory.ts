/**
 * Construct new PlanFS entities and allocate their IDs.
 */

import { Decision, Entity, Epic, Milestone, Repository, Task } from './types';

export function getNextTaskId(repository: Repository): string {
  let maxNum = 0;
  for (const id of repository.tasks.keys()) {
    if (id.startsWith('TASK-')) {
      const num = parseInt(id.substring(5), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `TASK-${String(maxNum + 1).padStart(3, '0')}`;
}

export function getNextEpicId(repository: Repository, title: string): string {
  return getAvailableSlugId('EPIC', title, repository.epics);
}

export function getNextMilestoneId(repository: Repository, title: string): string {
  return getAvailableSlugId('MILESTONE', title, repository.milestones);
}

export function getNextDecisionId(repository: Repository, title: string): string {
  return getAvailableSlugId('DECISION', title, repository.decisions);
}

export function createTaskTemplate(id: string, title: string): Task {
  const now = new Date().toISOString();
  return {
    id,
    type: 'task',
    title,
    status: 'todo',
    filePath: '',
    metadata: {},
    body: '',
    createdAt: now,
    updatedAt: now
  };
}

export function createEpicTemplate(id: string, title: string): Epic {
  const now = new Date().toISOString();
  return {
    id,
    type: 'epic',
    title,
    status: 'active',
    filePath: '',
    metadata: {},
    body: '',
    createdAt: now,
    updatedAt: now
  };
}

export function createMilestoneTemplate(
  id: string,
  title: string,
  targetDate: string
): Milestone {
  const now = new Date().toISOString();
  return {
    id,
    type: 'milestone',
    title,
    status: 'active',
    targetDate,
    filePath: '',
    metadata: {},
    body: '',
    createdAt: now,
    updatedAt: now
  };
}

export function createDecisionTemplate(id: string, title: string): Decision {
  const now = new Date().toISOString();
  return {
    id,
    type: 'decision',
    title,
    status: 'proposed',
    filePath: '',
    metadata: {},
    body: '',
    createdAt: now,
    updatedAt: now
  };
}

function getAvailableSlugId<T extends Entity>(
  prefix: string,
  title: string,
  existing: Map<string, T>
): string {
  const base = `${prefix}-${slugify(title)}`;
  let candidate = base;
  let suffix = 2;

  while (existing.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}
