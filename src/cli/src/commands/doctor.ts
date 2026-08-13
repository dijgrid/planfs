import { getAllEntities, loadRepository, validateRepositoryState } from 'planfs-core';

export interface DoctorOptions { format?: 'text' | 'json'; }

interface HealthIssue { category: string; severity: 'actionable' | 'historical'; id?: string; message: string; }

export async function doctorCommand(rootPath: string, options: DoctorOptions = {}): Promise<number> {
  try {
    const repository = await loadRepository(rootPath);
    const issues: HealthIssue[] = [];
    for (const task of repository.archivedTasks?.values() ?? []) {
      if (task.status !== 'done') issues.push({ category: 'archived-open-task', severity: 'actionable', id: task.id, message: 'Archived task is unfinished.' });
    }
    for (const epic of repository.archivedEpics?.values() ?? []) {
      if (epic.status === 'active') issues.push({ category: 'archived-active-epic', severity: 'actionable', id: epic.id, message: 'Archived epic is still active.' });
    }
    for (const entity of getAllEntities(repository)) {
      if (entity.type === 'task' && entity.status === 'review') issues.push({ category: 'stale-review', severity: 'actionable', id: entity.id, message: 'Task remains in review.' });
    }
    for (const diagnostic of validateRepositoryState(repository).errors.filter(item => item.severity === 'warning')) {
      issues.push({ category: diagnostic.message.startsWith('Unknown') ? 'historical-reference' : 'validation-warning', severity: diagnostic.message.startsWith('Unknown') ? 'historical' : 'actionable', id: diagnostic.id, message: diagnostic.message });
    }
    const summary = issues.reduce<Record<string, number>>((counts, issue) => ({ ...counts, [issue.category]: (counts[issue.category] ?? 0) + 1 }), {});
    if (options.format === 'json') {
      console.log(JSON.stringify({ issues, summary }, null, 2));
    } else if (issues.length === 0) {
      console.log('Plan health: no actionable issues.');
    } else {
      console.log(`Plan health: ${issues.filter(issue => issue.severity === 'actionable').length} actionable issue(s), ${issues.filter(issue => issue.severity === 'historical').length} historical reference(s).`);
      for (const issue of issues) console.log(`  ${issue.severity === 'actionable' ? '!' : 'i'}${issue.id ? ` [${issue.id}]` : ''} ${issue.category}: ${issue.message}`);
    }
    return issues.some(issue => issue.severity === 'actionable') ? 1 : 0;
  } catch (error) {
    console.error(`Plan health failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
