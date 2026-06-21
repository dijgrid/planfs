/**
 * AI-oriented CLI workflows.
 */

import {
  buildPlanningSummary,
  loadRepository,
  parseTaskUpdatePatch,
  RefinementState,
  TaskStatus,
  updateTaskPlanning
} from 'planfs-core';

export type AiAction = 'summary' | 'update-task';

export interface AiOptions {
  id?: string;
  status?: string | string[];
  priority?: string;
  assignee?: string;
  epic?: string;
  milestone?: string;
  refinementState?: string | string[];
  dueDate?: string;
  tags?: string | string[];
  limit?: number;
  dryRun?: boolean;
  format?: 'json' | 'text';
}

export async function aiCommand(
  rootPath: string,
  action: AiAction,
  options: AiOptions = {}
): Promise<number> {
  try {
    switch (action) {
      case 'summary':
        return await summary(rootPath, options);
      case 'update-task':
        return await updateTask(rootPath, options);
    }
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}

async function summary(rootPath: string, options: AiOptions): Promise<number> {
  const repository = await loadRepository(rootPath);
  const output = buildPlanningSummary(repository, {
    assignee: options.assignee,
    epic: options.epic,
    milestone: options.milestone,
    status: normalizeStatus(options.status),
    refinementState: normalizeRefinementState(options.refinementState),
    limit: options.limit
  });

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

async function updateTask(rootPath: string, options: AiOptions): Promise<number> {
  if (!options.id) {
    console.error('Error: --id is required when updating a task');
    return 1;
  }

  const repository = await loadRepository(rootPath);
  const patch = parseTaskUpdatePatch({
    status: firstValue(options.status),
    priority: options.priority,
    assignee: options.assignee,
    epic: options.epic,
    milestone: options.milestone,
    refinementState: firstValue(options.refinementState),
    dueDate: options.dueDate,
    tags: normalizeTags(options.tags)
  });
  const result = await updateTaskPlanning(rootPath, repository, {
    id: options.id,
    patch,
    dryRun: Boolean(options.dryRun)
  });

  if (options.format === 'json') {
    console.log(JSON.stringify({
      id: result.task.id,
      dryRun: result.dryRun,
      changedFields: result.changedFields,
      task: result.task,
      preview: result.preview
    }, null, 2));
    return 0;
  }

  if (result.changedFields.length === 0) {
    console.log(`No changes for ${result.task.id}`);
    return 0;
  }

  console.log(`${result.dryRun ? 'Previewed' : 'Updated'} ${result.task.id}`);
  console.log(`  Changed: ${result.changedFields.join(', ')}`);
  if (result.preview) {
    console.log('\n--- preview ---');
    console.log(result.preview.trimEnd());
  }
  return 0;
}

function normalizeStatus(value: string | string[] | undefined): TaskStatus | TaskStatus[] | undefined {
  const values = normalizeStringArray(value) as TaskStatus[] | undefined;
  if (!values) {
    return undefined;
  }
  return values.length === 1 ? values[0] : values;
}

function normalizeRefinementState(
  value: string | string[] | undefined
): RefinementState | RefinementState[] | undefined {
  const values = normalizeStringArray(value) as RefinementState[] | undefined;
  if (!values) {
    return undefined;
  }
  return values.length === 1 ? values[0] : values;
}

function normalizeTags(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value.join(',') : value;
}

function normalizeStringArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value : [value];
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
