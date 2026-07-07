/**
 * Validation module
 * Validates entities against schemas
 */

import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import {
  taskSchema,
  epicSchema,
  milestoneSchema,
  decisionSchema
} from 'planfs-schema';
import {
  Entity,
  Task,
  Epic,
  Milestone,
  Decision,
  ValidationError,
  ValidationResult
} from './types';
import { isArchivedReference } from './references';

const ajv = new Ajv({ strict: false, validateFormats: false });
const schemaValidators: Record<Entity['type'], ValidateFunction> = {
  task: ajv.compile(taskSchema),
  epic: ajv.compile(epicSchema),
  milestone: ajv.compile(milestoneSchema),
  decision: ajv.compile(decisionSchema)
};
const ALLOWED_METADATA_FIELDS: Record<Entity['type'], Set<string>> = {
  task: new Set([
    'id',
    'title',
    'status',
    'priority',
    'assignee',
    'epic',
    'milestone',
    'dependsOn',
    'tags',
    'dueDate',
    'estimate',
    'refinementState',
    'backlogOrder',
    'links',
    'archive',
    'createdAt',
    'updatedAt'
  ]),
  epic: new Set([
    'id',
    'title',
    'status',
    'priority',
    'owner',
    'description',
    'targetDate',
    'tags',
    'links',
    'archive',
    'createdAt',
    'updatedAt'
  ]),
  milestone: new Set([
    'id',
    'title',
    'status',
    'targetDate',
    'description',
    'owner',
    'links',
    'createdAt',
    'updatedAt'
  ]),
  decision: new Set([
    'id',
    'title',
    'status',
    'date',
    'context',
    'decision',
    'consequences',
    'author',
    'supersedes',
    'supersededBy',
    'createdAt',
    'updatedAt'
  ])
};
const STALE_UPDATED_AT_DAYS = 180;

/**
 * Validate a single entity
 */
export function validateEntity(entity: Entity): ValidationError[] {
  const errors: ValidationError[] = [...entity.diagnostics ?? []];
  const validateSchema = schemaValidators[entity.type];

  if (validateSchema && !validateSchema(entity)) {
    errors.push(...formatSchemaErrors(entity, validateSchema.errors ?? []));
  }
  errors.push(...validateSupportedMetadata(entity));

  // Check required fields
  if (!entity.id) {
    errors.push({
      path: entity.filePath,
      message: `Missing required field 'id' in ${entity.filePath || 'entity'}. Repair by adding an id that matches the file name to YAML frontmatter.`,
      severity: 'error'
    });
  }

  if (!entity.title) {
    errors.push({
      id: entity.id,
      path: entity.filePath,
      message: `Missing required field 'title' in ${entity.filePath || entity.id}. Repair by adding title: <short summary> to YAML frontmatter.`,
      severity: 'error'
    });
  }

  errors.push(...validateTimestamps(entity));
  errors.push(...validateArchiveMetadata(entity));

  // Type-specific validation
  switch (entity.type) {
    case 'task':
      errors.push(...validateTask(entity as Task));
      break;
    case 'epic':
      errors.push(...validateEpic(entity as Epic));
      break;
    case 'milestone':
      errors.push(...validateMilestone(entity as Milestone));
      break;
    case 'decision':
      errors.push(...validateDecision(entity as Decision));
      break;
  }

  return errors;
}

function validateArchiveMetadata(entity: Entity): ValidationError[] {
  if (!entity.archive && entity.metadata.archive === undefined) {
    return [];
  }

  const archive = entity.archive ?? entity.metadata.archive;
  if (typeof archive !== 'object' || archive === null) {
    return [{
      id: entity.id,
      path: entity.filePath,
      message: 'Archive metadata must be an object',
      severity: 'error'
    }];
  }

  const record = archive as { archivedAt?: unknown; originalPath?: unknown };
  const errors: ValidationError[] = [];
  if (typeof record.archivedAt !== 'string' || parseDate(record.archivedAt) === undefined) {
    errors.push({
      id: entity.id,
      path: entity.filePath,
      message: 'Archive metadata archivedAt must be an ISO 8601 timestamp',
      severity: 'error'
    });
  }
  if (typeof record.originalPath !== 'string' || !record.originalPath.trim()) {
    errors.push({
      id: entity.id,
      path: entity.filePath,
      message: 'Archive metadata originalPath is required',
      severity: 'error'
    });
  }

  return errors;
}

function formatSchemaErrors(
  entity: Entity,
  schemaErrors: ErrorObject[]
): ValidationError[] {
  return schemaErrors.map(error => {
    const field = error.instancePath
      ? error.instancePath.replace(/^\//, '').replace(/\//g, '.')
      : error.params && 'missingProperty' in error.params
        ? String(error.params.missingProperty)
        : 'entity';

    return {
      id: entity.id,
      path: entity.filePath,
      message: `Schema validation failed for ${field}: ${error.message ?? 'invalid value'}`,
      severity: 'error'
    };
  });
}

function validateSupportedMetadata(entity: Entity): ValidationError[] {
  const allowed = ALLOWED_METADATA_FIELDS[entity.type];
  return Object.keys(entity.metadata ?? {})
    .filter(field => !allowed.has(field))
    .map(field => ({
      id: entity.id,
      path: entity.filePath,
      message: `Unsupported ${entity.type} metadata field: ${field}`,
      severity: 'warning'
    }));
}

function validateTimestamps(entity: Entity): ValidationError[] {
  const errors: ValidationError[] = [];
  const createdAt = parseDate(entity.createdAt);
  const updatedAt = parseDate(entity.updatedAt);

  if (entity.createdAt && createdAt === undefined) {
    errors.push({
      id: entity.id,
      message: `Invalid createdAt format: ${entity.createdAt}. Must be ISO 8601`,
      severity: 'warning'
    });
  }

  if (entity.updatedAt && updatedAt === undefined) {
    errors.push({
      id: entity.id,
      message: `Invalid updatedAt format: ${entity.updatedAt}. Must be ISO 8601`,
      severity: 'warning'
    });
  }

  if (createdAt !== undefined && updatedAt !== undefined && updatedAt < createdAt) {
    errors.push({
      id: entity.id,
      message: `Stale updatedAt: ${entity.updatedAt} is earlier than createdAt ${entity.createdAt}`,
      severity: 'warning'
    });
  }

  if (
    entity.type === 'task'
    && (entity as Task).status !== 'done'
    && entity.updatedAt
    && isStaleDate(updatedAt, STALE_UPDATED_AT_DAYS)
  ) {
    errors.push({
      id: entity.id,
      message: `Stale updatedAt: open task has not been updated in ${STALE_UPDATED_AT_DAYS} days`,
      severity: 'warning'
    });
  }

  return errors;
}

function validateTask(task: Task): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate task status
  const validStatuses = ['todo', 'in-progress', 'review', 'done'];
  if (task.status && !validStatuses.includes(task.status)) {
    errors.push({
      id: task.id,
      message: `Invalid task status: ${task.status}. Must be one of: ${validStatuses.join(', ')}`,
      severity: 'error'
    });
  }

  // Validate priority
  if (task.priority) {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(task.priority)) {
      errors.push({
        id: task.id,
        message: `Invalid task priority: ${task.priority}. Must be one of: ${validPriorities.join(', ')}`,
        severity: 'error'
      });
    }
  }

  if (task.refinementState) {
    const validRefinementStates = ['captured', 'needs-refinement', 'ready', 'deferred', 'discarded'];
    if (!validRefinementStates.includes(task.refinementState)) {
      errors.push({
        id: task.id,
        message: `Invalid refinementState: ${task.refinementState}. Must be one of: ${validRefinementStates.join(', ')}`,
        severity: 'error'
      });
    }
  }

  if (task.backlogOrder !== undefined && typeof task.backlogOrder !== 'number') {
    errors.push({
      id: task.id,
      message: 'Task backlogOrder must be a number',
      severity: 'error'
    });
  }

  // Validate dependencies format
  if (task.dependsOn) {
    if (!Array.isArray(task.dependsOn)) {
      errors.push({
        id: task.id,
        message: 'Task dependsOn must be an array',
        severity: 'error'
      });
    }
  }

  // Validate tags format
  if (task.tags) {
    if (!Array.isArray(task.tags)) {
      errors.push({
        id: task.id,
        message: 'Task tags must be an array',
        severity: 'error'
      });
    }
  }

  // Validate date format
  if (task.dueDate && !isValidISODate(task.dueDate)) {
    errors.push({
      id: task.id,
      message: `Invalid dueDate format: ${task.dueDate}. Must be ISO 8601`,
      severity: 'warning'
    });
  }

  return errors;
}

function validateEpic(epic: Epic): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate epic status
  const validStatuses = ['active', 'completed', 'on-hold', 'archived'];
  if (epic.status && !validStatuses.includes(epic.status)) {
    errors.push({
      id: epic.id,
      message: `Invalid epic status: ${epic.status}. Must be one of: ${validStatuses.join(', ')}`,
      severity: 'error'
    });
  }

  // Validate priority
  if (epic.priority) {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(epic.priority)) {
      errors.push({
        id: epic.id,
        message: `Invalid epic priority: ${epic.priority}. Must be one of: ${validPriorities.join(', ')}`,
        severity: 'error'
      });
    }
  }

  return errors;
}

function validateMilestone(milestone: Milestone): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate milestone status
  const validStatuses = ['active', 'completed', 'delayed'];
  if (milestone.status && !validStatuses.includes(milestone.status)) {
    errors.push({
      id: milestone.id,
      message: `Invalid milestone status: ${milestone.status}. Must be one of: ${validStatuses.join(', ')}`,
      severity: 'error'
    });
  }

  // Validate target date
  if (!milestone.targetDate) {
    errors.push({
      id: milestone.id,
      message: 'Milestone targetDate is required',
      severity: 'error'
    });
  } else if (!isValidISODate(milestone.targetDate)) {
    errors.push({
      id: milestone.id,
      message: `Invalid targetDate format: ${milestone.targetDate}. Must be ISO 8601`,
      severity: 'error'
    });
  }

  return errors;
}

function validateDecision(decision: Decision): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate decision status
  const validStatuses = ['proposed', 'accepted', 'rejected', 'superseded'];
  if (decision.status && !validStatuses.includes(decision.status)) {
    errors.push({
      id: decision.id,
      message: `Invalid decision status: ${decision.status}. Must be one of: ${validStatuses.join(', ')}`,
      severity: 'error'
    });
  }

  return errors;
}

export interface ValidateRepositoryOptions {
  referenceEntities?: Entity[];
}

/**
 * Validate a collection of entities for global constraints.
 *
 * referenceEntities can satisfy references without participating in duplicate
 * ID or circular dependency checks for the active collection.
 */
export function validateRepository(
  entities: Entity[],
  options: ValidateRepositoryOptions = {}
): ValidationError[] {
  const errors: ValidationError[] = [];
  const idMap = new Map<string, Entity>(
    (options.referenceEntities ?? []).map(entity => [entity.id, entity])
  );

  // Check for duplicate IDs
  const seenIds = new Set<string>();
  for (const entity of entities) {
    if (seenIds.has(entity.id)) {
      errors.push({
        id: entity.id,
        path: entity.filePath,
        message: `Duplicate entity ID: ${entity.id}`,
        severity: 'error'
      });
    }
    seenIds.add(entity.id);
    idMap.set(entity.id, entity);
  }

  // Check references
  for (const entity of entities) {
    const refErrors = checkEntityReferences(entity, idMap);
    errors.push(...refErrors);
  }

  // Check for circular dependencies
  const circularDeps = findCircularDependencies(entities);
  for (const [id, chain] of circularDeps) {
    errors.push({
      id,
      message: `Circular dependency detected: ${chain.join(' -> ')} -> ${id}`,
      severity: 'error'
    });
  }

  return errors;
}

function checkEntityReferences(
  entity: Entity,
  idMap: Map<string, Entity>
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (entity.type === 'task') {
    const task = entity as Task;

    // Check epic reference
    if (task.epic && !idMap.has(task.epic)) {
      errors.push({
        id: task.id,
        message: `Referenced epic not found: ${task.epic}`,
        severity: 'error'
      });
    } else if (task.epic) {
      const epic = idMap.get(task.epic) as Epic;
      if (isArchivedReference(epic)) {
        errors.push({
          id: task.id,
          message: `Task references archived epic: ${task.epic}`,
          severity: 'warning'
        });
      } else if (epic.status === 'completed' || epic.status === 'archived') {
        errors.push({
          id: task.id,
          message: `Task references ${epic.status} epic: ${task.epic}`,
          severity: 'warning'
        });
      }
    }

    // Check milestone reference
    if (task.milestone && !idMap.has(task.milestone)) {
      errors.push({
        id: task.id,
        message: `Referenced milestone not found: ${task.milestone}`,
        severity: 'error'
      });
    } else if (task.milestone) {
      const milestone = idMap.get(task.milestone) as Milestone;
      if (milestone.status === 'completed' || milestone.status === 'delayed') {
        errors.push({
          id: task.id,
          message: `Task references ${milestone.status} milestone: ${task.milestone}`,
          severity: 'warning'
        });
      }
    }

    // Check dependencies
    if (task.dependsOn) {
      for (const dep of task.dependsOn) {
        const dependency = idMap.get(dep) as Task | undefined;
        if (!dependency) {
          errors.push({
            id: task.id,
            message: `Referenced task not found: ${dep}`,
            severity: 'error'
          });
        } else if (isArchivedReference(dependency)) {
          errors.push({
            id: task.id,
            message: `Task depends on archived task: ${dep}`,
            severity: 'warning'
          });
        }
      }
    }
  }

  return errors;
}

function findCircularDependencies(entities: Entity[]): Map<string, string[]> {
  const circularDeps = new Map<string, string[]>();
  const taskMap = new Map<string, Task>();

  // Build task map
  for (const entity of entities) {
    if (entity.type === 'task') {
      taskMap.set(entity.id, entity as Task);
    }
  }

  // DFS to find cycles
  for (const taskId of taskMap.keys()) {
    const cycle = findCycle(taskId, taskMap, new Set(), []);
    if (cycle) {
      circularDeps.set(taskId, cycle);
    }
  }

  return circularDeps;
}

function findCycle(
  nodeId: string,
  taskMap: Map<string, Task>,
  visiting: Set<string>,
  path: string[]
): string[] | undefined {
  if (visiting.has(nodeId)) {
    const cycleStart = path.indexOf(nodeId);
    return cycleStart >= 0 ? path.slice(cycleStart) : path;
  }

  const task = taskMap.get(nodeId);
  if (!task) {
    return undefined;
  }

  visiting.add(nodeId);
  path.push(nodeId);

  for (const dep of task.dependsOn ?? []) {
    const cycle = findCycle(dep, taskMap, new Set(visiting), [...path]);
    if (cycle) {
      return cycle;
    }
  }

  return undefined;
}

/**
 * Check if a string is a valid ISO 8601 date
 */
function isValidISODate(dateString: string): boolean {
  return parseDate(dateString) !== undefined;
}

function parseDate(dateString: string | undefined): number | undefined {
  if (!dateString) {
    return undefined;
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date.getTime();
}

function isStaleDate(value: number | undefined, staleAfterDays: number): boolean {
  if (value === undefined) {
    return true;
  }
  return Date.now() - value >= staleAfterDays * 86_400_000;
}

/**
 * Validate all entities and return comprehensive result
 */
export function validateAll(entities: Entity[]): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate individual entities
  for (const entity of entities) {
    errors.push(...validateEntity(entity));
  }

  // Validate repository constraints
  errors.push(...validateRepository(entities));

  return {
    valid: !errors.some(e => e.severity === 'error'),
    errors
  };
}
