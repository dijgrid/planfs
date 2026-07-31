import { getTaskReadiness } from './next-work';
import { Milestone, Repository, Task } from './types';

export interface MilestoneRollupTask {
  task: Task;
  blocked: boolean;
  overdue: boolean;
  atRisk: boolean;
  blockingTaskIds: string[];
}

export interface MilestoneRollup {
  milestone: Milestone;
  tasks: MilestoneRollupTask[];
  total: number;
  open: number;
  done: number;
  blocked: number;
  overdue: number;
  atRisk: number;
  completionPercentage?: number;
}

export function getMilestoneRollup(
  repository: Repository,
  milestoneId: string,
  options: { now?: Date } = {}
): MilestoneRollup | undefined {
  const milestone = repository.milestones.get(milestoneId);
  if (!milestone) {
    return undefined;
  }

  const now = options.now ?? new Date();
  const tasks = Array.from(repository.tasks.values())
    .filter(task => task.milestone === milestoneId)
    .sort((a, b) => a.status.localeCompare(b.status) || a.id.localeCompare(b.id))
    .map(task => {
      const readiness = getTaskReadiness(task, repository);
      const open = task.status !== 'done';
      const dueDate = parseDate(task.dueDate, true);
      const blocked = open && (readiness.status === 'blocked' || readiness.status === 'missing-dependency');
      const overdue = open && dueDate !== undefined && dueDate < now.getTime();
      const atRisk = open && (blocked || isAfter(task.dueDate, milestone.targetDate));
      return {
        task,
        blocked,
        overdue,
        atRisk,
        blockingTaskIds: [...readiness.blockingTaskIds, ...readiness.missingDependencyIds]
      };
    });

  const done = tasks.filter(item => item.task.status === 'done').length;
  return {
    milestone,
    tasks,
    total: tasks.length,
    open: tasks.length - done,
    done,
    blocked: tasks.filter(item => item.blocked).length,
    overdue: tasks.filter(item => item.overdue).length,
    atRisk: tasks.filter(item => item.atRisk).length,
    completionPercentage: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : undefined
  };
}

function parseDate(value?: string, endOfDateOnly = false): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(endOfDateOnly && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999` : value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function isAfter(value?: string, comparison?: string): boolean {
  if (!value || !comparison) return false;
  const valueDate = value.slice(0, 10);
  const comparisonDate = comparison.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(valueDate) && /^\d{4}-\d{2}-\d{2}$/.test(comparisonDate)) {
    return valueDate > comparisonDate;
  }
  const parsed = parseDate(value);
  const parsedComparison = parseDate(comparison);
  return parsed !== undefined && parsedComparison !== undefined && parsed > parsedComparison;
}
