/**
 * Entity loader
 * Converts discovered files into typed entity objects
 */

import * as path from 'path';
import { parseFrontmatter, parseFrontmatterTolerant, normalizeMetadata } from './parser';
import {
  Entity,
  Task,
  Epic,
  Milestone,
  Decision,
  EntityType,
  ValidationError
} from './types';
import { DiscoveredFile } from './files';

export interface LoadEntityOptions {
  tolerant?: boolean;
}

/**
 * Load an entity from a discovered file
 */
export function loadEntity(
  file: DiscoveredFile,
  content: string,
  options: LoadEntityOptions = {}
): Entity {
  const parsed = options.tolerant
    ? parseFrontmatterTolerant(content)
    : { ...parseFrontmatter(content), diagnostics: [] };
  const { metadata, body } = parsed;
  const normalized = normalizeMetadata(metadata);
  const diagnostics = parsed.diagnostics.map(diagnostic => ({
    id: typeof normalized.id === 'string' ? normalized.id : undefined,
    path: file.path,
    message: diagnostic.message,
    severity: diagnostic.severity
  } satisfies ValidationError));

  const id = getEntityId(file, normalized, diagnostics, options);
  if (!id) {
    throw new Error(`Entity in ${file.path} missing required 'id' field`);
  }
  normalized.id = id;
  addMissingFieldDiagnostics(file, normalized, id, diagnostics);

  const baseEntity = {
    id,
    type: file.type as EntityType,
    filePath: file.path,
    metadata: normalized,
    body,
    diagnostics,
    createdAt: normalized.createdAt as string | undefined,
    updatedAt: normalized.updatedAt as string | undefined,
    archive: isArchiveMetadata(normalized.archive)
      ? normalized.archive
      : undefined
  };

  switch (file.type) {
    case 'task':
      return loadTask(baseEntity);
    case 'epic':
      return loadEpic(baseEntity);
    case 'milestone':
      return loadMilestone(baseEntity);
    case 'decision':
      return loadDecision(baseEntity);
    default:
      throw new Error(`Unknown entity type: ${file.type}`);
  }
}

function getEntityId(
  file: DiscoveredFile,
  metadata: Record<string, unknown>,
  diagnostics: ValidationError[],
  options: LoadEntityOptions
): string | undefined {
  const metadataId = metadata.id;
  if (typeof metadataId === 'string' && metadataId.trim()) {
    return metadataId.trim();
  }

  if (!options.tolerant) {
    return undefined;
  }

  const inferredId = getIdFromFilename(path.basename(file.path));
  if (!inferredId) {
    return undefined;
  }

  diagnostics.push({
    id: inferredId,
    path: file.path,
    message: `Missing required field 'id' in ${file.path}; using file name '${inferredId}' for this load. Repair by adding id: ${inferredId} to YAML frontmatter.`,
    severity: 'warning'
  });
  return inferredId;
}

function addMissingFieldDiagnostics(
  file: DiscoveredFile,
  metadata: Record<string, unknown>,
  id: string,
  diagnostics: ValidationError[]
): void {
  if (typeof metadata.title !== 'string' || !metadata.title.trim()) {
    diagnostics.push({
      id,
      path: file.path,
      message: `Missing required field 'title' in ${file.path}. Repair by adding title: <short summary> to YAML frontmatter.`,
      severity: 'error'
    });
  }
}

function loadTask(base: { id: string; type: EntityType; filePath: string; metadata: Record<string, unknown>; body: string; diagnostics?: ValidationError[]; createdAt?: string; updatedAt?: string; archive?: Task['archive'] }): Task {
  const metadata = base.metadata;

  return {
    id: base.id,
    type: 'task',
    filePath: base.filePath,
    metadata: base.metadata,
    body: base.body,
    diagnostics: base.diagnostics,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    archive: base.archive,
    title: metadata.title as string || '',
    status: (metadata.status as string || 'todo') as Task['status'],
    priority: metadata.priority as Task['priority'] | undefined,
    assignee: metadata.assignee as string | undefined,
    epic: metadata.epic as string | undefined,
    milestone: metadata.milestone as string | undefined,
    dependsOn: Array.isArray(metadata.dependsOn) ? (metadata.dependsOn as string[]) : undefined,
    tags: Array.isArray(metadata.tags) ? (metadata.tags as string[]) : undefined,
    dueDate: metadata.dueDate as string | undefined,
    estimate: metadata.estimate as string | undefined,
    refinementState: metadata.refinementState as Task['refinementState'] | undefined,
    backlogOrder: typeof metadata.backlogOrder === 'number' ? metadata.backlogOrder : undefined,
    links: typeof metadata.links === 'object' && metadata.links !== null ? (metadata.links as Record<string, string>) : undefined
  };
}

function loadEpic(base: { id: string; type: EntityType; filePath: string; metadata: Record<string, unknown>; body: string; diagnostics?: ValidationError[]; createdAt?: string; updatedAt?: string; archive?: Epic['archive'] }): Epic {
  const metadata = base.metadata;

  return {
    id: base.id,
    type: 'epic',
    filePath: base.filePath,
    metadata: base.metadata,
    body: base.body,
    diagnostics: base.diagnostics,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    archive: base.archive,
    title: metadata.title as string || '',
    status: (metadata.status as string || 'active') as Epic['status'],
    priority: metadata.priority as Epic['priority'] | undefined,
    owner: metadata.owner as string | undefined,
    description: metadata.description as string | undefined,
    targetDate: metadata.targetDate as string | undefined,
    tags: Array.isArray(metadata.tags) ? (metadata.tags as string[]) : undefined,
    links: typeof metadata.links === 'object' && metadata.links !== null ? (metadata.links as Record<string, string>) : undefined
  };
}

function loadMilestone(base: { id: string; type: EntityType; filePath: string; metadata: Record<string, unknown>; body: string; diagnostics?: ValidationError[]; createdAt?: string; updatedAt?: string; archive?: Milestone['archive'] }): Milestone {
  const metadata = base.metadata;

  return {
    id: base.id,
    type: 'milestone',
    filePath: base.filePath,
    metadata: base.metadata,
    body: base.body,
    diagnostics: base.diagnostics,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    archive: base.archive,
    title: metadata.title as string || '',
    status: (metadata.status as string || 'active') as Milestone['status'],
    targetDate: metadata.targetDate as string || '',
    description: metadata.description as string | undefined,
    owner: metadata.owner as string | undefined,
    links: typeof metadata.links === 'object' && metadata.links !== null ? (metadata.links as Record<string, string>) : undefined
  };
}

function loadDecision(base: { id: string; type: EntityType; filePath: string; metadata: Record<string, unknown>; body: string; diagnostics?: ValidationError[]; createdAt?: string; updatedAt?: string; archive?: Decision['archive'] }): Decision {
  const metadata = base.metadata;

  return {
    id: base.id,
    type: 'decision',
    filePath: base.filePath,
    metadata: base.metadata,
    body: base.body,
    diagnostics: base.diagnostics,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    archive: base.archive,
    title: metadata.title as string || '',
    status: (metadata.status as string || 'proposed') as Decision['status'],
    date: metadata.date as string | undefined,
    context: metadata.context as string | undefined,
    decision: metadata.decision as string | undefined,
    consequences: metadata.consequences as string | undefined,
    author: metadata.author as string | undefined,
    supersedes: metadata.supersedes as string | undefined,
    supersededBy: metadata.supersededBy as string | undefined
  };
}

function isArchiveMetadata(value: unknown): value is { archivedAt: string; originalPath: string } {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { archivedAt?: unknown }).archivedAt === 'string'
    && typeof (value as { originalPath?: unknown }).originalPath === 'string';
}

/**
 * Extract ID from filename
 */
export function getIdFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/**
 * Generate filename from entity ID
 */
export function getFilenameFromId(id: string): string {
  return `${id}.md`;
}

/**
 * Get the subdirectory for an entity type
 */
export function getEntityDirectory(type: EntityType): string {
  switch (type) {
    case 'task':
      return 'tasks';
    case 'epic':
      return 'epics';
    case 'milestone':
      return 'milestones';
    case 'decision':
      return 'decisions';
  }
}
