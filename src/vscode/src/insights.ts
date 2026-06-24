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
import { getPlanFSWorkspaceFolder } from './workspace';

interface InsightsPayload {
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
}

export class InsightsProvider {
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  async open(): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      await this.render();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'planfsInsights',
      'PlanFS Insights',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri]
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
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

    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      this.panel.webview.html = renderMessage('No workspace folder open');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const payload = await createPayload(repository);
      this.panel.webview.html = renderInsights(this.panel.webview, payload);
    } catch (error) {
      this.panel.webview.html = renderMessage(
        `Failed to load PlanFS insights: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async updateMilestoneDate(
    milestoneId: string,
    targetDate: string
  ): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
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
}

async function createPayload(repository: Repository): Promise<InsightsPayload> {
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
    }
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
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlanFS Insights</title>
</head>
<body>
  <p>${escapeHtml(message)}</p>
</body>
</html>`;
}

function renderInsights(webview: vscode.Webview, payload: InsightsPayload): string {
  const nonce = getNonce();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>PlanFS Insights</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --panel: color-mix(in srgb, var(--vscode-sideBar-background) 88%, var(--vscode-editor-background));
      --panel-strong: color-mix(in srgb, var(--vscode-sideBar-background) 72%, var(--vscode-focusBorder));
      --border: var(--vscode-panel-border);
      --text: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --accent: var(--vscode-focusBorder);
      --todo: #7f8a99;
      --progress: #4d9de0;
      --review: #d9a441;
      --done: #58a66c;
      --critical: #d16363;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 18px;
      color: var(--text);
      background: var(--bg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .shell {
      max-width: 1280px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      margin-bottom: 16px;
    }

    h1 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 650;
    }

    .subtle {
      color: var(--muted);
    }

    .tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 14px;
      border-bottom: 1px solid var(--border);
    }

    .tab {
      border: 0;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      background: transparent;
      padding: 8px 10px;
      cursor: pointer;
    }

    .tab.active {
      color: var(--text);
      border-bottom-color: var(--accent);
    }

    .panel {
      display: none;
    }

    .panel.active {
      display: block;
    }

    .metrics,
    .reportGrid,
    .timeline {
      display: grid;
      gap: 12px;
    }

    .metrics {
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      margin-bottom: 14px;
    }

    .metric,
    .card,
    .milestone,
    .node {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 6px;
    }

    .metric {
      padding: 12px;
    }

    .metric strong {
      display: block;
      font-size: 20px;
      margin-bottom: 4px;
    }

    .graphTools,
    .timelineTools {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .graphTools input,
    .timelineTools input {
      min-width: 220px;
      flex: 1 1 260px;
    }

    .graphStage {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      overflow: auto;
      margin-bottom: 12px;
    }

    .graphSvg {
      display: block;
      min-width: 920px;
      width: 100%;
      height: auto;
      transform-origin: top left;
    }

    .graphEdge {
      stroke: color-mix(in srgb, var(--muted) 70%, transparent);
      stroke-width: 1.5;
      fill: none;
    }

    .graphEdge.related {
      stroke: var(--accent);
      stroke-width: 2.6;
    }

    .graphEdge.downstream {
      stroke: var(--done);
    }

    .graphNode rect {
      fill: var(--vscode-input-background);
      stroke: var(--border);
      stroke-width: 1;
      rx: 6;
    }

    .graphNode.in-progress rect {
      stroke: var(--progress);
    }

    .graphNode.review rect {
      stroke: var(--review);
    }

    .graphNode.done rect {
      stroke: var(--done);
    }

    .graphNode.selected rect {
      stroke: var(--accent);
      stroke-width: 2.5;
    }

    .graphNode.dim {
      opacity: 0.3;
    }

    .graphNode text {
      fill: var(--text);
      font-size: 12px;
      pointer-events: none;
    }

    .graphNode .metaText {
      fill: var(--muted);
      font-size: 10px;
    }

    .epicLaneLabel {
      fill: var(--muted);
      font-size: 11px;
      font-weight: 600;
    }

    .selectedDetails {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
    }

    .legend {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 0 0 12px;
      color: var(--muted);
    }

    .legendItem {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 3px 8px;
      background: color-mix(in srgb, var(--panel-strong) 40%, transparent);
    }

    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--todo);
    }

    .swatch.progress { background: var(--progress); }
    .swatch.review { background: var(--review); }
    .swatch.done { background: var(--done); }
    .swatch.warning { background: var(--critical); }

    .nodeHead {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .nodeTitle {
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .lane {
      color: var(--muted);
      font-size: 11px;
    }

    .warningList {
      margin-top: 16px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
    }

    .timelineAxis {
      position: relative;
      min-height: 420px;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      padding: 18px 24px 54px;
    }

    .timelineCanvas {
      position: relative;
      min-width: 980px;
      height: 340px;
    }

    .tabIntro {
      margin: 0 0 12px;
      color: var(--muted);
      line-height: 1.45;
    }

    .axisLine,
    .nowLine {
      position: absolute;
      left: 0;
      right: 0;
      top: 168px;
      height: 1px;
      background: var(--border);
    }

    .nowLine {
      width: 2px;
      right: auto;
      top: 0;
      height: 318px;
      background: var(--accent);
    }

    .nowLabel {
      position: absolute;
      top: 322px;
      transform: translateX(-50%);
      color: var(--accent);
      font-size: 11px;
      font-weight: 600;
    }

    .tick {
      position: absolute;
      top: 152px;
      width: 1px;
      height: 32px;
      background: var(--border);
    }

    .tick span {
      position: absolute;
      top: 36px;
      transform: translateX(-50%);
      color: var(--muted);
      font-size: 10px;
      white-space: nowrap;
    }

    .timelineItem {
      position: absolute;
      width: 132px;
      min-height: 42px;
      transform: translateX(-50%);
      padding: 6px 7px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--vscode-input-background);
      box-shadow: 0 2px 8px color-mix(in srgb, black 14%, transparent);
      color: var(--text);
      text-align: left;
      cursor: pointer;
    }

    .timelineItem.compact {
      width: 96px;
      min-height: 30px;
      padding: 5px 6px;
    }

    .timelineItem.compact .timelineTitle,
    .timelineItem.compact .timelineProgress,
    .timelineItem.compact .timelineDate {
      display: none;
    }

    .timelineItem.detailed {
      width: 150px;
    }

    .timelineItem.task {
      border-left: 4px solid var(--progress);
    }

    .timelineItem.epic {
      border-left: 4px solid var(--review);
    }

    .timelineItem.milestone {
      border-left: 4px solid var(--done);
    }

    .timelineItem.overdue {
      border-color: var(--critical);
    }

    .timelineItem.selected {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
    }

    .timelineItem.undated {
      border-style: dashed;
    }

    .timelineItemStatic {
      width: 100%;
      color: var(--text);
      text-align: left;
      background: var(--panel);
      border-color: var(--border);
    }

    .timelineTitle {
      overflow-wrap: anywhere;
      line-height: 1.25;
      margin-top: 3px;
      font-size: 12px;
    }

    .undatedRail {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }

    .timelineGroup {
      margin-bottom: 14px;
    }

    .timelineGroup h2 {
      margin: 0 0 8px;
      font-size: 14px;
    }

    .milestone,
    .card {
      padding: 12px;
    }

    .bar {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: color-mix(in srgb, var(--muted) 25%, transparent);
      margin: 10px 0;
    }

    .fill {
      height: 100%;
      background: linear-gradient(90deg, var(--progress), var(--done));
    }

    .row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    input,
    button {
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--border));
      border-radius: 3px;
      padding: 6px 8px;
      min-height: 28px;
    }

    button {
      cursor: pointer;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .reportGrid {
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }

    .branchGrid {
      display: grid;
      grid-template-columns: minmax(280px, 1.1fr) minmax(280px, 0.9fr);
      gap: 12px;
      align-items: start;
    }

    .pillRow {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .pill {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 3px 8px;
      color: var(--text);
      background: color-mix(in srgb, var(--panel-strong) 48%, transparent);
      font-size: 12px;
    }

    .fileList {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }

    .fileRow {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 8px;
      align-items: start;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .filePath {
      overflow-wrap: anywhere;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      text-align: left;
      padding: 7px 6px;
      border-bottom: 1px solid var(--border);
    }

    th {
      color: var(--muted);
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="header">
      <div>
        <h1>PlanFS Insights</h1>
        <div class="subtle">Dependency graph, roadmap timeline, and project reports from .planfs.</div>
      </div>
    </header>

    <nav class="tabs" aria-label="Insights views">
      <button class="tab active" data-tab="timeline">Timeline</button>
      <button class="tab" data-tab="graph">Dependency Graph</button>
      <button class="tab" data-tab="reports">Reports</button>
      <button class="tab" data-tab="branch">Branch</button>
    </nav>

    <section id="timeline" class="panel active"></section>
    <section id="graph" class="panel"></section>
    <section id="reports" class="panel"></section>
    <section id="branch" class="panel"></section>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = ${JSON.stringify(payload)};
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');
    let selectedGraphNode;
    let graphZoom = 1;
    let selectedTimelineItem;

    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(item => item.classList.remove('active'));
      panels.forEach(panel => panel.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    }));

    renderGraph();
    renderTimeline();
    renderReports();
    renderBranch();

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-open-entity]');
      if (button) {
        vscode.postMessage({ type: 'openEntity', entityId: button.dataset.openEntity });
      }
    });

    function renderGraph() {
      const root = document.getElementById('graph');
      const epicOptions = unique(state.graph.nodes.map(node => node.epic || 'No epic')).sort();
      const milestoneOptions = unique(state.graph.nodes.map(node => node.milestone || 'No milestone')).sort();
      const assigneeOptions = unique(state.graph.nodes.map(node => node.assignee || 'Unassigned')).sort();
      root.innerHTML = [
        '<p class="tabIntro">Trace prerequisite flow, spot missing dependency references, and inspect the tasks most likely to affect downstream work.</p>',
        renderMetrics([
          ['Tasks', state.graph.nodes.length],
          ['Dependencies', state.graph.edges.length],
          ['Critical Path', state.graph.criticalPath.length],
          ['Missing Deps', state.graph.missingDependencies.length]
        ]),
        '<div class="graphTools">',
        '<input id="graphFilter" type="search" placeholder="Filter task, assignee, epic, or milestone" aria-label="Filter graph">',
        '<select id="graphEpic" aria-label="Filter graph by epic"><option value="all">All epics</option>' + epicOptions.map(epic => '<option value="' + escapeHtml(epic) + '">' + escapeHtml(epic) + '</option>').join('') + '</select>',
        '<select id="graphMilestone" aria-label="Filter graph by milestone"><option value="all">All milestones</option>' + milestoneOptions.map(milestone => '<option value="' + escapeHtml(milestone) + '">' + escapeHtml(milestone) + '</option>').join('') + '</select>',
        '<select id="graphAssignee" aria-label="Filter graph by assignee"><option value="all">All assignees</option>' + assigneeOptions.map(assignee => '<option value="' + escapeHtml(assignee) + '">' + escapeHtml(assignee) + '</option>').join('') + '</select>',
        '<select id="graphStatus" aria-label="Filter graph by status"><option value="all">All statuses</option><option value="todo">Todo</option><option value="in-progress">In progress</option><option value="review">Review</option><option value="done">Done</option></select>',
        '<select id="graphHealth" aria-label="Filter graph by dependency health"><option value="all">All dependency health</option><option value="connected">Has dependencies</option><option value="isolated">No dependencies</option><option value="missing">Missing dependencies</option><option value="critical">Critical path</option></select>',
        '<button id="zoomOutGraph" type="button">Zoom out</button>',
        '<button id="zoomInGraph" type="button">Zoom in</button>',
        '<button id="fitGraph" type="button">Fit</button>',
        '<button id="clearGraphSelection" type="button">Clear selection</button>',
        '</div>',
        renderGraphLegend(),
        '<div id="graphStage" class="graphStage"></div>',
        '<div id="selectedDetails" class="selectedDetails subtle">Select a task node to highlight prerequisites and downstream work.</div>',
        state.graph.edges.length === 0
          ? '<div class="warningList subtle">No task dependencies yet. Add dependsOn values to task frontmatter to show flow between tasks.</div>'
          : '',
        renderWarnings()
      ].join('');

      root.querySelector('#graphFilter').addEventListener('input', renderGraphStage);
      root.querySelector('#graphEpic').addEventListener('change', renderGraphStage);
      root.querySelector('#graphMilestone').addEventListener('change', renderGraphStage);
      root.querySelector('#graphAssignee').addEventListener('change', renderGraphStage);
      root.querySelector('#graphStatus').addEventListener('change', renderGraphStage);
      root.querySelector('#graphHealth').addEventListener('change', renderGraphStage);
      root.querySelector('#zoomOutGraph').addEventListener('click', () => {
        graphZoom = Math.max(0.6, graphZoom - 0.15);
        renderGraphStage();
      });
      root.querySelector('#zoomInGraph').addEventListener('click', () => {
        graphZoom = Math.min(1.8, graphZoom + 0.15);
        renderGraphStage();
      });
      root.querySelector('#fitGraph').addEventListener('click', () => {
        graphZoom = 1;
        renderGraphStage();
      });
      root.querySelector('#clearGraphSelection').addEventListener('click', () => {
        selectedGraphNode = undefined;
        renderGraphStage();
      });
      renderGraphStage();
    }

    function renderGraphStage() {
      const root = document.getElementById('graph');
      const stage = root.querySelector('#graphStage');
      const details = root.querySelector('#selectedDetails');
      const filterText = root.querySelector('#graphFilter').value.trim().toLowerCase();
      const epicFilter = root.querySelector('#graphEpic').value;
      const milestoneFilter = root.querySelector('#graphMilestone').value;
      const assigneeFilter = root.querySelector('#graphAssignee').value;
      const statusFilter = root.querySelector('#graphStatus').value;
      const healthFilter = root.querySelector('#graphHealth').value;
      const nodes = state.graph.nodes.filter(node => {
        const epic = node.epic || 'No epic';
        const milestone = node.milestone || 'No milestone';
        const assignee = node.assignee || 'Unassigned';
        const searchable = [
          node.id,
          node.title,
          node.status,
          node.assignee,
          node.epic,
          node.epicTitle,
          node.milestone
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(filterText)
          && (epicFilter === 'all' || epic === epicFilter)
          && (milestoneFilter === 'all' || milestone === milestoneFilter)
          && (assigneeFilter === 'all' || assignee === assigneeFilter)
          && (statusFilter === 'all' || node.status === statusFilter)
          && graphHealthMatches(node, healthFilter);
      });
      const nodeIds = new Set(nodes.map(node => node.id));
      const edges = state.graph.edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));

      if (nodes.length === 0) {
        stage.innerHTML = '<div class="warningList subtle">No tasks match the current graph filters.</div>';
        details.className = 'selectedDetails subtle';
        details.textContent = 'Adjust filters to bring tasks back into view.';
        return;
      }

      const layout = layoutGraph(nodes);
      const related = selectedGraphNode ? relatedGraphNodes(selectedGraphNode) : { prerequisites: new Set(), downstream: new Set() };
      const selectedVisible = selectedGraphNode && nodeIds.has(selectedGraphNode);
      const width = Math.max(920, layout.width);
      const height = Math.max(360, layout.height);

      stage.innerHTML = '<svg class="graphSvg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Task dependency graph">' +
        '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"></path></marker></defs>' +
        layout.lanes.map(lane => '<text class="epicLaneLabel" x="24" y="' + lane.y + '">' + escapeHtml(lane.label) + '</text>').join('') +
        edges.map(edge => renderGraphEdge(edge, layout.positions, related)).join('') +
        nodes.map(node => renderGraphNode(node, layout.positions.get(node.id), related, selectedVisible)).join('') +
        '</svg>';
      const svg = stage.querySelector('.graphSvg');
      svg.style.width = Math.round(width * graphZoom) + 'px';

      stage.querySelectorAll('[data-graph-node]').forEach(nodeElement => {
        nodeElement.addEventListener('click', () => {
          selectedGraphNode = nodeElement.dataset.graphNode;
          renderGraphStage();
        });
        nodeElement.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectedGraphNode = nodeElement.dataset.graphNode;
            renderGraphStage();
          }
        });
      });

      details.innerHTML = selectedVisible
        ? renderSelectedGraphDetails(state.graph.nodes.find(node => node.id === selectedGraphNode), related)
        : 'Select a task node to highlight prerequisites and downstream work.';
      details.className = selectedVisible ? 'selectedDetails' : 'selectedDetails subtle';
    }

    function graphHealthMatches(node, health) {
      if (health === 'all') return true;
      if (health === 'connected') return node.dependsOn.length > 0 || node.dependents.length > 0;
      if (health === 'isolated') return node.dependsOn.length === 0 && node.dependents.length === 0;
      if (health === 'missing') return node.missingDependencies.length > 0;
      if (health === 'critical') return node.critical;
      return true;
    }

    function renderGraphLegend() {
      return '<div class="legend" aria-label="Graph legend">' +
        '<span class="legendItem"><span class="swatch"></span>Todo</span>' +
        '<span class="legendItem"><span class="swatch progress"></span>In progress</span>' +
        '<span class="legendItem"><span class="swatch review"></span>Review</span>' +
        '<span class="legendItem"><span class="swatch done"></span>Done</span>' +
        '<span class="legendItem"><span class="swatch warning"></span>Warning</span>' +
        '<span class="legendItem">Arrows flow from prerequisite to dependent task</span>' +
      '</div>';
    }

    function layoutGraph(nodes) {
      const byEpic = new Map();
      nodes.forEach(node => {
        const epic = node.epic || 'No epic';
        if (!byEpic.has(epic)) {
          byEpic.set(epic, []);
        }
        byEpic.get(epic).push(node);
      });

      const positions = new Map();
      const lanes = [];
      let y = 36;
      const nodeWidth = 190;
      const nodeHeight = 70;
      const columnWidth = 230;
      const rowGap = 18;
      const laneGap = 54;

      Array.from(byEpic.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([epic, epicNodes]) => {
        lanes.push({ label: epic, y });
        const byLevel = new Map();
        epicNodes
          .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))
          .forEach(node => {
            if (!byLevel.has(node.level)) {
              byLevel.set(node.level, []);
            }
            byLevel.get(node.level).push(node);
          });
        const laneTop = y + 16;
        let laneHeight = nodeHeight;
        byLevel.forEach((levelNodes, level) => {
          levelNodes.forEach((node, index) => {
            const x = 36 + level * columnWidth;
            const nodeY = laneTop + index * (nodeHeight + rowGap);
            positions.set(node.id, { x, y: nodeY, width: nodeWidth, height: nodeHeight });
            laneHeight = Math.max(laneHeight, nodeY - laneTop + nodeHeight);
          });
        });
        y += laneHeight + laneGap;
      });

      const maxLevel = Math.max(0, ...nodes.map(node => node.level));
      return {
        positions,
        lanes,
        width: 72 + (maxLevel + 1) * columnWidth,
        height: y + 20
      };
    }

    function renderGraphEdge(edge, positions, related) {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) {
        return '';
      }
      const x1 = from.x + from.width;
      const y1 = from.y + from.height / 2;
      const x2 = to.x;
      const y2 = to.y + to.height / 2;
      const mid = Math.max(x1 + 34, (x1 + x2) / 2);
      const isPrereq = selectedGraphNode === edge.to || related.prerequisites.has(edge.from) && related.prerequisites.has(edge.to);
      const isDownstream = selectedGraphNode === edge.from || related.downstream.has(edge.from) && related.downstream.has(edge.to);
      const className = 'graphEdge' + (isPrereq || isDownstream ? ' related' : '') + (isDownstream ? ' downstream' : '');
      return '<path class="' + className + '" d="M' + x1 + ',' + y1 + ' C' + mid + ',' + y1 + ' ' + mid + ',' + y2 + ' ' + x2 + ',' + y2 + '" marker-end="url(#arrow)"></path>';
    }

    function renderGraphNode(node, position, related, selectedVisible) {
      if (!position) {
        return '';
      }
      const isSelected = node.id === selectedGraphNode;
      const isRelated = isSelected || related.prerequisites.has(node.id) || related.downstream.has(node.id);
      const dim = selectedVisible && !isRelated;
      const meta = [node.status, node.assignee || 'unassigned', node.milestone].filter(Boolean).join(' · ');
      return '<g tabindex="0" role="button" data-graph-node="' + escapeHtml(node.id) + '" class="graphNode ' + escapeHtml(node.status) + (isSelected ? ' selected' : '') + (dim ? ' dim' : '') + '" transform="translate(' + position.x + ' ' + position.y + ')">' +
        '<title>' + escapeHtml(node.id + ': ' + node.title) + '</title>' +
        '<rect width="' + position.width + '" height="' + position.height + '"></rect>' +
        '<text x="10" y="19" font-weight="700">' + escapeHtml(node.id) + '</text>' +
        '<text x="10" y="38">' + escapeHtml(truncate(node.title, 26)) + '</text>' +
        '<text class="metaText" x="10" y="57">' + escapeHtml(truncate(meta, 30)) + '</text>' +
        '</g>';
    }

    function relatedGraphNodes(taskId) {
      const prerequisites = new Set();
      const downstream = new Set();
      collectPrerequisites(taskId, prerequisites);
      collectDownstream(taskId, downstream);
      return { prerequisites, downstream };
    }

    function collectPrerequisites(taskId, result) {
      const node = state.graph.nodes.find(item => item.id === taskId);
      if (!node) return;
      node.dependsOn.forEach(id => {
        if (!result.has(id)) {
          result.add(id);
          collectPrerequisites(id, result);
        }
      });
    }

    function collectDownstream(taskId, result) {
      const node = state.graph.nodes.find(item => item.id === taskId);
      if (!node) return;
      node.dependents.forEach(id => {
        if (!result.has(id)) {
          result.add(id);
          collectDownstream(id, result);
        }
      });
    }

    function renderSelectedGraphDetails(node, related) {
      if (!node) {
        return '';
      }
      return '<strong>' + escapeHtml(node.id) + ': ' + escapeHtml(node.title) + '</strong>' +
        '<p class="subtle">' + escapeHtml([node.status, node.priority, node.assignee, node.epic, node.milestone, node.dueDate].filter(Boolean).join(' · ') || 'No metadata') + '</p>' +
        '<div class="pillRow"><span class="pill">Prerequisites: ' + related.prerequisites.size + '</span><span class="pill">Downstream: ' + related.downstream.size + '</span><span class="pill">Missing: ' + node.missingDependencies.length + '</span><button type="button" data-open-entity="' + escapeHtml(node.id) + '">Open file</button></div>';
    }

    function renderWarnings() {
      const missing = state.graph.missingDependencies.map(item => escapeHtml(item.taskId) + ' references ' + escapeHtml(item.dependencyId) + ' <button type="button" data-open-entity="' + escapeHtml(item.taskId) + '">Open task</button>');
      const circular = state.graph.validationWarnings.map(item => escapeHtml(item));
      const warnings = [...missing, ...circular];

      if (warnings.length === 0) {
        return '<div class="warningList subtle">No missing or circular dependency warnings.</div>';
      }

      return '<div class="warningList"><strong>Dependency warnings</strong><ul>' +
        warnings.map(item => '<li>' + item + '</li>').join('') +
        '</ul></div>';
    }

    function renderTimeline() {
      const root = document.getElementById('timeline');
      root.innerHTML = [
        '<p class="tabIntro">Scan dated work across tasks, epics, and milestones. Use the window and card density controls to reduce overlap when dates are clustered.</p>',
        '<div class="timelineTools">',
        '<input id="timelineFilter" type="search" placeholder="Filter task, milestone, or epic" aria-label="Filter timeline">',
        '<select id="timelineWindow" aria-label="Timeline window">',
        '<option value="month">Month</option>',
        '<option value="week">Week</option>',
        '<option value="quarter">Quarter</option>',
        '<option value="all">All dated work</option>',
        '</select>',
        '<select id="timelineGroup" aria-label="Group timeline items">',
        '<option value="none">No grouping</option>',
        '<option value="epic">Group by epic</option>',
        '<option value="milestone">Group by milestone</option>',
        '<option value="status">Group by status</option>',
        '<option value="assignee">Group by assignee</option>',
        '<option value="kind">Group by type</option>',
        '</select>',
        '<select id="timelineKind" aria-label="Filter timeline item type">',
        '<option value="all">All item types</option>',
        '<option value="task">Tasks</option>',
        '<option value="epic">Epics</option>',
        '<option value="milestone">Milestones</option>',
        '</select>',
        '<select id="timelineDensity" aria-label="Timeline card density">',
        '<option value="compact">Compact cards</option>',
        '<option value="detailed">Detailed cards</option>',
        '</select>',
        '<select id="healthFilter" aria-label="Filter delivery health">',
        '<option value="all">All delivery health</option>',
        '<option value="complete">Complete</option>',
        '<option value="active">Active</option>',
        '<option value="overdue">Overdue</option>',
        '<option value="undated">Undated</option>',
        '<option value="empty">No tasks</option>',
        '</select>',
        '</div>',
        '<div id="timelineDetails" class="selectedDetails subtle">Select a timeline item to inspect dates and open its PlanFS file.</div>',
        '<div id="timelineItems"></div>'
      ].join('');

      root.querySelector('#timelineFilter').addEventListener('input', renderTimelineItems);
      root.querySelector('#timelineWindow').addEventListener('change', renderTimelineItems);
      root.querySelector('#timelineGroup').addEventListener('change', renderTimelineItems);
      root.querySelector('#timelineKind').addEventListener('change', renderTimelineItems);
      root.querySelector('#timelineDensity').addEventListener('change', renderTimelineItems);
      root.querySelector('#healthFilter').addEventListener('change', renderTimelineItems);
      root.addEventListener('click', event => {
        const button = event.target.closest('[data-save-date]');
        if (button) {
          const milestoneId = button.dataset.saveDate;
          const input = root.querySelector('[data-date-for="' + milestoneId + '"]');
          vscode.postMessage({ type: 'updateMilestoneDate', milestoneId, targetDate: input.value });
        }
      });
      root.addEventListener('click', event => {
        const item = event.target.closest('[data-timeline-item]');
        if (item) {
          selectedTimelineItem = item.dataset.timelineItem;
          renderTimelineItems();
        }
      });
      renderTimelineItems();
    }

    function renderTimelineItems() {
      const root = document.getElementById('timeline');
      const timelineItems = root.querySelector('#timelineItems');
      const timelineDetails = root.querySelector('#timelineDetails');
      const filterText = root.querySelector('#timelineFilter').value.trim().toLowerCase();
      const windowValue = root.querySelector('#timelineWindow').value;
      const groupBy = root.querySelector('#timelineGroup').value;
      const kind = root.querySelector('#timelineKind').value;
      const density = root.querySelector('#timelineDensity').value;
      const health = root.querySelector('#healthFilter').value;
      const items = state.timeline.filter(item => {
        const searchable = [item.id, item.title, item.status].join(' ').toLowerCase();
        const healthMatch =
          health === 'all' ||
          item.health === health;
        return searchable.includes(filterText)
          && healthMatch
          && (kind === 'all' || item.kind === kind)
          && timelineWindowMatches(item, windowValue);
      });

      timelineItems.innerHTML = renderGroupedTimeAxis(items, groupBy, density);
      const selected = state.timeline.find(item => item.id === selectedTimelineItem);
      timelineDetails.innerHTML = selected
        ? renderTimelineDetails(selected)
        : 'Select a timeline item to inspect dates and open its PlanFS file.';
      timelineDetails.className = selected ? 'selectedDetails' : 'selectedDetails subtle';
    }

    function renderGroupedTimeAxis(items, groupBy, density) {
      if (groupBy === 'none') {
        return renderTimeAxis(items, density);
      }

      const groups = new Map();
      items.forEach(item => {
        const key = timelineGroupKey(item, groupBy);
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(item);
      });

      return Array.from(groups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([group, groupItems]) => '<section class="timelineGroup"><h2>' + escapeHtml(group) + '</h2>' + renderTimeAxis(groupItems, density) + '</section>')
        .join('');
    }

    function timelineGroupKey(item, groupBy) {
      if (groupBy === 'epic') return item.epic || 'No epic';
      if (groupBy === 'milestone') return item.milestone || 'No milestone';
      if (groupBy === 'status') return item.status || 'No status';
      if (groupBy === 'assignee') return item.assignee || 'Unassigned';
      if (groupBy === 'kind') return item.kind;
      return 'Timeline';
    }

    function timelineWindowMatches(item, windowValue) {
      if (windowValue === 'all' || !item.date) {
        return true;
      }

      const time = new Date(item.date).getTime();
      if (!Number.isFinite(time)) {
        return true;
      }

      const now = Date.now();
      const day = 1000 * 60 * 60 * 24;
      const windows = {
        week: 7 * day,
        month: 31 * day,
        quarter: 92 * day
      };
      const size = windows[windowValue] || windows.month;
      return time >= now - size && time <= now + size;
    }

    function renderTimeAxis(items, density) {
      if (items.length === 0) {
        return '<div class="warningList subtle">No timeline items match the current filters.</div>';
      }

      const dated = items
        .filter(item => item.date)
        .map(item => ({ ...item, time: new Date(item.date).getTime() }))
        .filter(item => Number.isFinite(item.time));
      const undated = items.filter(item => !item.date);
      const now = Date.now();
      const times = dated.map(item => item.time);
      const min = Math.min(now - 1000 * 60 * 60 * 24 * 14, ...times);
      const max = Math.max(now + 1000 * 60 * 60 * 24 * 45, ...times);
      const span = Math.max(1, max - min);
      const positioned = positionTimelineItems(dated, min, span, density);
      const nowX = 4 + ((now - min) / span) * 92;
      const ticks = createTicks(min, max);
      const canvasHeight = Math.max(340, ...positioned.map(item => item.y + (density === 'compact' ? 38 : 82))) + 24;
      const nowHeight = Math.max(318, canvasHeight - 22);
      const nowLabelTop = nowHeight + 4;

      return '<div class="timelineAxis"><div class="timelineCanvas" style="height:' + canvasHeight + 'px">' +
        '<div class="axisLine"></div>' +
        '<div class="nowLine" style="left:' + nowX + '%; height:' + nowHeight + 'px"></div><div class="nowLabel" style="left:' + nowX + '%; top:' + nowLabelTop + 'px">now</div>' +
        ticks.map(tick => '<div class="tick" style="left:' + tick.x + '%"><span>' + escapeHtml(tick.label) + '</span></div>').join('') +
        positioned.map(item => renderTimelineCard(item, density)).join('') +
        '</div></div>' +
        (undated.length > 0 ? '<div class="undatedRail">' + undated.map(renderUndatedTimelineItem).join('') + '</div>' : '');
    }

    function positionTimelineItems(items, min, span, density) {
      const laneHeight = density === 'compact' ? 38 : 56;
      const itemWidth = density === 'compact' ? 10 : 14;
      const lanes = { past: [], future: [] };
      return items
        .slice()
        .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
        .map(item => {
          const x = 4 + ((item.time - min) / span) * 92;
          const side = item.time < Date.now() ? 'past' : 'future';
          const laneIndex = firstAvailableLane(lanes[side], x, itemWidth);
          lanes[side][laneIndex] = x + itemWidth;
          return {
            ...item,
            x,
            y: side === 'past'
              ? 22 + laneIndex * laneHeight
              : 188 + laneIndex * laneHeight
          };
        });
    }

    function firstAvailableLane(lanes, x, width) {
      for (let index = 0; index < lanes.length; index += 1) {
        if (x >= lanes[index]) {
          return index;
        }
      }
      return lanes.length;
    }

    function renderTimelineCard(item, density) {
      return '<button type="button" title="' + escapeHtml(item.id + ': ' + item.title) + '" data-timeline-item="' + escapeHtml(item.id) + '" class="timelineItem ' + density + ' ' + item.kind + ' ' + item.health + (selectedTimelineItem === item.id ? ' selected' : '') + '" style="left:' + item.x + '%; top:' + item.y + 'px">' +
        '<div class="nodeHead"><span>' + escapeHtml(item.id) + '</span><span class="lane">' + escapeHtml(item.kind) + '</span></div>' +
        '<div class="timelineTitle">' + escapeHtml(item.title) + '</div>' +
        '<div class="subtle timelineDate">' + escapeHtml(toDateInput(item.date)) + ' · ' + escapeHtml(item.status) + '</div>' +
        renderTimelineProgress(item) +
      '</button>';
    }

    function renderUndatedTimelineItem(item) {
      return '<button type="button" data-timeline-item="' + escapeHtml(item.id) + '" class="milestone timelineItemStatic">' +
        '<div class="nodeHead"><span>' + escapeHtml(item.id) + '</span><span class="lane">' + escapeHtml(item.kind) + ' · undated</span></div>' +
        '<div class="nodeTitle">' + escapeHtml(item.title) + '</div>' +
        '<div class="subtle">' + escapeHtml(item.status) + '</div>' +
      '</button>';
    }

    function renderTimelineDetails(item) {
      return '<strong>' + escapeHtml(item.id) + ': ' + escapeHtml(item.title) + '</strong>' +
        '<p class="subtle">' + escapeHtml([item.kind, item.status, item.health, item.date, item.assignee, item.epic, item.milestone].filter(Boolean).join(' · ')) + '</p>' +
        '<button type="button" data-open-entity="' + escapeHtml(item.id) + '">Open file</button>';
    }

    function renderTimelineProgress(item) {
      if (typeof item.percentDone !== 'number') {
        return '';
      }
      return '<div class="bar"><div class="fill" style="width:' + item.percentDone + '%"></div></div>' +
        '<div class="subtle timelineProgress">' + item.done + ' of ' + item.total + ' tasks done · ' + item.percentDone + '%</div>' +
        (item.kind === 'milestone'
          ? '<div class="row" style="margin-top:8px"><input type="date" data-date-for="' + escapeHtml(item.id) + '" value="' + escapeHtml(toDateInput(item.date)) + '"><button data-save-date="' + escapeHtml(item.id) + '">Save date</button></div>'
          : '');
    }

    function createTicks(min, max) {
      const count = 6;
      return Array.from({ length: count }, (_, index) => {
        const time = min + ((max - min) / (count - 1)) * index;
        return {
          x: 4 + ((time - min) / (max - min)) * 92,
          label: new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        };
      });
    }

    function renderReports() {
      const root = document.getElementById('reports');
      root.innerHTML = [
        '<p class="tabIntro">Review progress, workload, and risk summaries, then export the current planning snapshot for sharing or deeper analysis.</p>',
        '<div class="row" style="margin-bottom:12px">',
        '<button data-export="json">Export JSON</button>',
        '<button data-export="csv">Export CSV</button>',
        '<button data-export="markdown">Export Markdown</button>',
        '</div>',
        '<div class="reportGrid">',
        renderEpicReport(),
        renderWorkloadReport(),
        renderBlockedReport(),
        '</div>'
      ].join('');

      root.querySelectorAll('[data-export]').forEach(button => {
        button.addEventListener('click', () => {
          const format = button.dataset.export;
          vscode.postMessage({ type: 'exportReport', format, content: state.exports[format] });
        });
      });
    }

    function renderEpicReport() {
      return '<article class="card"><h2>Epic Completion</h2><table><thead><tr><th>Epic</th><th>Done</th><th>Total</th><th>%</th></tr></thead><tbody>' +
        state.reports.epicCompletion.map(item => '<tr><td>' + escapeHtml(item.epicId) + '</td><td>' + item.done + '</td><td>' + item.total + '</td><td>' + item.percentDone + '%</td></tr>').join('') +
        '</tbody></table></article>';
    }

    function renderWorkloadReport() {
      return '<article class="card"><h2>Workload</h2><table><thead><tr><th>Assignee</th><th>Todo</th><th>Doing</th><th>Done</th></tr></thead><tbody>' +
        state.reports.workload.map(item => '<tr><td>' + escapeHtml(item.assignee) + '</td><td>' + item.byStatus.todo + '</td><td>' + item.byStatus['in-progress'] + '</td><td>' + item.byStatus.done + '</td></tr>').join('') +
        '</tbody></table></article>';
    }

    function renderBlockedReport() {
      const rows = state.reports.blockedTasks.length === 0
        ? '<tr><td colspan="2" class="subtle">No missing dependencies.</td></tr>'
        : state.reports.blockedTasks.map(item => '<tr><td>' + escapeHtml(item.id) + '</td><td>' + escapeHtml(item.missingDependencies.join(', ')) + '</td></tr>').join('');
      return '<article class="card"><h2>Blocked Work</h2><table><thead><tr><th>Task</th><th>Missing</th></tr></thead><tbody>' + rows + '</tbody></table></article>';
    }

    function renderBranch() {
      const root = document.getElementById('branch');
      const branch = state.branch;

      if (!branch.available) {
        root.innerHTML = '<p class="tabIntro">Compare the current Git branch with the planning state so pull request work stays connected to tracked tasks.</p><article class="card"><h2>Branch Context</h2><p class="subtle">Branch context is unavailable.</p><p class="subtle">' + escapeHtml(branch.message || 'No Git comparison could be loaded.') + '</p></article>';
        return;
      }

      root.innerHTML = [
        '<p class="tabIntro">Compare the current Git branch with the planning state so pull request work stays connected to tracked tasks.</p>',
        renderMetrics([
          ['Changed Files', branch.changedFiles.length],
          ['Added Tasks', branch.addedTasks.length],
          ['Modified Tasks', branch.modifiedTasks.length],
          ['Conflicts', branch.conflicts.length]
        ]),
        '<div class="branchGrid">',
        '<article class="card">',
        '<h2>Current Branch</h2>',
        '<p><strong>' + escapeHtml(branch.currentBranch) + '</strong></p>',
        '<p class="subtle">Compared with ' + escapeHtml(branch.comparisonRef || branch.baseRef || 'base') + '</p>',
        '<h3>Related Tasks</h3>',
        renderPills(branch.relatedTaskIds),
        '<h3>PR Preview</h3>',
        '<p><strong>' + escapeHtml(branch.pullRequestPreview?.title || branch.currentBranch) + '</strong></p>',
        '<p class="subtle">' + escapeHtml(branch.pullRequestPreview?.summary || 'No PlanFS task changes detected.') + '</p>',
        '</article>',
        '<article class="card">',
        '<h2>Changed PlanFS Files</h2>',
        renderChangedFiles(branch.changedFiles),
        '</article>',
        '</div>',
        '<div class="reportGrid" style="margin-top:12px">',
        renderBranchTasks('Added Tasks', branch.addedTasks),
        renderBranchTasks('Modified Tasks', branch.modifiedTasks),
        renderBranchConflicts(branch.conflicts),
        '</div>'
      ].join('');
    }

    function renderPills(values) {
      if (!values || values.length === 0) {
        return '<p class="subtle">No related task IDs detected.</p>';
      }

      return '<div class="pillRow">' + values.map(value => '<span class="pill">' + escapeHtml(value) + '</span>').join('') + '</div>';
    }

    function renderChangedFiles(files) {
      if (!files || files.length === 0) {
        return '<p class="subtle">No PlanFS files changed against the base ref.</p>';
      }

      return '<div class="fileList">' + files.map(file =>
        '<div class="fileRow"><span class="pill">' + escapeHtml(file.status) + '</span><span class="filePath">' + escapeHtml(file.path) + '</span></div>'
      ).join('') + '</div>';
    }

    function renderBranchTasks(title, tasks) {
      const rows = !tasks || tasks.length === 0
        ? '<tr><td colspan="3" class="subtle">None.</td></tr>'
        : tasks.map(task => {
          const previous = task.previous ? escapeHtml(task.previous.status + ' -> ' + task.status) : escapeHtml(task.status);
          return '<tr><td>' + escapeHtml(task.id) + '</td><td>' + escapeHtml(task.title) + '</td><td>' + previous + '</td></tr>';
        }).join('');
      return '<article class="card"><h2>' + escapeHtml(title) + '</h2><table><thead><tr><th>Task</th><th>Title</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></article>';
    }

    function renderBranchConflicts(conflicts) {
      const rows = !conflicts || conflicts.length === 0
        ? '<tr><td colspan="3" class="subtle">No PlanFS conflicts detected.</td></tr>'
        : conflicts.map(conflict => '<tr><td>' + escapeHtml(conflict.status) + '</td><td>' + escapeHtml(conflict.path) + '</td><td>' + escapeHtml(conflict.suggestion) + '</td></tr>').join('');
      return '<article class="card"><h2>Conflicts</h2><table><thead><tr><th>Status</th><th>File</th><th>Suggestion</th></tr></thead><tbody>' + rows + '</tbody></table></article>';
    }

    function renderMetrics(items) {
      return '<div class="metrics">' + items.map(item => '<div class="metric"><strong>' + item[1] + '</strong><span class="subtle">' + escapeHtml(item[0]) + '</span></div>').join('') + '</div>';
    }

    function unique(values) {
      return Array.from(new Set(values));
    }

    function truncate(value, length) {
      const text = String(value || '');
      return text.length > length ? text.slice(0, length - 1) + '…' : text;
    }

    function toDateInput(value) {
      return String(value || '').slice(0, 10);
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
