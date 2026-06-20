/**
 * Backlog management webview provider.
 */

import * as vscode from 'vscode';
import {
  createTaskTemplate,
  getNextTaskId,
  listBacklogTasks,
  loadRepository,
  loadSavedFilters,
  RefinementState,
  reviewBacklog,
  saveEntity,
  TaskPriority,
  validateRepositoryState
} from 'planfs-core';
import { getPlanFSWorkspaceFolder } from './workspace';

const REFINEMENT_STATES: RefinementState[] = [
  'captured',
  'needs-refinement',
  'ready',
  'deferred',
  'discarded'
];

export class BacklogProvider {
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
      'planfsBacklog',
      'PlanFS Backlog',
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
      if (message?.type === 'captureBacklogItem') {
        await this.captureBacklogItem(String(message.title ?? ''));
      }
      if (message?.type === 'updateRefinementState') {
        await this.updateRefinementState(
          String(message.taskId),
          message.refinementState as RefinementState
        );
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
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder || !this.panel) {
      return;
    }

    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const savedFilters = await loadSavedFilters(workspaceFolder.uri.fsPath);
    const reviewItems = reviewBacklog(repository);
    const reviewIds = new Set(reviewItems.map(item => item.task.id));
    const tasks = listBacklogTasks(repository, { includeDone: true }).map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      refinementState: task.refinementState ?? 'ready',
      priority: task.priority,
      assignee: task.assignee,
      epic: task.epic,
      milestone: task.milestone,
      tags: task.tags,
      dueDate: task.dueDate,
      body: task.body,
      needsReview: reviewIds.has(task.id)
    }));

    this.panel.webview.html = renderBacklogHtml({
      tasks,
      savedFilters: savedFilters.map(filter => ({
        id: filter.id,
        name: filter.name,
        criteria: filter.criteria
      }))
    });
  }

  private async captureBacklogItem(title: string): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }
    if (!title.trim()) {
      vscode.window.showErrorMessage('Backlog item title is required.');
      return;
    }

    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const task = createTaskTemplate(getNextTaskId(repository), title.trim());
    task.refinementState = 'captured';
    await saveEntity(workspaceFolder.uri.fsPath, task);
    await this.render();
  }

  private async updateRefinementState(taskId: string, refinementState: RefinementState): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder || !REFINEMENT_STATES.includes(refinementState)) {
      return;
    }

    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const task = repository.tasks.get(taskId);
    if (!task) {
      vscode.window.showErrorMessage(`Task not found: ${taskId}`);
      return;
    }

    task.refinementState = refinementState;
    task.updatedAt = new Date().toISOString();
    const validationRepository = {
      ...repository,
      tasks: new Map(repository.tasks).set(task.id, task)
    };
    const errors = validateRepositoryState(validationRepository).errors.filter(error => error.severity === 'error');
    if (errors.length > 0) {
      vscode.window.showErrorMessage(`Backlog update blocked by validation: ${errors[0].message}`);
      return;
    }

    await saveEntity(workspaceFolder.uri.fsPath, task);
    await this.render();
  }
}

interface BacklogHtmlPayload {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    refinementState: RefinementState;
    priority?: TaskPriority;
    assignee?: string;
    epic?: string;
    milestone?: string;
    tags?: string[];
    dueDate?: string;
    body: string;
    needsReview: boolean;
  }>;
  savedFilters: Array<{
    id: string;
    name: string;
    criteria: {
      status?: string | string[];
      assignee?: string;
      epic?: string;
      milestone?: string;
      priority?: string;
      refinementState?: string;
      tags?: string[];
    };
  }>;
}

function renderBacklogHtml(payload: BacklogHtmlPayload): string {
  const json = escapeScriptJson(JSON.stringify(payload));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlanFS Backlog</title>
  <style>
    body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); }
    .toolbar { display: flex; gap: 8px; align-items: center; padding: 12px; border-bottom: 1px solid var(--vscode-panel-border); flex-wrap: wrap; }
    input, select, button { color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); padding: 6px 8px; border-radius: 4px; }
    button { cursor: pointer; color: var(--vscode-button-foreground); background: var(--vscode-button-background); border-color: var(--vscode-button-background); }
    main { padding: 12px; }
    .swimlane { margin-bottom: 20px; }
    .swimlane h2 { font-size: 14px; margin: 0 0 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
    .card { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 10px; background: var(--vscode-editorWidget-background); }
    .card.review { border-color: var(--vscode-editorWarning-foreground); }
    .title { font-weight: 600; margin-bottom: 6px; }
    .meta { color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.5; }
    .empty { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <div class="toolbar">
    <input id="captureTitle" type="text" placeholder="Capture backlog item" aria-label="Capture backlog item">
    <button type="button" id="capture">Capture</button>
    <input id="filter" type="search" placeholder="Filter backlog" aria-label="Filter backlog">
    <select id="savedFilter" aria-label="Saved filter"></select>
    <select id="groupBy" aria-label="Group backlog">
      <option value="refinementState">Group by refinement</option>
      <option value="epic">Group by epic</option>
      <option value="milestone">Group by milestone</option>
      <option value="assignee">Group by assignee</option>
      <option value="priority">Group by priority</option>
    </select>
  </div>
  <main id="content"></main>
  <script>
    const vscode = acquireVsCodeApi();
    const payload = ${json};
    let query = '';
    let savedFilterId = '';
    let groupBy = 'refinementState';
    const content = document.getElementById('content');
    const filter = document.getElementById('filter');
    const savedFilter = document.getElementById('savedFilter');
    const groupByInput = document.getElementById('groupBy');

    savedFilter.innerHTML = '<option value="">All backlog</option>' + payload.savedFilters.map(filter => '<option value="' + escapeHtml(filter.id) + '">' + escapeHtml(filter.name) + '</option>').join('');

    document.getElementById('capture').addEventListener('click', () => {
      const input = document.getElementById('captureTitle');
      vscode.postMessage({ type: 'captureBacklogItem', title: input.value });
      input.value = '';
    });
    filter.addEventListener('input', () => { query = filter.value.toLowerCase(); render(); });
    savedFilter.addEventListener('change', () => { savedFilterId = savedFilter.value; render(); });
    groupByInput.addEventListener('change', () => { groupBy = groupByInput.value; render(); });

    function render() {
      const saved = payload.savedFilters.find(filter => filter.id === savedFilterId);
      const visible = payload.tasks.filter(task => matchesQuery(task) && matchesSavedFilter(task, saved?.criteria || {}));
      const groups = new Map();
      for (const task of visible) {
        const key = task[groupBy] || 'None';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(task);
      }
      if (visible.length === 0) {
        content.innerHTML = '<p class="empty">No backlog items found</p>';
        return;
      }
      content.innerHTML = Array.from(groups.entries()).map(([name, tasks]) => '<section class="swimlane"><h2>' + escapeHtml(name) + ' (' + tasks.length + ')</h2><div class="grid">' + tasks.map(renderCard).join('') + '</div></section>').join('');
      content.querySelectorAll('[data-state]').forEach(select => {
        select.addEventListener('change', () => {
          vscode.postMessage({ type: 'updateRefinementState', taskId: select.dataset.taskId, refinementState: select.value });
        });
      });
    }

    function renderCard(task) {
      return '<article class="card ' + (task.needsReview ? 'review' : '') + '">' +
        '<div class="title">' + escapeHtml(task.id) + ' ' + escapeHtml(task.title) + '</div>' +
        '<div class="meta">' + [task.status, task.priority || 'no priority', task.assignee ? '@' + task.assignee : 'unassigned', task.epic, task.milestone, task.dueDate ? 'due ' + task.dueDate : ''].filter(Boolean).map(escapeHtml).join(' | ') + '</div>' +
        '<select data-state data-task-id="' + escapeHtml(task.id) + '">' + ${JSON.stringify(REFINEMENT_STATES)}.map(state => '<option value="' + state + '"' + (state === task.refinementState ? ' selected' : '') + '>' + state + '</option>').join('') + '</select>' +
        (task.needsReview ? '<div class="meta">Needs review</div>' : '') +
      '</article>';
    }

    function matchesQuery(task) {
      if (!query) return true;
      return [task.id, task.title, task.status, task.refinementState, task.priority, task.assignee, task.epic, task.milestone, (task.tags || []).join(' '), task.body].filter(Boolean).join(' ').toLowerCase().includes(query);
    }

    function matchesSavedFilter(task, criteria) {
      if (criteria.status && !(Array.isArray(criteria.status) ? criteria.status.includes(task.status) : task.status === criteria.status)) return false;
      if (criteria.assignee && task.assignee !== criteria.assignee) return false;
      if (criteria.epic && task.epic !== criteria.epic) return false;
      if (criteria.milestone && task.milestone !== criteria.milestone) return false;
      if (criteria.priority && task.priority !== criteria.priority) return false;
      if (criteria.refinementState && task.refinementState !== criteria.refinementState) return false;
      if (criteria.tags && !criteria.tags.every(tag => (task.tags || []).includes(tag))) return false;
      return true;
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    render();
  </script>
</body>
</html>`;
}

function escapeScriptJson(json: string): string {
  return json.replace(/</g, '\\u003c');
}
