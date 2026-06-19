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
      missingDependencies: string[];
    }>;
    edges: Array<{ from: string; to: string }>;
    criticalPath: string[];
    missingDependencies: Array<{ taskId: string; dependencyId: string }>;
    validationWarnings: string[];
  };
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
        missingDependencies: node.missingDependencies
      })),
      edges: graph.edges,
      criticalPath: graph.criticalPath,
      missingDependencies: graph.missingDependencies,
      validationWarnings: validation.errors
        .filter(error => error.message.toLowerCase().includes('circular'))
        .map(error => error.message)
    },
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

    .graph {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 12px;
      align-items: start;
    }

    .node {
      padding: 10px;
      border-left: 4px solid var(--todo);
    }

    .node.in-progress {
      border-left-color: var(--progress);
    }

    .node.review {
      border-left-color: var(--review);
    }

    .node.done {
      border-left-color: var(--done);
    }

    .node.critical {
      box-shadow: inset 0 0 0 1px var(--critical);
    }

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

    .edgeList,
    .warningList {
      margin-top: 16px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
    }

    .timeline {
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }

    .timelineTools {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .timelineTools input {
      min-width: 220px;
      flex: 1 1 260px;
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
      <button class="tab active" data-tab="graph">Dependency Graph</button>
      <button class="tab" data-tab="timeline">Timeline</button>
      <button class="tab" data-tab="reports">Reports</button>
      <button class="tab" data-tab="branch">Branch</button>
    </nav>

    <section id="graph" class="panel active"></section>
    <section id="timeline" class="panel"></section>
    <section id="reports" class="panel"></section>
    <section id="branch" class="panel"></section>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = ${JSON.stringify(payload)};
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');

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

    function renderGraph() {
      const root = document.getElementById('graph');
      root.innerHTML = [
        renderMetrics([
          ['Tasks', state.graph.nodes.length],
          ['Dependencies', state.graph.edges.length],
          ['Critical Path', state.graph.criticalPath.length],
          ['Missing Deps', state.graph.missingDependencies.length]
        ]),
        '<div class="graph">' + state.graph.nodes.map(renderNode).join('') + '</div>',
        renderEdges(),
        renderWarnings()
      ].join('');
    }

    function renderNode(node) {
      return '<article class="node ' + node.status + (node.critical ? ' critical' : '') + '">' +
        '<div class="nodeHead"><span>' + escapeHtml(node.id) + '</span><span class="lane">Level ' + node.level + '</span></div>' +
        '<div class="nodeTitle">' + escapeHtml(node.title) + '</div>' +
        '<div class="subtle">' + escapeHtml(node.status) + (node.critical ? ' · critical path' : '') + '</div>' +
      '</article>';
    }

    function renderEdges() {
      if (state.graph.edges.length === 0) {
        return '<div class="edgeList subtle">No task dependencies yet.</div>';
      }

      return '<div class="edgeList"><strong>Edges</strong><ul>' +
        state.graph.edges.map(edge => '<li>' + escapeHtml(edge.from) + ' → ' + escapeHtml(edge.to) + '</li>').join('') +
        '</ul></div>';
    }

    function renderWarnings() {
      const missing = state.graph.missingDependencies.map(item => escapeHtml(item.taskId) + ' references ' + escapeHtml(item.dependencyId));
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
        '<div class="timelineTools">',
        '<input id="timelineFilter" type="search" placeholder="Filter milestone or epic" aria-label="Filter timeline">',
        '<select id="healthFilter" aria-label="Filter delivery health">',
        '<option value="all">All delivery health</option>',
        '<option value="complete">Complete</option>',
        '<option value="active">Active</option>',
        '<option value="empty">No tasks</option>',
        '</select>',
        '</div>',
        '<div id="timelineItems" class="timeline"></div>'
      ].join('');

      root.querySelector('#timelineFilter').addEventListener('input', renderTimelineItems);
      root.querySelector('#healthFilter').addEventListener('change', renderTimelineItems);
      renderTimelineItems();

      root.querySelectorAll('[data-save-date]').forEach(button => {
        button.addEventListener('click', () => {
          const milestoneId = button.dataset.saveDate;
          const input = root.querySelector('[data-date-for="' + milestoneId + '"]');
          vscode.postMessage({ type: 'updateMilestoneDate', milestoneId, targetDate: input.value });
        });
      });
    }

    function renderTimelineItems() {
      const root = document.getElementById('timeline');
      const timelineItems = root.querySelector('#timelineItems');
      const filterText = root.querySelector('#timelineFilter').value.trim().toLowerCase();
      const health = root.querySelector('#healthFilter').value;
      const items = [
        ...state.milestones.map(item => ({ ...item, kind: 'milestone' })),
        ...state.epics.map(item => ({ ...item, kind: 'epic' }))
      ].filter(item => {
        const searchable = [item.id, item.title, item.status].join(' ').toLowerCase();
        const healthMatch =
          health === 'all' ||
          (health === 'complete' && item.percentDone === 100) ||
          (health === 'active' && item.total > 0 && item.percentDone < 100) ||
          (health === 'empty' && item.total === 0);
        return searchable.includes(filterText) && healthMatch;
      });

      timelineItems.innerHTML = items
        .map(item => item.kind === 'milestone' ? renderMilestone(item) : renderEpic(item))
        .join('');
    }

    function renderMilestone(milestone) {
      return '<article class="milestone">' +
        '<div class="nodeHead"><span>' + escapeHtml(milestone.id) + '</span><span class="lane">' + escapeHtml(milestone.status) + '</span></div>' +
        '<div class="nodeTitle">' + escapeHtml(milestone.title) + '</div>' +
        '<div class="bar"><div class="fill" style="width:' + milestone.percentDone + '%"></div></div>' +
        '<div class="subtle">' + milestone.done + ' of ' + milestone.total + ' tasks done · ' + milestone.percentDone + '%</div>' +
        '<div class="row" style="margin-top:10px">' +
          '<input type="date" data-date-for="' + escapeHtml(milestone.id) + '" value="' + escapeHtml(toDateInput(milestone.targetDate)) + '">' +
          '<button data-save-date="' + escapeHtml(milestone.id) + '">Save date</button>' +
        '</div>' +
      '</article>';
    }

    function renderEpic(epic) {
      return '<article class="milestone">' +
        '<div class="nodeHead"><span>' + escapeHtml(epic.id) + '</span><span class="lane">epic · ' + escapeHtml(epic.status) + '</span></div>' +
        '<div class="nodeTitle">' + escapeHtml(epic.title) + '</div>' +
        '<div class="bar"><div class="fill" style="width:' + epic.percentDone + '%"></div></div>' +
        '<div class="subtle">' + epic.done + ' of ' + epic.total + ' tasks done · ' + epic.percentDone + '%</div>' +
        '<div class="subtle">Target: ' + escapeHtml(epic.targetDate || 'not set') + '</div>' +
      '</article>';
    }

    function renderReports() {
      const root = document.getElementById('reports');
      root.innerHTML = [
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
        root.innerHTML = '<article class="card"><h2>Branch Context</h2><p class="subtle">Branch context is unavailable.</p><p class="subtle">' + escapeHtml(branch.message || 'No Git comparison could be loaded.') + '</p></article>';
        return;
      }

      root.innerHTML = [
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
