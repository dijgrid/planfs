/**
 * Search and filtering helpers
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { Entity, Repository, Task } from './types';
import { getAllEntities } from './repository';

export interface EntityFilterCriteria {
  query?: string;
  status?: string | string[];
  assignee?: string;
  epic?: string;
  milestone?: string;
  priority?: string;
  refinementState?: string;
  tags?: string[];
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  criteria: EntityFilterCriteria;
}

export function validateSavedFilter(filter: SavedFilter): SavedFilter {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(filter.id)) throw new Error('Filter id must use letters, numbers, and hyphens only');
  if (!filter.name.trim()) throw new Error('Filter name is required');
  const criteria = filter.criteria ?? {};
  const allowed = new Set(['query', 'status', 'assignee', 'epic', 'milestone', 'priority', 'refinementState', 'tags']);
  for (const key of Object.keys(criteria)) if (!allowed.has(key)) throw new Error(`Unsupported saved-filter criterion: ${key}`);
  if (criteria.status && !([criteria.status].flat().every(value => ['todo', 'in-progress', 'review', 'done'].includes(value)))) throw new Error('Saved filter status is invalid');
  return { id: filter.id, name: filter.name.trim(), ...(filter.description?.trim() ? { description: filter.description.trim() } : {}), criteria };
}

export async function saveSavedFilter(rootPath: string, filter: SavedFilter, expectedId?: string): Promise<SavedFilter> {
  const normalized = validateSavedFilter(filter);
  if (expectedId && expectedId !== normalized.id) {
    const source = path.join(rootPath, '.planfs', 'filters', `${expectedId}.json`);
    await fs.rename(source, path.join(rootPath, '.planfs', 'filters', `${normalized.id}.json`));
  }
  const filePath = path.join(rootPath, '.planfs', 'filters', `${normalized.id}.json`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
  return normalized;
}

export async function deleteSavedFilter(rootPath: string, id: string): Promise<void> {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) throw new Error('Filter id is invalid');
  await fs.unlink(path.join(rootPath, '.planfs', 'filters', `${id}.json`));
}

export function searchEntities(
  repository: Repository,
  criteria: EntityFilterCriteria = {}
): Entity[] {
  return getAllEntities(repository).filter(entity => matchesCriteria(entity, criteria));
}

export function searchTasks(
  repository: Repository,
  criteria: EntityFilterCriteria = {}
): Task[] {
  return Array.from(repository.tasks.values()).filter(task =>
    matchesCriteria(task, criteria)
  );
}

export function matchesCriteria(
  entity: Entity,
  criteria: EntityFilterCriteria = {}
): boolean {
  if (criteria.query && !matchesFullText(entity, criteria.query)) {
    return false;
  }

  if (criteria.status && !matchesValue(entity.status, criteria.status)) {
    return false;
  }

  if (entity.type !== 'task') {
    return !criteria.assignee
      && !criteria.epic
      && !criteria.milestone
      && !criteria.priority
      && !criteria.refinementState
      && !criteria.tags?.length;
  }

  const task = entity as Task;

  if (criteria.assignee && task.assignee !== criteria.assignee) {
    return false;
  }

  if (criteria.epic && task.epic !== criteria.epic) {
    return false;
  }

  if (criteria.milestone && task.milestone !== criteria.milestone) {
    return false;
  }

  if (criteria.priority && task.priority !== criteria.priority) {
    return false;
  }

  if (criteria.refinementState && (task.refinementState ?? 'ready') !== criteria.refinementState) {
    return false;
  }

  if (criteria.tags?.length) {
    const taskTags = new Set(task.tags ?? []);
    if (!criteria.tags.every(tag => taskTags.has(tag))) {
      return false;
    }
  }

  return true;
}

export async function loadSavedFilters(rootPath: string): Promise<SavedFilter[]> {
  const filtersDir = path.join(rootPath, '.planfs', 'filters');

  try {
    const entries = await fs.readdir(filtersDir, { withFileTypes: true });
    const filters: SavedFilter[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(filtersDir, entry.name);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as SavedFilter;
      filters.push(normalizeSavedFilter(parsed, entry.name));
    }

    return filters.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function normalizeSavedFilter(filter: SavedFilter, filename: string): SavedFilter {
  if (!filter.id) {
    filter.id = filename.replace(/\.json$/, '');
  }

  if (!filter.name) {
    filter.name = filter.id;
  }

  filter.criteria = filter.criteria ?? {};

  const tags = (filter.criteria as { tags?: unknown }).tags;
  if (typeof tags === 'string') {
    filter.criteria.tags = [tags];
  }

  return filter;
}

function matchesValue(value: string, expected: string | string[]): boolean {
  return Array.isArray(expected) ? expected.includes(value) : value === expected;
}

function matchesFullText(entity: Entity, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return searchableText(entity).includes(normalizedQuery);
}

function searchableText(entity: Entity): string {
  return [
    entity.id,
    entity.title,
    entity.status,
    JSON.stringify(entity.metadata),
    entity.body
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
