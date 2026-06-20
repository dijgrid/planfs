/**
 * Backlog command workflows.
 */

import {
  createTaskTemplate,
  getNextTaskId,
  listBacklogTasks,
  loadRepository,
  RefinementState,
  reviewBacklog,
  saveEntity,
  TaskPriority
} from 'planfs-core';

export type BacklogAction = 'list' | 'capture' | 'set-state' | 'review';

export interface BacklogOptions {
  title?: string;
  id?: string;
  state?: string;
  assignee?: string;
  epic?: string;
  milestone?: string;
  priority?: string;
  tag?: string | string[];
  query?: string;
  body?: string;
  limit?: number;
  format?: 'text' | 'json';
}

const REFINEMENT_STATES = ['captured', 'needs-refinement', 'ready', 'deferred', 'discarded'];

export async function backlogCommand(
  rootPath: string,
  action: BacklogAction,
  options: BacklogOptions = {}
): Promise<number> {
  try {
    switch (action) {
      case 'list':
        return await listBacklog(rootPath, options);
      case 'capture':
        return await captureBacklogItem(rootPath, options);
      case 'set-state':
        return await setBacklogState(rootPath, options);
      case 'review':
        return await reviewBacklogItems(rootPath, options);
    }
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}

async function listBacklog(rootPath: string, options: BacklogOptions): Promise<number> {
  const repository = await loadRepository(rootPath);
  const tasks = listBacklogTasks(repository, {
    refinementState: normalizeState(options.state),
    assignee: options.assignee,
    epic: options.epic,
    milestone: options.milestone,
    priority: options.priority as TaskPriority | undefined,
    tags: normalizeStringArray(options.tag),
    query: options.query
  });
  const limited = limit(tasks, options.limit);

  if (options.format === 'json') {
    console.log(JSON.stringify(limited, null, 2));
    return 0;
  }

  if (limited.length === 0) {
    console.log('No backlog items found');
    return 0;
  }

  console.log(`\nBACKLOG (${limited.length} items)\n`);
  for (const task of limited) {
    console.log(`${task.id} ${task.title}`);
    console.log(`  ${[
      task.refinementState ?? 'ready',
      task.priority ?? 'no priority',
      task.assignee ? `@${task.assignee}` : 'unassigned',
      task.epic,
      task.milestone,
      task.dueDate ? `due ${task.dueDate}` : undefined
    ].filter(Boolean).join(' | ')}`);
    if (task.body.trim()) {
      console.log(`  ${firstLine(task.body)}`);
    }
    console.log('');
  }

  return 0;
}

async function captureBacklogItem(rootPath: string, options: BacklogOptions): Promise<number> {
  if (!options.title) {
    console.error('Error: --title is required when capturing a backlog item');
    return 1;
  }

  const repository = await loadRepository(rootPath);
  const task = createTaskTemplate(getNextTaskId(repository), options.title);
  task.refinementState = 'captured';
  task.body = options.body ?? '';
  task.priority = options.priority as TaskPriority | undefined;
  task.assignee = options.assignee;
  task.epic = options.epic;
  task.milestone = options.milestone;

  await saveEntity(rootPath, task);
  console.log(`✓ Captured backlog item: ${task.id}`);
  console.log(`  Title: ${task.title}`);
  console.log(`  Refinement: ${task.refinementState}`);
  return 0;
}

async function setBacklogState(rootPath: string, options: BacklogOptions): Promise<number> {
  if (!options.id) {
    console.error('Error: --id is required when setting backlog state');
    return 1;
  }
  const state = normalizeState(options.state);
  if (!state) {
    console.error(`Error: --state must be one of: ${REFINEMENT_STATES.join(', ')}`);
    return 1;
  }

  const repository = await loadRepository(rootPath);
  const task = repository.tasks.get(options.id);
  if (!task) {
    console.error(`Error: task not found: ${options.id}`);
    return 1;
  }

  task.refinementState = state;
  task.updatedAt = new Date().toISOString();
  await saveEntity(rootPath, task);
  console.log(`✓ Updated ${task.id} refinementState to ${state}`);
  return 0;
}

async function reviewBacklogItems(rootPath: string, options: BacklogOptions): Promise<number> {
  const repository = await loadRepository(rootPath);
  const items = limit(reviewBacklog(repository, {
    refinementState: normalizeState(options.state),
    assignee: options.assignee,
    epic: options.epic,
    milestone: options.milestone,
    priority: options.priority as TaskPriority | undefined,
    tags: normalizeStringArray(options.tag),
    query: options.query
  }), options.limit);

  if (options.format === 'json') {
    console.log(JSON.stringify(items, null, 2));
    return 0;
  }

  if (items.length === 0) {
    console.log('No stale or incomplete backlog items found');
    return 0;
  }

  console.log(`\nBACKLOG REVIEW (${items.length} items)\n`);
  for (const item of items) {
    console.log(`${item.task.id} ${item.task.title}`);
    console.log(`  ${item.reasons.join(' | ')}`);
    console.log(`  Recommended: ${item.recommendations.join(', ') || 'review'}`);
    console.log('');
  }

  return 0;
}

function normalizeState(value?: string): RefinementState | undefined {
  return REFINEMENT_STATES.includes(value ?? '')
    ? value as RefinementState
    : undefined;
}

function normalizeStringArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value : [value];
}

function firstLine(value: string): string {
  return value.trim().split(/\r?\n/)[0] ?? '';
}

function limit<T>(items: T[], count?: number): T[] {
  return typeof count === 'number' ? items.slice(0, count) : items;
}
