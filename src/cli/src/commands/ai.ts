/**
 * AI-oriented CLI workflows.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  buildPlanningSummary,
  bulkUpdateTasks,
  loadRepository,
  parseTaskUpdatePatch,
  RefinementState,
  TaskStatus,
  updateTaskPlanning
} from 'planfs-core';

export type AiAction = 'summary' | 'update-task' | 'bulk-update-tasks' | 'initialize';

export interface AiOptions {
  id?: string;
  ids?: string | string[];
  status?: string | string[];
  priority?: string;
  assignee?: string;
  epic?: string;
  milestone?: string;
  estimate?: string;
  refinementState?: string | string[];
  dueDate?: string;
  tags?: string | string[];
  limit?: number;
  dryRun?: boolean;
  file?: string;
  format?: 'json' | 'text';
}

interface AwarenessResult {
  filePath: string;
  created: boolean;
  updated: boolean;
  dryRun: boolean;
  content?: string;
}

const AWARENESS_START = '<!-- PLANFS-AI-AWARENESS:START -->';
const AWARENESS_END = '<!-- PLANFS-AI-AWARENESS:END -->';
const DEFAULT_AWARENESS_FILE = 'AGENTS.md';

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
      case 'bulk-update-tasks':
        return await bulkUpdateTaskSet(rootPath, options);
      case 'initialize':
        return await initializeAwareness(rootPath, options);
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
    estimate: options.estimate,
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

async function bulkUpdateTaskSet(rootPath: string, options: AiOptions): Promise<number> {
  const taskIds = normalizeTaskIds(options.ids);
  if (taskIds.length === 0) {
    console.error('Error: --ids is required when bulk updating tasks');
    return 1;
  }

  const repository = await loadRepository(rootPath);
  const patch = parseTaskUpdatePatch({
    status: firstValue(options.status),
    priority: options.priority,
    assignee: options.assignee,
    milestone: options.milestone,
    estimate: options.estimate
  });
  const result = await bulkUpdateTasks(rootPath, repository, {
    taskIds,
    patch,
    dryRun: Boolean(options.dryRun)
  });

  if (options.format === 'json') {
    console.log(JSON.stringify({
      dryRun: result.dryRun,
      taskIds: result.taskIds,
      changedFields: result.changedFields,
      changedTasks: result.changedTasks.map(change => ({
        id: change.id,
        changedFields: change.changedFields,
        task: change.task,
        preview: change.preview
      }))
    }, null, 2));
    return 0;
  }

  if (result.changedTasks.length === 0) {
    console.log(`No changes for ${result.taskIds.length} task${result.taskIds.length === 1 ? '' : 's'}`);
    return 0;
  }

  console.log(`${result.dryRun ? 'Previewed' : 'Updated'} ${result.changedTasks.length} task${result.changedTasks.length === 1 ? '' : 's'}`);
  console.log(`  Changed: ${result.changedFields.join(', ')}`);
  if (result.dryRun) {
    for (const change of result.changedTasks) {
      console.log(`\n--- preview ${change.id} ---`);
      console.log(change.preview.trimEnd());
    }
  }
  return 0;
}

async function initializeAwareness(rootPath: string, options: AiOptions): Promise<number> {
  const filePath = path.resolve(rootPath, options.file ?? DEFAULT_AWARENESS_FILE);
  const existing = await readOptionalFile(filePath);
  const block = renderAwarenessBlock();
  const nextContent = upsertAwarenessBlock(existing, block);
  const result: AwarenessResult = {
    filePath,
    created: existing === undefined,
    updated: existing !== nextContent,
    dryRun: Boolean(options.dryRun),
    content: options.dryRun ? nextContent : undefined
  };

  if (!options.dryRun && result.updated) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, nextContent, 'utf-8');
  }

  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  if (result.updated) {
    console.log(`${options.dryRun ? 'Previewed' : result.created ? 'Created' : 'Updated'} ${path.relative(rootPath, filePath)}`);
  } else {
    console.log(`${path.relative(rootPath, filePath)} already includes PlanFS AI planning awareness`);
  }

  if (result.content) {
    console.log('\n--- preview ---');
    console.log(result.content.trimEnd());
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

function normalizeTaskIds(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap(item => item.split(','))
    .map(item => item.trim())
    .filter(Boolean);
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

async function readOptionalFile(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function upsertAwarenessBlock(existing: string | undefined, block: string): string {
  const content = existing?.trimEnd();
  if (!content) {
    return `${block}\n`;
  }

  const start = content.indexOf(AWARENESS_START);
  const end = content.indexOf(AWARENESS_END);
  if (start >= 0 && end > start) {
    return `${content.slice(0, start).trimEnd()}\n\n${block}\n${content.slice(end + AWARENESS_END.length).trimStart()}`.trimEnd() + '\n';
  }

  return `${content}\n\n${block}\n`;
}

function renderAwarenessBlock(): string {
  return `${AWARENESS_START}
## AI Planning Awareness

Before answering planning-status questions, recommending next work, or proposing planning updates, start with:

\`\`\`sh
node src/cli/dist/cli.js ai summary
\`\`\`

Use the returned IDs and file paths for targeted follow-up reads instead of scanning all of \`.planfs\`.

Preview metadata updates before writing:

\`\`\`sh
node src/cli/dist/cli.js ai update-task --id TASK-061 --status in-progress --dry-run
\`\`\`

After applying AI-assisted planning updates, run:

\`\`\`sh
node src/cli/dist/cli.js validate
\`\`\`
${AWARENESS_END}`;
}
