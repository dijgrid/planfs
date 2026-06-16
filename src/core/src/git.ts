/**
 * Git-aware planning helpers
 */

import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { loadEntity, getIdFromFilename } from './loader';
import { loadRepository } from './repository';
import { DiscoveredFile } from './files';
import { EntityType, Task } from './types';

const execFileAsync = promisify(execFile);

export type BranchFileStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'unmerged'
  | 'unknown';

export interface BranchPlanningOptions {
  baseRef?: string;
}

export interface BranchChangedFile {
  path: string;
  previousPath?: string;
  status: BranchFileStatus;
  entityType?: EntityType;
  entityId?: string;
}

export interface BranchTaskChange {
  id: string;
  title: string;
  status: Task['status'];
  filePath: string;
  previous?: {
    title: string;
    status: Task['status'];
  };
}

export interface BranchConflict {
  path: string;
  status: string;
  suggestion: string;
}

export interface BranchPullRequestPreview {
  title: string;
  summary: string;
  relatedTaskIds: string[];
}

export interface BranchPlanningContext {
  currentBranch: string;
  baseRef: string;
  comparisonRef: string;
  taskIdsInBranchName: string[];
  relatedTaskIds: string[];
  changedFiles: BranchChangedFile[];
  addedTasks: BranchTaskChange[];
  modifiedTasks: BranchTaskChange[];
  deletedTaskIds: string[];
  conflicts: BranchConflict[];
  pullRequestPreview: BranchPullRequestPreview;
}

export interface CommitMessageSuggestion {
  message: string;
  taskIds: string[];
  source: 'related-task' | 'branch-name';
}

export interface CommitMessageValidationResult {
  valid: boolean;
  taskIds: string[];
  missingTaskIds: string[];
  warnings: string[];
}

export async function getBranchPlanningContext(
  rootPath: string,
  options: BranchPlanningOptions = {}
): Promise<BranchPlanningContext> {
  const repository = await loadRepository(rootPath);
  const currentBranch = await getCurrentBranch(rootPath);
  const comparisonRef = options.baseRef ?? await getDefaultComparisonRef(rootPath);
  const baseRef = displayBaseRef(comparisonRef);
  const diffOutput = await git(rootPath, [
    'diff',
    '--name-status',
    `${comparisonRef}...HEAD`,
    '--',
    '.planfs'
  ]);
  const statusOutput = await git(rootPath, ['status', '--porcelain', '--', '.planfs']);
  const changedFiles = mergeChangedFiles([
    ...parseChangedFiles(diffOutput),
    ...parsePorcelainChangedFiles(statusOutput)
  ]);
  const conflicts = parseConflicts(statusOutput);

  const addedTasks: BranchTaskChange[] = [];
  const modifiedTasks: BranchTaskChange[] = [];
  const deletedTaskIds: string[] = [];

  for (const file of changedFiles) {
    if (file.entityType !== 'task' || !file.entityId) {
      continue;
    }

    if (file.status === 'deleted') {
      deletedTaskIds.push(file.entityId);
      continue;
    }

    const task = repository.tasks.get(file.entityId);
    if (!task) {
      continue;
    }

    const change: BranchTaskChange = {
      id: task.id,
      title: task.title,
      status: task.status,
      filePath: file.path
    };

    if (file.status === 'modified' || file.status === 'renamed') {
      const previous = await loadBaseTask(rootPath, comparisonRef, file.previousPath ?? file.path);
      if (previous) {
        change.previous = {
          title: previous.title,
          status: previous.status
        };
      }
      modifiedTasks.push(change);
    } else if (file.status === 'added' || file.status === 'copied') {
      addedTasks.push(change);
    }
  }

  const taskIdsInBranchName = extractTaskIds(currentBranch);
  const relatedTaskIds = unique([
    ...taskIdsInBranchName,
    ...addedTasks.map(task => task.id),
    ...modifiedTasks.map(task => task.id),
    ...deletedTaskIds
  ]);

  return {
    currentBranch,
    baseRef,
    comparisonRef,
    taskIdsInBranchName,
    relatedTaskIds,
    changedFiles,
    addedTasks,
    modifiedTasks,
    deletedTaskIds,
    conflicts,
    pullRequestPreview: {
      title: createPreviewTitle(currentBranch, relatedTaskIds),
      summary: createPreviewSummary(addedTasks, modifiedTasks, deletedTaskIds, conflicts),
      relatedTaskIds
    }
  };
}

export function extractTaskIds(value: string): string[] {
  return unique(value.match(/TASK-\d+/gi)?.map(match => match.toUpperCase()) ?? []);
}

export async function suggestCommitMessage(
  rootPath: string,
  options: BranchPlanningOptions = {}
): Promise<CommitMessageSuggestion> {
  const repository = await loadRepository(rootPath);
  const context = await getBranchPlanningContext(rootPath, options);
  const primaryTaskId = context.relatedTaskIds[0];

  if (primaryTaskId) {
    const task = repository.tasks.get(primaryTaskId);
    return {
      message: `${primaryTaskId}: ${task?.title ?? branchToTitle(context.currentBranch)}`,
      taskIds: context.relatedTaskIds,
      source: 'related-task'
    };
  }

  return {
    message: branchToTitle(context.currentBranch),
    taskIds: [],
    source: 'branch-name'
  };
}

export async function validateCommitMessage(
  rootPath: string,
  message: string
): Promise<CommitMessageValidationResult> {
  const repository = await loadRepository(rootPath);
  const taskIds = extractTaskIds(message);
  const missingTaskIds = taskIds.filter(id => !repository.tasks.has(id));
  const warnings = taskIds.length === 0
    ? ['Commit message does not reference a PlanFS task ID.']
    : [];

  return {
    valid: missingTaskIds.length === 0,
    taskIds,
    missingTaskIds,
    warnings
  };
}

function parseChangedFiles(output: string): BranchChangedFile[] {
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('\t');
      const code = parts[0] ?? '';
      const status = parseStatusCode(code);
      const previousPath = status === 'renamed' || status === 'copied'
        ? parts[1]
        : undefined;
      const filePath = previousPath ? parts[2] : parts[1];
      const entity = filePath ? entityFromPath(filePath) : {};

      return {
        path: filePath ?? '',
        previousPath,
        status,
        ...entity
      };
    })
    .filter(file => file.path.endsWith('.md'));
}

function parsePorcelainChangedFiles(output: string): BranchChangedFile[] {
  return output
    .split('\n')
    .filter(Boolean)
    .filter(line => !isUnmergedStatus(line.slice(0, 2)))
    .map(line => {
      const code = line.slice(0, 2);
      const status = parseStatusCode(code.trim());
      const filePath = line.slice(3).trim();
      const entity = entityFromPath(filePath);

      return {
        path: filePath,
        status,
        ...entity
      };
    })
    .filter(file => file.path.startsWith('.planfs/') && file.path.endsWith('.md'));
}

function mergeChangedFiles(files: BranchChangedFile[]): BranchChangedFile[] {
  const byPath = new Map<string, BranchChangedFile>();

  for (const file of files) {
    const existing = byPath.get(file.path);
    if (!existing || existing.status === 'modified') {
      byPath.set(file.path, file);
    }
  }

  return Array.from(byPath.values());
}

function parseConflicts(output: string): BranchConflict[] {
  return output
    .split('\n')
    .filter(line => isUnmergedStatus(line.slice(0, 2)))
    .map(line => {
      const status = line.slice(0, 2);
      const filePath = line.slice(3).trim();
      return {
        path: filePath,
        status,
        suggestion: conflictSuggestion(status)
      };
    })
    .filter(conflict => conflict.path.startsWith('.planfs/'));
}

function parseStatusCode(code: string): BranchFileStatus {
  if (code === '??') return 'added';
  if (code.startsWith('A')) return 'added';
  if (code.startsWith('M')) return 'modified';
  if (code.startsWith('D')) return 'deleted';
  if (code.startsWith('R')) return 'renamed';
  if (code.startsWith('C')) return 'copied';
  if (isUnmergedStatus(code)) return 'unmerged';
  return 'unknown';
}

function isUnmergedStatus(status: string): boolean {
  return ['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(status);
}

function conflictSuggestion(status: string): string {
  switch (status) {
    case 'AA':
      return 'Both branches added this PlanFS file. Keep one task ID, merge useful body text, and remove duplicate metadata.';
    case 'UU':
      return 'Both branches edited this PlanFS file. Preserve YAML frontmatter, merge Markdown body changes, then run validation.';
    case 'DU':
    case 'UD':
      return 'One branch deleted this PlanFS file while the other edited it. Decide whether the task should remain, then validate references.';
    default:
      return 'Resolve the PlanFS file conflict, keep valid YAML frontmatter, and run planfs validate before merging.';
  }
}

async function loadBaseTask(
  rootPath: string,
  comparisonRef: string,
  filePath: string
): Promise<Task | undefined> {
  try {
    const content = await git(rootPath, ['show', `${comparisonRef}:${filePath}`]);
    const entity = loadEntity(discoveredFile(rootPath, filePath), content);
    return entity.type === 'task' ? entity as Task : undefined;
  } catch {
    return undefined;
  }
}

function entityFromPath(filePath: string): Pick<BranchChangedFile, 'entityType' | 'entityId'> {
  const parts = filePath.split('/');
  const directory = parts[parts.length - 2];
  const filename = parts[parts.length - 1];

  if (!filename) {
    return {};
  }

  const typeByDirectory: Record<string, EntityType> = {
    tasks: 'task',
    epics: 'epic',
    milestones: 'milestone',
    decisions: 'decision'
  };
  const entityType = directory ? typeByDirectory[directory] : undefined;

  return {
    entityType,
    entityId: entityType ? getIdFromFilename(filename) : undefined
  };
}

function discoveredFile(rootPath: string, filePath: string): DiscoveredFile {
  const entity = entityFromPath(filePath);
  if (!entity.entityType) {
    throw new Error(`Unsupported PlanFS path: ${filePath}`);
  }

  return {
    path: path.join(rootPath, filePath),
    name: path.basename(filePath),
    type: entity.entityType
  };
}

async function getCurrentBranch(rootPath: string): Promise<string> {
  const branch = await git(rootPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return branch.trim();
}

async function getDefaultComparisonRef(rootPath: string): Promise<string> {
  try {
    const originHead = await git(rootPath, [
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      '--short'
    ]);
    return originHead.trim();
  } catch {
    return 'main';
  }
}

function displayBaseRef(ref: string): string {
  return ref.replace(/^origin\//, '');
}

function createPreviewTitle(branch: string, relatedTaskIds: string[]): string {
  const taskPrefix = relatedTaskIds.length > 0 ? `${relatedTaskIds.join(', ')}: ` : '';
  return `${taskPrefix}${branch}`;
}

function createPreviewSummary(
  addedTasks: BranchTaskChange[],
  modifiedTasks: BranchTaskChange[],
  deletedTaskIds: string[],
  conflicts: BranchConflict[]
): string {
  const parts = [
    `${addedTasks.length} added task${addedTasks.length === 1 ? '' : 's'}`,
    `${modifiedTasks.length} modified task${modifiedTasks.length === 1 ? '' : 's'}`,
    `${deletedTaskIds.length} deleted task${deletedTaskIds.length === 1 ? '' : 's'}`
  ];

  if (conflicts.length > 0) {
    parts.push(`${conflicts.length} PlanFS conflict${conflicts.length === 1 ? '' : 's'}`);
  }

  return parts.join(', ');
}

function branchToTitle(branch: string): string {
  return branch
    .replace(/^refs\/heads\//, '')
    .replace(/^(feature|fix|bugfix|hotfix|chore|docs|task)\//, '')
    .replace(/TASK-\d+/gi, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ') || branch;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

async function git(rootPath: string, args: string[]): Promise<string> {
  const result = await execFileAsync('git', args, {
    cwd: rootPath,
    maxBuffer: 1024 * 1024
  });
  return result.stdout.replace(/\s+$/, '');
}
