/**
 * Archive command workflows.
 */

import * as path from 'path';
import {
  archiveEntity,
  deleteArchivedEntity,
  Entity,
  generateEntityContent,
  listArchivedEntities,
  loadRepository,
  restoreArchivedEntity
} from 'planfs-core';

export type ArchiveAction = 'list' | 'archive' | 'restore' | 'delete';

export interface ArchiveOptions {
  id?: string;
  includeChildren?: boolean;
  dryRun?: boolean;
  expectedUpdatedAt?: string;
  yes?: boolean;
  format?: 'text' | 'json';
}

export async function archiveCommand(
  rootPath: string,
  action: ArchiveAction,
  options: ArchiveOptions = {}
): Promise<number> {
  try {
    switch (action) {
      case 'list':
        return await listArchive(rootPath, options);
      case 'archive':
        return await archiveItem(rootPath, options);
      case 'restore':
        return await restoreItem(rootPath, options);
      case 'delete':
        return await deleteItem(rootPath, options);
    }
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}

async function listArchive(rootPath: string, options: ArchiveOptions): Promise<number> {
  const repository = await loadRepository(rootPath);
  const archived = listArchivedEntities(repository);

  if (options.format === 'json') {
    console.log(JSON.stringify(archived, null, 2));
    return 0;
  }

  if (archived.length === 0) {
    console.log('No archived items found');
    return 0;
  }

  console.log(`\nARCHIVE (${archived.length} items)\n`);
  for (const entity of archived) {
    console.log(`${entity.id} ${entity.title}`);
    console.log(`  ${entity.type} | archived ${entity.archive?.archivedAt ?? 'unknown'}`);
  }
  return 0;
}

async function archiveItem(rootPath: string, options: ArchiveOptions): Promise<number> {
  if (!options.id) {
    console.error('Error: --id is required when archiving an item');
    return 1;
  }

  const repository = await loadRepository(rootPath);
  const entity = repository.tasks.get(options.id) ?? repository.epics.get(options.id);
  if (!entity) {
    throw new Error(`Active task or epic not found: ${options.id}`);
  }
  if (options.expectedUpdatedAt !== undefined && entity.updatedAt !== options.expectedUpdatedAt) {
    throw new Error(`Archive conflict: ${entity.id} changed since preview`);
  }

  const preview = previewArchiveEntities(rootPath, entity, {
    includeChildren: options.includeChildren,
    now: new Date(),
    childTasks: Array.from(repository.tasks.values()).filter(task => task.epic === entity.id)
  });

  if (options.dryRun) {
    printArchiveResult(preview.archived, true, options.format, preview.previews);
    return 0;
  }

  const result = await archiveEntity(rootPath, options.id, {
    includeChildren: options.includeChildren
  });
  printArchiveResult(result.archived, false, options.format);
  return 0;
}

async function restoreItem(rootPath: string, options: ArchiveOptions): Promise<number> {
  if (!options.id) {
    console.error('Error: --id is required when restoring an archived item');
    return 1;
  }

  const entity = await restoreArchivedEntity(rootPath, options.id);
  console.log(`✓ Restored ${entity.id}`);
  return 0;
}

async function deleteItem(rootPath: string, options: ArchiveOptions): Promise<number> {
  if (!options.id) {
    console.error('Error: --id is required when deleting an archived item');
    return 1;
  }
  if (!options.yes) {
    console.error('Error: permanent archive delete requires --yes');
    return 1;
  }

  const entity = await deleteArchivedEntity(rootPath, options.id);
  console.log(`✓ Permanently deleted archived item ${entity.id}`);
  return 0;
}

function previewArchiveEntities(
  rootPath: string,
  entity: Entity,
  options: { includeChildren?: boolean; now: Date; childTasks: Entity[] }
): { archived: Entity[]; previews: Array<{ id: string; preview: string }> } {
  const toArchive = [entity];
  if (entity.type === 'epic' && options.includeChildren) {
    toArchive.push(...options.childTasks);
  }

  const archivedAt = options.now.toISOString();
  const archived = toArchive.map(current => {
    const archive = {
      archivedAt,
      originalPath: path.relative(rootPath, current.filePath)
    };
    return {
      ...current,
      archive,
      updatedAt: archivedAt,
      metadata: {
        ...current.metadata,
        archive,
        updatedAt: archivedAt
      }
    } as Entity;
  });

  return {
    archived,
    previews: archived.map(current => ({
      id: current.id,
      preview: generateEntityContent(current)
    }))
  };
}

function printArchiveResult(
  archived: Entity[],
  dryRun: boolean,
  format: ArchiveOptions['format'],
  previews: Array<{ id: string; preview: string }> = []
): void {
  if (format === 'json') {
    console.log(JSON.stringify({
      dryRun,
      archived,
      previews
    }, null, 2));
    return;
  }

  console.log(`✓ ${dryRun ? 'Previewed archive of' : 'Archived'} ${archived.length} item${archived.length === 1 ? '' : 's'}`);
  for (const entity of archived) {
    console.log(`  ${entity.id} ${entity.title}`);
  }
  for (const item of previews) {
    console.log(`\n--- preview ${item.id} ---`);
    console.log(item.preview.trimEnd());
  }
}
