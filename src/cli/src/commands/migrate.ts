import { applyFormatMigration, planFormatMigration, validateRepositoryState, loadRepository } from 'planfs-core';

export async function migrateCommand(rootPath: string, options: { apply?: boolean; format?: 'text' | 'json' } = {}): Promise<number> {
  try {
    const plan = options.apply ? await applyFormatMigration(rootPath) : await planFormatMigration(rootPath);
    if (options.apply) {
      const validation = validateRepositoryState(await loadRepository(rootPath));
      if (!validation.valid) throw new Error('Migration wrote files but validation failed; restore from version control and inspect diagnostics.');
    }
    if (options.format === 'json') console.log(JSON.stringify({ ...plan, applied: Boolean(options.apply) }, null, 2));
    else console.log(plan.changes.length === 0 ? 'No format migration needed.' : `${options.apply ? 'Applied' : 'Previewed'} ${plan.changes.length} format change(s). Re-run with --apply to write.`);
    return 0;
  } catch (error) {
    console.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
