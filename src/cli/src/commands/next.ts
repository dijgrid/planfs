/**
 * Next-work command
 */

import {
  getNextWorkCandidates,
  loadRepository,
  TaskStatus
} from 'planfs-core';

export interface NextOptions {
  assignee?: string;
  epic?: string;
  milestone?: string;
  tag?: string | string[];
  status?: string | string[];
  includeBlocked?: boolean;
  explain?: boolean;
  limit?: number;
  format?: 'text' | 'json';
}

export async function nextCommand(
  rootPath: string,
  options: NextOptions = {}
): Promise<number> {
  try {
    const repository = await loadRepository(rootPath);
    const candidates = getNextWorkCandidates(repository, {
      assignee: options.assignee,
      epic: options.epic,
      milestone: options.milestone,
      tags: normalizeStringArray(options.tag),
      status: normalizeStatus(options.status),
      includeBlocked: options.includeBlocked,
      limit: options.limit
    });

    if (options.format === 'json') {
      console.log(JSON.stringify(candidates.map(candidate => ({
        id: candidate.task.id,
        title: candidate.task.title,
        status: candidate.task.status,
        priority: candidate.task.priority,
        assignee: candidate.task.assignee,
        epic: candidate.task.epic,
        milestone: candidate.task.milestone,
        dueDate: candidate.task.dueDate,
        readiness: candidate.readiness.status,
        blockingTaskIds: candidate.readiness.blockingTaskIds,
        missingDependencyIds: candidate.readiness.missingDependencyIds,
        critical: candidate.critical,
        downstreamCount: candidate.downstreamCount,
        reasons: candidate.reasons
      })), null, 2));
      return 0;
    }

    if (candidates.length === 0) {
      console.log('No next work candidates found');
      return 0;
    }

    console.log(`\nNEXT WORK (${candidates.length} candidates)\n`);
    for (const candidate of candidates) {
      const task = candidate.task;
      const parts = [
        task.status,
        task.priority ?? 'no priority',
        task.assignee ? `@${task.assignee}` : 'unassigned',
        task.dueDate ? `due ${task.dueDate}` : undefined
      ].filter(Boolean);

      console.log(`${task.id} ${task.title}`);
      console.log(`  ${parts.join(' | ')}`);
      console.log(`  ${candidate.reasons[0]}`);

      if (options.explain) {
        for (const reason of candidate.reasons.slice(1)) {
          console.log(`  - ${reason}`);
        }
      }

      console.log('');
    }

    return 0;
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}

function normalizeStringArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeStatus(
  value: string | string[] | undefined
): TaskStatus | TaskStatus[] | undefined {
  const statuses = normalizeStringArray(value) as TaskStatus[] | undefined;
  if (!statuses) {
    return undefined;
  }

  return statuses.length === 1 ? statuses[0] : statuses;
}
