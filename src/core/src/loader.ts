/**
 * Entity loader
 * Converts discovered files into typed entity objects
 */

import { parseFrontmatter, normalizeMetadata } from './parser';
import {
  Entity,
  Task,
  Epic,
  Milestone,
  Decision,
  EntityType
} from './types';
import { DiscoveredFile } from './files';

/**
 * Load an entity from a discovered file
 */
export function loadEntity(file: DiscoveredFile, content: string): Entity {
  const { metadata, body } = parseFrontmatter(content);
  const normalized = normalizeMetadata(metadata);

  const id = normalized.id as string;
  if (!id) {
    throw new Error(`Entity in ${file.path} missing required 'id' field`);
  }

  const baseEntity = {
    id,
    type: file.type as EntityType,
    filePath: file.path,
    metadata: normalized,
    body,
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

function loadTask(base: { id: string; type: EntityType; filePath: string; metadata: Record<string, unknown>; body: string; createdAt?: string; updatedAt?: string; archive?: Task['archive'] }): Task {
  const metadata = base.metadata;

  return {
    id: base.id,
    type: 'task',
    filePath: base.filePath,
    metadata: base.metadata,
    body: base.body,
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

function loadEpic(base: { id: string; type: EntityType; filePath: string; metadata: Record<string, unknown>; body: string; createdAt?: string; updatedAt?: string; archive?: Epic['archive'] }): Epic {
  const metadata = base.metadata;

  return {
    id: base.id,
    type: 'epic',
    filePath: base.filePath,
    metadata: base.metadata,
    body: base.body,
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

function loadMilestone(base: { id: string; type: EntityType; filePath: string; metadata: Record<string, unknown>; body: string; createdAt?: string; updatedAt?: string; archive?: Milestone['archive'] }): Milestone {
  const metadata = base.metadata;

  return {
    id: base.id,
    type: 'milestone',
    filePath: base.filePath,
    metadata: base.metadata,
    body: base.body,
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

function loadDecision(base: { id: string; type: EntityType; filePath: string; metadata: Record<string, unknown>; body: string; createdAt?: string; updatedAt?: string; archive?: Decision['archive'] }): Decision {
  const metadata = base.metadata;

  return {
    id: base.id,
    type: 'decision',
    filePath: base.filePath,
    metadata: base.metadata,
    body: base.body,
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
