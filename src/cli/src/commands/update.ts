import { Entity, generateEntityContent, getAllEntities, loadRepository, saveEntity, validateRepositoryState } from 'planfs-core';

export interface UpdateOptions { patch: Record<string, unknown>; expectedUpdatedAt?: string; dryRun?: boolean; format?: 'text' | 'json'; }

export async function updateCommand(rootPath: string, id: string, options: UpdateOptions): Promise<number> {
  try {
    const repository = await loadRepository(rootPath);
    const current = getAllEntities(repository).find(entity => entity.id === id);
    if (!current) throw new Error(`Entity not found: ${id}`);
    if (options.expectedUpdatedAt !== undefined && current.updatedAt !== options.expectedUpdatedAt) throw new Error(`Update conflict: ${id} changed since preview`);
    const next = { ...current, metadata: { ...current.metadata } } as Entity & Record<string, unknown>;
    for (const [key, value] of Object.entries(options.patch)) {
      if (value === undefined) continue;
      if (!(key in current) || ['id', 'type', 'filePath', 'body', 'metadata', 'createdAt', 'updatedAt', 'archive'].includes(key)) throw new Error(`Unsupported update field for ${current.type}: ${key}`);
      if (value === '__clear__') delete next[key]; else next[key] = value;
    }
    next.updatedAt = new Date().toISOString();
    const copy = { ...repository, tasks: new Map(repository.tasks), epics: new Map(repository.epics), milestones: new Map(repository.milestones), decisions: new Map(repository.decisions) };
    if (next.type === 'task') copy.tasks.set(next.id, next as never); else if (next.type === 'epic') copy.epics.set(next.id, next as never); else if (next.type === 'milestone') copy.milestones.set(next.id, next as never); else copy.decisions.set(next.id, next as never);
    const errors = validateRepositoryState(copy).errors.filter(error => error.severity === 'error');
    if (errors.length) throw new Error(`Update failed validation: ${errors.map(error => error.message).join('; ')}`);
    const preview = generateEntityContent(next);
    if (!options.dryRun) await saveEntity(rootPath, next);
    if (options.format === 'json') console.log(JSON.stringify({ id, dryRun: Boolean(options.dryRun), expectedUpdatedAt: current.updatedAt ?? null, entity: next, preview }, null, 2));
    else console.log(`${options.dryRun ? 'Previewed' : 'Updated'} ${id}`);
    return 0;
  } catch (error) { console.error(`Update failed: ${error instanceof Error ? error.message : String(error)}`); return 1; }
}
