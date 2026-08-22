/**
 * PlanFS insights webview provider
 */

import * as vscode from 'vscode';
import {
  buildTaskGraph,
  generateReports,
  getBranchPlanningContext,
  loadRepository,
  Repository,
  saveEntity,
  validateRepositoryState
} from 'planfs-core';
import {
  createHelpTopics,
  handleHelpMessage,
  HelpTopic
} from './help';
import { renderInsights } from './insights-view';
import { renderMessageDocument } from './webview';
import { getPlanFSWorkspaceFolder } from './workspace';

export interface InsightsPayload {
  graph: {
    nodes: Array<{
      id: string;
      title: string;
      status: string;
      level: number;
      critical: boolean;
      priority?: string;
      assignee?: string;
      epic?: string;
      epicTitle?: string;
      milestone?: string;
      dueDate?: string;
      dependsOn: string[];
      dependents: string[];
      missingDependencies: string[];
    }>;
    edges: Array<{ from: string; to: string }>;
    criticalPath: string[];
    missingDependencies: Array<{ taskId: string; dependencyId: string }>;
    validationWarnings: string[];
  };
  timeline: Array<{
    id: string;
    title: string;
    kind: 'task' | 'epic' | 'milestone';
    status: string;
    date?: string;
    assignee?: string;
    epic?: string;
    milestone?: string;
    total?: number;
    done?: number;
    percentDone?: number;
    health: 'complete' | 'active' | 'empty' | 'overdue' | 'undated';
  }>;
  milestones: Array<{
    id: string;
    title: string;
    status: string;
    targetDate: string;
    total: number;
    done: number;
    percentDone: number;
  }>;
  epics: Array<{
    id: string;
    title: string;
    status: string;
    targetDate?: string;
    total: number;
    done: number;
    percentDone: number;
  }>;
  reports: ReturnType<typeof generateReports>;
  branch: {
    available: boolean;
    message?: string;
    currentBranch?: string;
    baseRef?: string;
    comparisonRef?: string;
    taskIdsInBranchName: string[];
    relatedTaskIds: string[];
    changedFiles: Array<{
      path: string;
      status: string;
      entityType?: string;
      entityId?: string;
    }>;
    addedTasks: Array<{
      id: string;
      title: string;
      status: string;
      filePath: string;
    }>;
    modifiedTasks: Array<{
      id: string;
      title: string;
      status: string;
      filePath: string;
      previous?: {
        title: string;
        status: string;
      };
    }>;
    deletedTaskIds: string[];
    conflicts: Array<{
      path: string;
      status: string;
      suggestion: string;
    }>;
    pullRequestPreview?: {
      title: string;
      summary: string;
      relatedTaskIds: string[];
    };
  };
  exports: {
    json: string;
    csv: string;
    markdown: string;
  };
  helpTopics: HelpTopic[];
}

export class InsightsProvider {
  private panel: vscode.WebviewPanel | undefined;
  private hasRenderedInsights = false;
  private workspaceUri: string | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  async open(): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }
    this.workspaceUri ??= workspaceFolder.uri.toString();

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      await this.render();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'planfsInsights',
      `PlanFS Insights — ${workspaceFolder.name}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri]
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      this.hasRenderedInsights = false;
      this.workspaceUri = undefined;
    });

    this.panel.webview.onDidReceiveMessage(async message => {
      if (message?.type === 'updateMilestoneDate') {
        await this.updateMilestoneDate(
          String(message.milestoneId),
          String(message.targetDate)
        );
      }

      if (message?.type === 'exportReport') {
        await exportReport(String(message.format), String(message.content));
      }

      if (message?.type === 'openEntity') {
        await openEntityFile(String(message.entityId));
      }

      await handleHelpMessage(this.extensionUri, message);
    });

    await this.render();
  }

  async refresh(): Promise<void> {
    if (this.panel) {
      await this.render();
    }
  }

  private async render(): Promise<void> {
    if (!this.panel) {
      return;
    }

    const workspaceFolder = this.workspaceFolder();
    if (!workspaceFolder) {
      this.panel.webview.html = renderMessage('No workspace folder open');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const payload = await createPayload(repository, this.extensionUri);
      if (this.hasRenderedInsights && await this.panel.webview.postMessage({ type: 'updateInsights', payload })) {
        return;
      }
      this.panel.webview.html = renderInsights(this.panel.webview, payload);
      this.hasRenderedInsights = true;
    } catch (error) {
      this.panel.webview.html = renderMessage(
        `Failed to load PlanFS insights: ${error instanceof Error ? error.message : String(error)}`
      );
      this.hasRenderedInsights = false;
    }
  }

  private async updateMilestoneDate(
    milestoneId: string,
    targetDate: string
  ): Promise<void> {
    const workspaceFolder = this.workspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const milestone = repository.milestones.get(milestoneId);

      if (!milestone) {
        vscode.window.showErrorMessage(`Milestone not found: ${milestoneId}`);
        return;
      }

      milestone.targetDate = targetDate;
      milestone.updatedAt = new Date().toISOString();
      await saveEntity(workspaceFolder.uri.fsPath, milestone);
      await this.render();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to update milestone: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.render();
    }
  }

  private workspaceFolder(): vscode.WorkspaceFolder | undefined {
    return this.workspaceUri
      ? vscode.workspace.workspaceFolders?.find(folder => folder.uri.toString() === this.workspaceUri)
      : getPlanFSWorkspaceFolder();
  }
}

async function createPayload(
  repository: Repository,
  extensionUri: vscode.Uri
): Promise<InsightsPayload> {
  const graph = buildTaskGraph(repository.tasks.values());
  const reports = generateReports(repository);
  const validation = validateRepositoryState(repository);
  const branch = await createBranchPayload(repository.root);

  const milestones = reports.timeline.map(report => ({
    id: report.milestoneId,
    title: report.title,
    status: report.status,
    targetDate: report.targetDate,
    total: report.total,
    done: report.done,
    percentDone: report.percentDone
  }));

  const epics = reports.epicCompletion.map(report => {
    const epic = repository.epics.get(report.epicId);
    return {
      id: report.epicId,
      title: report.title,
      status: epic?.status ?? 'active',
      targetDate: epic?.targetDate,
      total: report.total,
      done: report.done,
      percentDone: report.percentDone
    };
  });

  const payload = {
    graph: {
      nodes: Array.from(graph.nodes.values()).map(node => ({
        id: node.id,
        title: node.task.title,
        status: node.task.status,
        level: node.level,
        critical: node.critical,
        priority: node.task.priority,
        assignee: node.task.assignee,
        epic: node.task.epic,
        epicTitle: node.task.epic ? repository.epics.get(node.task.epic)?.title : undefined,
        milestone: node.task.milestone,
        dueDate: node.task.dueDate,
        dependsOn: node.dependsOn.filter(dependencyId => graph.nodes.has(dependencyId)),
        dependents: node.dependents,
        missingDependencies: node.missingDependencies
      })),
      edges: graph.edges,
      criticalPath: graph.criticalPath,
      missingDependencies: graph.missingDependencies,
      validationWarnings: validation.errors
        .filter(error => error.message.toLowerCase().includes('circular'))
        .map(error => error.message)
    },
    timeline: createTimelineItems(repository, milestones, epics),
    milestones,
    epics,
    reports,
    branch,
    exports: {
      json: '',
      csv: '',
      markdown: ''
    },
    helpTopics: createHelpTopics(extensionUri, [
      'insights.timeline',
      'insights.graph',
      'insights.reports',
      'insights.branch'
    ])
  };

  payload.exports = {
    json: JSON.stringify(reports, null, 2),
    csv: reportsToCsv(reports),
    markdown: reportsToMarkdown(reports)
  };

  return payload;
}

function createTimelineItems(
  repository: Repository,
  milestones: InsightsPayload['milestones'],
  epics: InsightsPayload['epics']
): InsightsPayload['timeline'] {
  const milestoneItems = milestones.map(milestone => ({
    id: milestone.id,
    title: milestone.title,
    kind: 'milestone' as const,
    status: milestone.status,
    date: milestone.targetDate,
    total: milestone.total,
    done: milestone.done,
    percentDone: milestone.percentDone,
    health: timelineHealth(milestone.targetDate, milestone.percentDone, milestone.total)
  }));

  const epicItems = epics.map(epic => ({
    id: epic.id,
    title: epic.title,
    kind: 'epic' as const,
    status: epic.status,
    date: epic.targetDate,
    epic: epic.id,
    total: epic.total,
    done: epic.done,
    percentDone: epic.percentDone,
    health: timelineHealth(epic.targetDate, epic.percentDone, epic.total)
  }));

  const taskItems = Array.from(repository.tasks.values()).map(task => ({
    id: task.id,
    title: task.title,
    kind: 'task' as const,
    status: task.status,
    date: task.dueDate,
    assignee: task.assignee,
    epic: task.epic,
    milestone: task.milestone,
    health: timelineHealth(task.dueDate, task.status === 'done' ? 100 : 0, 1)
  }));

  return [...milestoneItems, ...epicItems, ...taskItems];
}

function timelineHealth(
  date: string | undefined,
  percentDone: number,
  total: number
): 'complete' | 'active' | 'empty' | 'overdue' | 'undated' {
  if (!date) {
    return 'undated';
  }
  if (total === 0) {
    return 'empty';
  }
  if (percentDone >= 100) {
    return 'complete';
  }
  return new Date(date).getTime() < Date.now() ? 'overdue' : 'active';
}

async function createBranchPayload(rootPath: string): Promise<InsightsPayload['branch']> {
  try {
    const context = await getBranchPlanningContext(rootPath);
    return {
      available: true,
      currentBranch: context.currentBranch,
      baseRef: context.baseRef,
      comparisonRef: context.comparisonRef,
      taskIdsInBranchName: context.taskIdsInBranchName,
      relatedTaskIds: context.relatedTaskIds,
      changedFiles: context.changedFiles,
      addedTasks: context.addedTasks,
      modifiedTasks: context.modifiedTasks,
      deletedTaskIds: context.deletedTaskIds,
      conflicts: context.conflicts,
      pullRequestPreview: context.pullRequestPreview
    };
  } catch (error) {
    return {
      available: false,
      message: error instanceof Error ? error.message : String(error),
      taskIdsInBranchName: [],
      relatedTaskIds: [],
      changedFiles: [],
      addedTasks: [],
      modifiedTasks: [],
      deletedTaskIds: [],
      conflicts: []
    };
  }
}

async function exportReport(format: string, content: string): Promise<void> {
  const extension = format === 'markdown' ? 'md' : format;
  const document = await vscode.workspace.openTextDocument({
    language: format === 'markdown' ? 'markdown' : format,
    content
  });
  await vscode.window.showTextDocument(document, { preview: false });
  vscode.window.showInformationMessage(
    `Opened ${extension.toUpperCase()} report in a new editor`
  );
}

async function openEntityFile(entityId: string): Promise<void> {
  const workspaceFolder = getPlanFSWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }

  const repository = await loadRepository(workspaceFolder.uri.fsPath);
  const entity = repository.tasks.get(entityId)
    ?? repository.epics.get(entityId)
    ?? repository.milestones.get(entityId)
    ?? repository.decisions.get(entityId);

  if (!entity) {
    vscode.window.showErrorMessage(`PlanFS entity not found: ${entityId}`);
    return;
  }

  const document = await vscode.workspace.openTextDocument(entity.filePath);
  await vscode.window.showTextDocument(document, { preview: false });
}

function reportsToCsv(reports: InsightsPayload['reports']): string {
  const lines = ['section,id,title,total,done,percentDone,status'];

  for (const epic of reports.epicCompletion) {
    lines.push(
      csvLine([
        'epic',
        epic.epicId,
        epic.title,
        epic.total,
        epic.done,
        epic.percentDone,
        ''
      ])
    );
  }

  for (const milestone of reports.timeline) {
    lines.push(
      csvLine([
        'milestone',
        milestone.milestoneId,
        milestone.title,
        milestone.total,
        milestone.done,
        milestone.percentDone,
        milestone.status
      ])
    );
  }

  for (const workload of reports.workload) {
    lines.push(
      csvLine([
        'workload',
        workload.assignee,
        workload.assignee,
        workload.total,
        workload.byStatus.done,
        '',
        ''
      ])
    );
  }

  return lines.join('\n');
}

function reportsToMarkdown(reports: InsightsPayload['reports']): string {
  return [
    '# PlanFS Report',
    '',
    '## Epic Completion',
    '',
    '| Epic | Done | Total | Percent |',
    '|------|------|-------|---------|',
    ...reports.epicCompletion.map(
      report =>
        `| ${report.epicId} | ${report.done} | ${report.total} | ${report.percentDone}% |`
    ),
    '',
    '## Workload',
    '',
    '| Assignee | Todo | In Progress | Review | Done | Total |',
    '|----------|------|-------------|--------|------|-------|',
    ...reports.workload.map(
      report =>
        `| ${report.assignee} | ${report.byStatus.todo} | ${report.byStatus['in-progress']} | ${report.byStatus.review} | ${report.byStatus.done} | ${report.total} |`
    ),
    '',
    '## Blocked Tasks',
    '',
    ...(
      reports.blockedTasks.length === 0
        ? ['No blocked tasks from missing dependencies.']
        : reports.blockedTasks.map(
            node =>
              `- ${node.id}: missing ${node.missingDependencies.join(', ')}`
          )
    )
  ].join('\n');
}

function csvLine(values: Array<string | number>): string {
  return values
    .map(value => `"${String(value).replace(/"/g, '""')}"`)
    .join(',');
}

function renderMessage(message: string): string {
  return renderMessageDocument('PlanFS Insights', message);
}
