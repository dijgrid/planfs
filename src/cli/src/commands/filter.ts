import { deleteSavedFilter, loadSavedFilters, saveSavedFilter } from 'planfs-core';
import type { SavedFilter } from 'planfs-core';

export type FilterAction = 'list' | 'show' | 'save' | 'delete';
export interface FilterOptions { id?: string; name?: string; description?: string; criteria?: string; dryRun?: boolean; format?: 'text' | 'json'; }

export async function filterCommand(rootPath: string, action: FilterAction, options: FilterOptions): Promise<number> {
  try {
    const filters = await loadSavedFilters(rootPath);
    if (action === 'list') return output(filters, options);
    if (!options.id) throw new Error('--id is required');
    const existing = filters.find(filter => filter.id === options.id);
    if (action === 'show') return output(existing ?? (() => { throw new Error(`Filter not found: ${options.id}`); })(), options);
    if (action === 'delete') { if (options.dryRun) return output({ id: options.id, dryRun: true }, options); await deleteSavedFilter(rootPath, options.id); return output({ id: options.id, deleted: true }, options); }
    const criteria = options.criteria ? JSON.parse(options.criteria) : existing?.criteria ?? {};
    const filter: SavedFilter = { id: options.id, name: options.name ?? existing?.name ?? options.id, description: options.description ?? existing?.description, criteria };
    if (!options.dryRun) await saveSavedFilter(rootPath, filter);
    return output({ ...filter, dryRun: Boolean(options.dryRun) }, options);
  } catch (error) { console.error(`Filter command failed: ${error instanceof Error ? error.message : String(error)}`); return 1; }
}
function output(value: unknown, options: FilterOptions): number { console.log(options.format === 'json' ? JSON.stringify(value, null, 2) : JSON.stringify(value, null, 2)); return 0; }
