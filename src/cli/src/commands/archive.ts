/**
 * Archive command workflows.
 */

import {
  archiveEntity,
  deleteArchivedEntity,
  listArchivedEntities,
  loadRepository,
  restoreArchivedEntity
} from 'planfs-core';

export type ArchiveAction = 'list' | 'archive' | 'restore' | 'delete';

export interface ArchiveOptions {
  id?: string;
  includeChildren?: boolean;
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

  const result = await archiveEntity(rootPath, options.id, {
    includeChildren: options.includeChildren
  });
  console.log(`✓ Archived ${result.archived.length} item${result.archived.length === 1 ? '' : 's'}`);
  for (const entity of result.archived) {
    console.log(`  ${entity.id} ${entity.title}`);
  }
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
