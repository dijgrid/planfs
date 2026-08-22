/**
 * AI-oriented CLI workflows.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  buildSemanticPlanningContext,
  buildPlanningSummary,
  bulkUpdateTasks,
  loadRepository,
  parseTaskUpdatePatch,
  RefinementState,
  TaskStatus,
  updateTaskPlanning
} from 'planfs-core';
import type {
  PlanningContextReference,
  SemanticPlanningContext
} from 'planfs-core';

export type AiAction = 'summary' | 'context' | 'update-task' | 'bulk-update-tasks' | 'initialize';
export type AiSummarySection = 'open' | 'ready' | 'blocked' | 'review' | 'stale' | 'recent';

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
  expectedUpdatedAt?: string;
  command?: string;
  only?: AiSummarySection;
  compact?: boolean;
  nlp?: boolean;
  language?: string;
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
      case 'context':
        return await context(rootPath, options);
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

async function context(rootPath: string, options: AiOptions): Promise<number> {
  if (!options.id) {
    console.error('Error: --id is required when building semantic planning context');
    return 1;
  }
  const repository = await loadRepository(rootPath);
  const output = await buildSemanticPlanningContext(repository, options.id, {
    analysis: options.nlp === true,
    language: options.language ?? 'en'
  });

  if (options.format === 'text') {
    console.log(renderSemanticPlanningContext(output));
  } else {
    console.log(JSON.stringify(output, null, options.compact ? undefined : 2));
  }
  return 0;
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

  const selected = selectSummaryOutput(output, options.only);
  if (options.format === 'text') {
    console.log(renderSummaryText(output, options.only));
  } else {
    console.log(JSON.stringify(selected, null, options.compact ? undefined : 2));
  }
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
    dryRun: Boolean(options.dryRun),
    expectedUpdatedAt: options.expectedUpdatedAt === 'none' ? null : options.expectedUpdatedAt
  });

  if (options.format === 'json') {
    console.log(JSON.stringify({
      id: result.task.id,
      dryRun: result.dryRun,
      changedFields: result.changedFields,
      task: result.task,
      preview: result.preview,
      expectedUpdatedAt: result.before.updatedAt ?? null
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
    console.log(`  Expected updatedAt: ${result.before.updatedAt ?? '(unset)'}`);
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
  const block = renderAwarenessBlock(normalizeAwarenessCommand(options.command));
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

function normalizeAwarenessCommand(value?: string): string {
  const command = value?.trim() || 'planfs';
  if (/\r|\n/.test(command)) {
    throw new Error('Awareness command must be a single line');
  }
  return command;
}

function renderAwarenessBlock(command: string): string {
  return `${AWARENESS_START}
## AI Planning Awareness

Before answering planning-status questions, recommending next work, or proposing planning updates, start with:

\`\`\`sh
${command} ai summary
\`\`\`

Use the returned IDs and file paths for targeted follow-up reads instead of scanning all of \`.planfs\`.

For one relevant entity, retrieve its shared human/AI semantic context with:

\`\`\`sh
${command} ai context --id TASK-061
\`\`\`

The context includes intent, recognized sections, criteria, readiness, and resolved authoritative relationships. Add \`--nlp\` only when local advisory prose signals are useful.

Use \`${command} ai summary --only ready --compact\` when only one low-overhead planning section is needed.

Preview metadata updates before writing. Use \`update-task\` for one task:

\`\`\`sh
${command} ai update-task --id TASK-061 --status in-progress --dry-run
\`\`\`

When replaying a JSON preview, pass its \`expectedUpdatedAt\` value through \`--expected-updated-at\` so newer human edits are refused. Use \`none\` when the preview token is \`null\`.

Use \`bulk-update-tasks\` when applying the same bounded metadata change to multiple tasks:

\`\`\`sh
${command} ai bulk-update-tasks --ids TASK-061,TASK-062 --status review --dry-run
\`\`\`

Prefer these preview/apply helpers over editing task frontmatter directly for status, priority, assignee, milestone, estimate, due date, tags, or refinement-state updates. After applying AI-assisted planning updates, run:

\`\`\`sh
${command} validate
\`\`\`
${AWARENESS_END}`;
}

function selectSummaryOutput(summary: ReturnType<typeof buildPlanningSummary>, only?: AiSummarySection): unknown {
  if (!only) return summary;
  return {
    generatedAt: summary.generatedAt,
    scope: summary.scope,
    section: only,
    count: summarySectionItems(summary, only).length,
    items: summarySectionItems(summary, only)
  };
}

function summarySectionItems(
  summary: ReturnType<typeof buildPlanningSummary>,
  section: AiSummarySection
): Array<{ id: string; title: string; status?: string; reasons?: string[] }> {
  switch (section) {
    case 'open': return summary.openTasks;
    case 'ready': return summary.readyWork;
    case 'blocked': return summary.blockedWork;
    case 'review': return summary.openTasks.filter(task => task.status === 'review');
    case 'stale': return summary.stalePlanIndicators;
    case 'recent': return summary.recentlyCompletedWork;
  }
}

function renderSummaryText(
  summary: ReturnType<typeof buildPlanningSummary>,
  only?: AiSummarySection
): string {
  const header = [
    `PlanFS planning summary (${summary.generatedAt})`,
    `Tasks: ${summary.counts.tasks} · Open: ${summary.counts.openTasks} · Ready: ${summary.counts.readyTasks} · Blocked: ${summary.counts.blockedTasks} · Stale: ${summary.counts.staleTasks}`
  ];
  const sections = only
    ? [[only, summarySectionItems(summary, only)] as const]
    : ([
      ['ready', summary.readyWork],
      ['blocked', summary.blockedWork],
      ['review', summary.openTasks.filter(task => task.status === 'review')],
      ['stale', summary.stalePlanIndicators]
    ] as const);
  for (const [name, items] of sections) {
    header.push('', `${name[0].toUpperCase()}${name.slice(1)} (${items.length})`);
    header.push(...(items.length === 0
      ? ['- None']
      : items.map(item => `- ${item.id} [${'status' in item ? item.status : name}] ${item.title}${'reasons' in item && item.reasons?.length ? ` — ${item.reasons.join('; ')}` : ''}`)));
  }
  return header.join('\n');
}

export function renderSemanticPlanningContext(context: SemanticPlanningContext): string {
  const lines = [
    `${context.entity.id}: ${context.entity.title} [${context.entity.status}]`,
    `${context.entity.type}${context.entity.archived ? ' · archived' : ''} · ${context.entity.filePath}`,
    '',
    'Intent',
    context.intent.text || '(none)'
  ];

  if (context.readiness) {
    lines.push('', 'Readiness', `${context.readiness.status}: ${context.readiness.reasons.join('; ')}`);
  }

  lines.push('', 'Authoritative relationships');
  lines.push(`- Epic: ${renderContextReference(context.relationships.epic)}`);
  lines.push(`- Milestone: ${renderContextReference(context.relationships.milestone)}`);
  lines.push(`- Depends on: ${context.relationships.dependsOn.length > 0
    ? context.relationships.dependsOn.map(renderContextReference).join(', ')
    : '(none)'}`);
  if (context.relationships.supersedes) {
    lines.push(`- Supersedes: ${renderContextReference(context.relationships.supersedes)}`);
  }
  if (context.relationships.supersededBy) {
    lines.push(`- Superseded by: ${renderContextReference(context.relationships.supersededBy)}`);
  }

  renderContextSections(lines, 'Context', context.sections.context ?? []);
  renderContextSections(lines, 'Outcomes', context.sections.outcomes ?? []);
  renderContextSections(lines, 'Scope', context.sections.scope ?? []);

  lines.push('', `Acceptance criteria (${context.acceptanceCriteria.length})`);
  lines.push(...(context.acceptanceCriteria.length > 0
    ? context.acceptanceCriteria.map(criterion => {
      const marker = criterion.checked === true ? '[x]' : criterion.checked === false ? '[ ]' : '[-]';
      return `- ${marker} ${criterion.text}`;
    })
    : ['- (none)']));

  renderContextSections(lines, 'Decision', context.sections.decision ?? []);
  renderContextSections(lines, 'Consequences', context.sections.consequences ?? []);
  renderContextSections(lines, 'Decisions', context.sections.decisions ?? []);
  renderContextSections(lines, 'Risks', context.sections.risks ?? []);
  renderContextSections(lines, 'Non-goals', context.sections.nonGoals ?? []);
  renderContextSections(lines, 'Open questions', context.sections.questions ?? []);
  renderContextSections(lines, 'Findings', context.sections.findings ?? []);
  if (context.references.length > 0) {
    lines.push('', 'References');
    for (const reference of context.references) {
      lines.push(`- ${reference.label ? `${reference.label}: ` : ''}${reference.target}`);
    }
  }

  lines.push('', `Diagnostics: ${context.diagnostics.length}`);
  lines.push(`Advisory analysis: ${context.advisory.enabled ? 'enabled' : 'disabled'}`);
  return lines.join('\n');
}

function renderContextReference(reference: PlanningContextReference | null): string {
  if (!reference) return '(none)';
  if (!reference.entity) return `${reference.id} (unresolved)`;
  return `${reference.entity.id} — ${reference.entity.title} [${reference.entity.status}]`;
}

function renderContextSections(
  lines: string[],
  title: string,
  sections: SemanticPlanningContext['sections'][string]
): void {
  if (sections.length === 0) return;
  lines.push('', title);
  for (const section of sections) lines.push(section.text || '(empty)');
}
