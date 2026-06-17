/**
 * Pull request integration helpers
 */

import { getBranchPlanningContext, BranchPlanningOptions } from './git';
import { Repository, Task } from './types';

export type PullRequestProviderId = 'github' | 'gitlab' | 'azure-devops';

export interface PullRequestProviderBoundary {
  id: PullRequestProviderId;
  name: string;
  status: 'planned' | 'local-summary';
  responsibilities: string[];
}

export interface TaskPullRequestRef {
  provider: PullRequestProviderId;
  url: string;
  status: 'linked';
}

export interface PullRequestSummaryOptions extends BranchPlanningOptions {
  provider?: PullRequestProviderId;
}

export interface PullRequestSummary {
  provider: PullRequestProviderId;
  title: string;
  markdown: string;
  relatedTaskIds: string[];
  branch: string;
  baseRef: string;
  changedPlanfsFiles: number;
  addedTasks: number;
  modifiedTasks: number;
  deletedTasks: number;
  conflicts: number;
}

export function getPullRequestProviderBoundaries(): PullRequestProviderBoundary[] {
  return [
    {
      id: 'github',
      name: 'GitHub',
      status: 'local-summary',
      responsibilities: [
        'Read branch context from local Git',
        'Generate PR summaries and templates',
        'Leave hosted API calls to a provider adapter'
      ]
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      status: 'planned',
      responsibilities: [
        'Map PlanFS PR summaries to merge requests',
        'Read merge request status through a provider adapter',
        'Keep GitLab-specific API fields outside core planning models'
      ]
    },
    {
      id: 'azure-devops',
      name: 'Azure DevOps',
      status: 'planned',
      responsibilities: [
        'Map PlanFS PR summaries to Azure Repos pull requests',
        'Read pull request status through a provider adapter',
        'Keep Azure-specific API fields outside core planning models'
      ]
    }
  ];
}

export async function generatePullRequestSummary(
  rootPath: string,
  options: PullRequestSummaryOptions = {}
): Promise<PullRequestSummary> {
  const provider = options.provider ?? 'github';
  const context = await getBranchPlanningContext(rootPath, options);
  const markdown = [
    '## PlanFS',
    '',
    `Branch: \`${context.currentBranch}\``,
    `Base: \`${context.comparisonRef}\``,
    '',
    '### Related Tasks',
    '',
    context.relatedTaskIds.length > 0
      ? context.relatedTaskIds.map(id => `- ${id}`).join('\n')
      : '- No related PlanFS tasks detected.',
    '',
    '### Planning Changes',
    '',
    `- Added tasks: ${context.addedTasks.length}`,
    `- Modified tasks: ${context.modifiedTasks.length}`,
    `- Deleted tasks: ${context.deletedTaskIds.length}`,
    `- Changed PlanFS files: ${context.changedFiles.length}`,
    `- PlanFS conflicts: ${context.conflicts.length}`,
    '',
    '### Added Tasks',
    '',
    renderTaskChanges(context.addedTasks),
    '',
    '### Modified Tasks',
    '',
    renderTaskChanges(context.modifiedTasks),
    '',
    '### Deleted Tasks',
    '',
    context.deletedTaskIds.length > 0
      ? context.deletedTaskIds.map(id => `- ${id}`).join('\n')
      : '- None',
    '',
    '### Validation',
    '',
    '- [ ] `planfs validate --format json` passes',
    '- [ ] Related task IDs are correct',
    '- [ ] Planning changes are intentional'
  ].join('\n');

  return {
    provider,
    title: context.pullRequestPreview.title,
    markdown,
    relatedTaskIds: context.relatedTaskIds,
    branch: context.currentBranch,
    baseRef: context.comparisonRef,
    changedPlanfsFiles: context.changedFiles.length,
    addedTasks: context.addedTasks.length,
    modifiedTasks: context.modifiedTasks.length,
    deletedTasks: context.deletedTaskIds.length,
    conflicts: context.conflicts.length
  };
}

export function getTaskPullRequestRefs(task: Task): TaskPullRequestRef[] {
  const links = task.links ?? {};
  return Object.values(links).flatMap(link => {
    if (typeof link !== 'string') {
      return [];
    }

    const provider = providerFromUrl(link);
    return provider ? [{ provider, url: link, status: 'linked' as const }] : [];
  });
}

export function getTaskPullRequestRefsById(
  repository: Repository
): Map<string, TaskPullRequestRef[]> {
  const refs = new Map<string, TaskPullRequestRef[]>();

  for (const task of repository.tasks.values()) {
    const taskRefs = getTaskPullRequestRefs(task);
    if (taskRefs.length > 0) {
      refs.set(task.id, taskRefs);
    }
  }

  return refs;
}

function renderTaskChanges(
  tasks: Array<{ id: string; title: string; status: string; previous?: { status: string } }>
): string {
  if (tasks.length === 0) {
    return '- None';
  }

  return tasks
    .map(task => {
      const status = task.previous
        ? `${task.previous.status} -> ${task.status}`
        : task.status;
      return `- ${task.id}: ${task.title} (${status})`;
    })
    .join('\n');
}

function providerFromUrl(url: string): PullRequestProviderId | undefined {
  if (/github\.com\/.+\/.+\/pull\/\d+/i.test(url)) {
    return 'github';
  }

  if (/gitlab\..+\/.+\/-\/merge_requests\/\d+/i.test(url)) {
    return 'gitlab';
  }

  if (/dev\.azure\.com\/.+\/.+\/_git\/.+\/pullrequest\/\d+/i.test(url)) {
    return 'azure-devops';
  }

  return undefined;
}
