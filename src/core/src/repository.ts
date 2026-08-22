/**
 * Repository loader
 * Main API for loading and querying a PlanFS repository
 */

import * as path from 'path';
import {
  discoverFiles,
  discoverArchiveFiles,
  deleteFile,
  readFile,
  writeFile,
  planfsDirectoryExists,
  ensurePlanfsStructure,
  PlanfsInitializationResult
} from './files';
import { loadEntity, getFilenameFromId, getEntityDirectory } from './loader';
import { listArchivedReferenceEntities } from './references';
import { validateEntity, validateRepository } from './validator';
import {
  Entity,
  Repository,
  Task,
  Epic,
  Milestone,
  Decision,
  ValidationResult
} from './types';
import { getPlanfsFormat } from './format';
import { generateEntityContent } from './entity-content';

export { generateEntityContent } from './entity-content';
export {
  createDecisionTemplate,
  createEpicTemplate,
  createMilestoneTemplate,
  createTaskTemplate,
  getNextDecisionId,
  getNextEpicId,
  getNextMilestoneId,
  getNextTaskId
} from './entity-factory';

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
  await getPlanfsFormat(rootPath);

  const repository: Repository = {
    root: rootPath,
    tasks: new Map(),
    epics: new Map(),
    milestones: new Map(),
    decisions: new Map(),
    archivedTasks: new Map(),
    archivedEpics: new Map(),
    diagnostics: []
  };

  // Discover and load all files
  const files = await discoverFiles(rootPath);

  for (const file of files) {
    try {
      const content = await readFile(file.path);
      const entity = loadEntity(file, content, { tolerant: true });

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
      const message = `Failed to load entity from ${file.path}: ${error instanceof Error ? error.message : String(error)}`;
      repository.diagnostics?.push({
        path: file.path,
        message: `${message}. Repair by restoring valid YAML frontmatter with id and title fields.`,
        severity: 'error'
      });
      console.error(message);
    }
  }

  const archivedFiles = await discoverArchiveFiles(rootPath);
  for (const file of archivedFiles) {
    try {
      const content = await readFile(file.path);
      const entity = loadEntity(file, content, { tolerant: true });

      if (entity.type === 'task') {
        repository.archivedTasks?.set(entity.id, entity as Task);
      } else if (entity.type === 'epic') {
        repository.archivedEpics?.set(entity.id, entity as Epic);
      }
    } catch (error) {
      const message = `Failed to load archived entity from ${file.path}: ${error instanceof Error ? error.message : String(error)}`;
      repository.diagnostics?.push({
        path: file.path,
        message: `${message}. Repair by restoring valid YAML frontmatter with id and title fields.`,
        severity: 'error'
      });
      console.error(message);
    }
  }

  return repository;
}

/**
 * Get all entities from a repository
 */
export function getAllEntities(
  repository: Repository,
  options: { includeArchived?: boolean } = {}
): Entity[] {
  const entities: Entity[] = [];

  entities.push(...Array.from(repository.tasks.values()));
  entities.push(...Array.from(repository.epics.values()));
  entities.push(...Array.from(repository.milestones.values()));
  entities.push(...Array.from(repository.decisions.values()));
  if (options.includeArchived) {
    entities.push(...Array.from(repository.archivedTasks?.values() ?? []));
    entities.push(...Array.from(repository.archivedEpics?.values() ?? []));
  }

  return entities;
}

/**
 * Validate a repository
 */
export function validateRepositoryState(repository: Repository): ValidationResult {
  const entities = getAllEntities(repository);
  const archivedEntities = listArchivedReferenceEntities(repository);
  const entityErrors = [
    ...entities.flatMap(entity => validateEntity(entity)),
    ...archivedEntities.flatMap(entity => validateEntity(entity))
  ];
  const repositoryErrors = validateRepository(entities, {
    referenceEntities: archivedEntities
  });
  const errors = [...entityErrors, ...repositoryErrors];
  errors.push(...repository.diagnostics ?? []);
  return {
    valid: !errors.some(error => error.severity === 'error'),
    errors
  };
}

/**
 * Save an entity to disk
 */
export async function saveEntity(
  rootPath: string,
  entity: Entity
): Promise<void> {
  assertSafeSaveIdentity(entity);
  const dir = entity.archive && (entity.type === 'task' || entity.type === 'epic')
    ? path.join('archive', getEntityDirectory(entity.type))
    : getEntityDirectory(entity.type);
  const filename = getFilenameFromId(entity.id);
  const filePath = path.join(rootPath, '.planfs', dir, filename);

  const content = generateEntityContent(entity);
  await writeFile(filePath, content);
}

function assertSafeSaveIdentity(entity: Entity): void {
  if (!entity.id || typeof entity.id !== 'string') {
    throw new Error('Refusing to save entity with missing id. Repair the id field before saving.');
  }

  if (!entity.filePath) {
    return;
  }

  const existingId = path.basename(entity.filePath, '.md');
  if (existingId && existingId !== entity.id) {
    throw new Error(
      `Refusing to save ${entity.id}: entity id does not match existing file name ${existingId}. Repair the id field or rename the file before saving.`
    );
  }
}

export interface ArchiveEntityOptions {
  includeChildren?: boolean;
  now?: Date;
  disposition?: NonNullable<Entity['archive']>['disposition'];
  note?: string;
}

export interface ArchiveEntityResult {
  archived: Entity[];
}

export function isArchivedEntity(entity: Entity): boolean {
  return Boolean(entity.archive);
}

export function listArchivedEntities(repository: Repository): Entity[] {
  return [
    ...Array.from(repository.archivedTasks?.values() ?? []),
    ...Array.from(repository.archivedEpics?.values() ?? [])
  ];
}

export async function archiveEntity(
  rootPath: string,
  entityId: string,
  options: ArchiveEntityOptions = {}
): Promise<ArchiveEntityResult> {
  const repository = await loadRepository(rootPath);
  const entity = repository.tasks.get(entityId) ?? repository.epics.get(entityId);
  if (!entity) {
    throw new Error(`Active task or epic not found: ${entityId}`);
  }
  if (entity.status !== 'done' && !options.disposition) {
    throw new Error(`Archiving unfinished ${entity.type} ${entity.id} requires an explicit disposition`);
  }

  const toArchive: Entity[] = [entity];
  if (entity.type === 'epic' && options.includeChildren) {
    toArchive.push(
      ...Array.from(repository.tasks.values()).filter(task => task.epic === entity.id)
    );
  }

  const archived: Entity[] = [];
  const archivedAt = (options.now ?? new Date()).toISOString();
  for (const current of toArchive) {
    const originalPath = path.relative(rootPath, current.filePath);
    const archive = { archivedAt, originalPath, ...(options.disposition ? { disposition: options.disposition } : {}), ...(options.note ? { note: options.note } : {}) };
    const archivedEntity = {
      ...current,
      archive,
      updatedAt: archivedAt,
      metadata: {
        ...current.metadata,
        archive,
        updatedAt: archivedAt
      }
    } as Entity;
    await saveEntity(rootPath, archivedEntity);
    await deleteFile(current.filePath);
    archived.push(archivedEntity);
  }

  return { archived };
}

export interface RestoreArchivedEntityOptions {
  now?: Date;
  recalculateBacklogOrder?: boolean;
}

export async function restoreArchivedEntity(
  rootPath: string,
  entityId: string,
  options: RestoreArchivedEntityOptions = {}
): Promise<Entity> {
  const repository = await loadRepository(rootPath);
  const entity = repository.archivedTasks?.get(entityId) ?? repository.archivedEpics?.get(entityId);
  if (!entity) {
    throw new Error(`Archived task or epic not found: ${entityId}`);
  }

  const restoredAt = (options.now ?? new Date()).toISOString();
  const restored = removeArchiveMetadata({
    ...entity,
    updatedAt: restoredAt,
    metadata: {
      ...entity.metadata,
      updatedAt: restoredAt
    }
  } as Entity);

  if (restored.type === 'task' && options.recalculateBacklogOrder !== false) {
    restored.backlogOrder = nextBacklogOrder(repository, restored);
  }

  await saveEntity(rootPath, restored);
  await deleteFile(entity.filePath);
  return restored;
}

export async function deleteArchivedEntity(
  rootPath: string,
  entityId: string
): Promise<Entity> {
  const repository = await loadRepository(rootPath);
  const entity = repository.archivedTasks?.get(entityId) ?? repository.archivedEpics?.get(entityId);
  if (!entity) {
    throw new Error(`Archived task or epic not found: ${entityId}`);
  }
  await deleteFile(entity.filePath);
  return entity;
}

function removeArchiveMetadata<T extends Entity>(entity: T): T {
  const copy = { ...entity, metadata: { ...entity.metadata } } as T & { archive?: unknown };
  delete copy.archive;
  delete (copy.metadata as Record<string, unknown>).archive;
  return copy;
}

function nextBacklogOrder(repository: Repository, task: Task): number {
  const scope = task.epic ?? 'global';
  const orders = Array.from(repository.tasks.values())
    .filter(candidate => (candidate.epic ?? 'global') === scope)
    .map(candidate => candidate.backlogOrder)
    .filter((value): value is number => typeof value === 'number');
  return orders.length > 0 ? Math.max(...orders) + 10 : 10;
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
export async function initializeRepository(
  rootPath: string
): Promise<PlanfsInitializationResult> {
  return ensurePlanfsStructure(rootPath);
}
