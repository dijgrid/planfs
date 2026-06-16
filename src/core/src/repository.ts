/**
 * Repository loader
 * Main API for loading and querying a PlanFS repository
 */

import * as path from 'path';
import { stringify as stringifyYaml } from 'yaml';
import {
  discoverFiles,
  readFile,
  writeFile,
  planfsDirectoryExists,
  ensurePlanfsStructure
} from './files';
import { loadEntity, getFilenameFromId, getEntityDirectory } from './loader';
import { validateAll } from './validator';
import {
  Entity,
  Repository,
  Task,
  Epic,
  Milestone,
  Decision,
  ValidationResult
} from './types';

/**
 * Load a PlanFS repository
 */
export async function loadRepository(rootPath: string): Promise<Repository> {
  // Check if .planfs directory exists
  const exists = await planfsDirectoryExists(rootPath);
  if (!exists) {
    throw new Error(
      `No .planfs directory found in ${rootPath}. Initialize with ensurePlanfsStructure() first.`
    );
  }

  const repository: Repository = {
    root: rootPath,
    tasks: new Map(),
    epics: new Map(),
    milestones: new Map(),
    decisions: new Map()
  };

  // Discover and load all files
  const files = await discoverFiles(rootPath);

  for (const file of files) {
    try {
      const content = await readFile(file.path);
      const entity = loadEntity(file, content);

      switch (entity.type) {
        case 'task':
          repository.tasks.set(entity.id, entity as Task);
          break;
        case 'epic':
          repository.epics.set(entity.id, entity as Epic);
          break;
        case 'milestone':
          repository.milestones.set(entity.id, entity as Milestone);
          break;
        case 'decision':
          repository.decisions.set(entity.id, entity as Decision);
          break;
      }
    } catch (error) {
      console.error(
        `Failed to load entity from ${file.path}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return repository;
}

/**
 * Get all entities from a repository
 */
export function getAllEntities(repository: Repository): Entity[] {
  const entities: Entity[] = [];

  entities.push(...Array.from(repository.tasks.values()));
  entities.push(...Array.from(repository.epics.values()));
  entities.push(...Array.from(repository.milestones.values()));
  entities.push(...Array.from(repository.decisions.values()));

  return entities;
}

/**
 * Validate a repository
 */
export function validateRepositoryState(repository: Repository): ValidationResult {
  const entities = getAllEntities(repository);
  return validateAll(entities);
}

/**
 * Save an entity to disk
 */
export async function saveEntity(
  rootPath: string,
  entity: Entity
): Promise<void> {
  const dir = getEntityDirectory(entity.type);
  const filename = getFilenameFromId(entity.id);
  const filePath = path.join(rootPath, '.planfs', dir, filename);

  const content = generateEntityContent(entity);
  await writeFile(filePath, content);
}

/**
 * Generate file content from an entity
 */
export function generateEntityContent(entity: Entity): string {
  const metadata: Record<string, unknown> = {};

  metadata.id = entity.id;
  metadata.title = entity.title || '';
  metadata.status = entity.status || '';

  // Add type-specific metadata
  switch (entity.type) {
    case 'task': {
      const task = entity as Task;
      if (task.priority) metadata.priority = task.priority;
      if (task.assignee) metadata.assignee = task.assignee;
      if (task.epic) metadata.epic = task.epic;
      if (task.milestone) metadata.milestone = task.milestone;
      if (task.dependsOn) metadata.dependsOn = task.dependsOn;
      if (task.tags) metadata.tags = task.tags;
      if (task.dueDate) metadata.dueDate = task.dueDate;
      if (task.estimate) metadata.estimate = task.estimate;
      if (task.links) metadata.links = task.links;
      break;
    }
    case 'epic': {
      const epic = entity as Epic;
      if (epic.owner) metadata.owner = epic.owner;
      if (epic.description) metadata.description = epic.description;
      if (epic.targetDate) metadata.targetDate = epic.targetDate;
      if (epic.tags) metadata.tags = epic.tags;
      if (epic.links) metadata.links = epic.links;
      break;
    }
    case 'milestone': {
      const milestone = entity as Milestone;
      metadata.targetDate = milestone.targetDate;
      if (milestone.description) metadata.description = milestone.description;
      if (milestone.owner) metadata.owner = milestone.owner;
      if (milestone.links) metadata.links = milestone.links;
      break;
    }
    case 'decision': {
      const decision = entity as Decision;
      if (decision.date) metadata.date = decision.date;
      if (decision.context) metadata.context = decision.context;
      if (decision.decision) metadata.decision = decision.decision;
      if (decision.consequences) metadata.consequences = decision.consequences;
      if (decision.author) metadata.author = decision.author;
      if (decision.supersedes) metadata.supersedes = decision.supersedes;
      if (decision.supersededBy) metadata.supersededBy = decision.supersededBy;
      break;
    }
  }

  if (entity.createdAt) metadata.createdAt = entity.createdAt;
  if (entity.updatedAt) metadata.updatedAt = entity.updatedAt;

  return `---\n${stringifyYaml(metadata).trimEnd()}\n---\n\n${entity.body}`;
}

/**
 * Query tasks by status
 */
export function getTasksByStatus(
  repository: Repository,
  status: Task['status']
): Task[] {
  return Array.from(repository.tasks.values()).filter(
    task => task.status === status
  );
}

/**
 * Query tasks by assignee
 */
export function getTasksByAssignee(
  repository: Repository,
  assignee: string
): Task[] {
  return Array.from(repository.tasks.values()).filter(
    task => task.assignee === assignee
  );
}

/**
 * Query tasks by epic
 */
export function getTasksByEpic(
  repository: Repository,
  epicId: string
): Task[] {
  return Array.from(repository.tasks.values()).filter(
    task => task.epic === epicId
  );
}

/**
 * Initialize a new repository
 */
export async function initializeRepository(rootPath: string): Promise<void> {
  await ensurePlanfsStructure(rootPath);
}

/**
 * Get next task ID
 */
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

/**
 * Get an available epic ID from a title
 */
export function getNextEpicId(repository: Repository, title: string): string {
  return getAvailableSlugId('EPIC', title, repository.epics);
}

/**
 * Get an available milestone ID from a title
 */
export function getNextMilestoneId(
  repository: Repository,
  title: string
): string {
  return getAvailableSlugId('MILESTONE', title, repository.milestones);
}

/**
 * Create a new task template
 */
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

/**
 * Create a new epic template
 */
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

/**
 * Create a new milestone template
 */
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
