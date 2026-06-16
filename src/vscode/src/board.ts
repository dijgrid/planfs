/**
 * Kanban board webview provider
 */

import * as vscode from 'vscode';
import {
  loadRepository,
  loadSavedFilters,
  SavedFilter,
  saveEntity,
  Task,
  TaskStatus
} from 'planfs-core';

const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

interface BoardTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority?: string;
  assignee?: string;
  epic?: string;
  milestone?: string;
  tags?: string[];
  metadata: Record<string, unknown>;
  body: string;
}

export class BoardProvider {
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  async open(): Promise<void> {
    const workspaceFolder = getWorkspaceFolder();
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
      'planfsBoard',
      'PlanFS Board',
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
      if (message?.type === 'updateTaskStatus') {
        await this.updateTaskStatus(
          String(message.taskId),
          message.status as TaskStatus
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
    if (!this.panel) {
      return;
    }

    const workspaceFolder = getWorkspaceFolder();
    if (!workspaceFolder) {
      this.panel.webview.html = renderMessage('No workspace folder open');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const tasks = Array.from(repository.tasks.values()).map(toBoardTask);
      const savedFilters = await loadSavedFilters(workspaceFolder.uri.fsPath);

      this.panel.webview.html = renderBoard(this.panel.webview, tasks, savedFilters);
    } catch (error) {
      this.panel.webview.html = renderMessage(
        `Failed to load PlanFS board: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async updateTaskStatus(
    taskId: string,
    status: TaskStatus
  ): Promise<void> {
    if (!TASK_STATUSES.includes(status)) {
      vscode.window.showErrorMessage(`Invalid task status: ${status}`);
      return;
    }

    const workspaceFolder = getWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const task = repository.tasks.get(taskId);

      if (!task) {
        vscode.window.showErrorMessage(`Task not found: ${taskId}`);
        return;
      }

      if (task.status !== status) {
        task.status = status;
        task.updatedAt = new Date().toISOString();
        await saveEntity(workspaceFolder.uri.fsPath, task);
      }

      await this.render();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to update task: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.render();
    }
  }
}

function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

function toBoardTask(task: Task): BoardTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee,
    epic: task.epic,
    milestone: task.milestone,
    tags: task.tags,
    metadata: task.metadata,
    body: task.body
  };
}

function renderMessage(message: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlanFS Board</title>
</head>
<body>
  <p>${escapeHtml(message)}</p>
</body>
</html>`;
}

function toBoardSavedFilter(filter: SavedFilter): SavedFilter {
  return {
    id: filter.id,
    name: filter.name,
    description: filter.description,
    criteria: filter.criteria
  };
}

function renderBoard(
  webview: vscode.Webview,
  tasks: BoardTask[],
  savedFilters: SavedFilter[]
): string {
  const nonce = getNonce();
  const payload = JSON.stringify({
    tasks,
    statuses: TASK_STATUSES,
    savedFilters: savedFilters.map(toBoardSavedFilter)
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>PlanFS Board</title>
  <style>
    :root {
      color-scheme: light dark;
      --gap: 12px;
      --column-width: minmax(220px, 1fr);
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
      align-items: end;
      gap: 16px;
      margin-bottom: 14px;
    }

    h1 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 650;
    }

    .subtle {
      color: var(--muted);
    }

    .toolbar {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    input,
    select {
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 3px;
      padding: 6px 8px;
      min-height: 28px;
    }

    input {
      min-width: 240px;
      flex: 1 1 260px;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(4, var(--column-width));
      gap: var(--gap);
      align-items: start;
      min-width: 920px;
    }

    .column {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 6px;
      min-height: 220px;
      overflow: hidden;
    }

    .columnHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 11px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--panel-strong);
      font-weight: 600;
      text-transform: capitalize;
    }

    .count {
      color: var(--muted);
      font-weight: 400;
    }

    .dropzone {
      min-height: 180px;
      padding: 10px;
    }

    .dropzone.dragOver {
      outline: 2px solid var(--accent);
      outline-offset: -2px;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }

    .card {
      cursor: grab;
      border: 1px solid var(--border);
      border-left: 4px solid var(--todo);
      background: var(--bg);
      padding: 11px;
      margin-bottom: 9px;
      border-radius: 4px;
      box-shadow: 0 1px 2px color-mix(in srgb, #000 16%, transparent);
    }

    .card.in-progress {
      border-left-color: var(--progress);
    }

    .card.review {
      border-left-color: var(--review);
    }

    .card.done {
      border-left-color: var(--done);
    }

    .card:active {
      cursor: grabbing;
    }

    .cardId {
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 5px;
    }

    .cardTitle {
      font-weight: 600;
      line-height: 1.35;
      margin-bottom: 8px;
      overflow-wrap: anywhere;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .badge {
      border: 1px solid var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 11px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      color: var(--muted);
      font-style: italic;
      padding: 10px 0;
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="header">
      <div>
        <h1>PlanFS Board</h1>
        <div class="subtle">Drag cards between statuses. Changes are saved to .planfs task files.</div>
      </div>
    </header>
    <div class="toolbar">
      <input id="filter" type="search" placeholder="Filter by ID, title, assignee, epic, milestone, or tag" aria-label="Filter tasks">
      <select id="savedFilter" aria-label="Saved filter">
        <option value="">All tasks</option>
      </select>
      <select id="sort" aria-label="Sort tasks">
        <option value="id">Sort by ID</option>
        <option value="title">Sort by title</option>
        <option value="priority">Sort by priority</option>
        <option value="assignee">Sort by assignee</option>
      </select>
    </div>
    <main id="board" class="board"></main>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = ${payload};
    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const labels = {
      todo: 'Todo',
      'in-progress': 'In Progress',
      review: 'Review',
      done: 'Done'
    };

    const filterInput = document.getElementById('filter');
    const savedFilterInput = document.getElementById('savedFilter');
    const sortInput = document.getElementById('sort');
    const board = document.getElementById('board');

    savedFilterInput.append(...state.savedFilters.map(filter => {
      const option = document.createElement('option');
      option.value = filter.id;
      option.textContent = filter.name;
      return option;
    }));

    filterInput.addEventListener('input', render);
    savedFilterInput.addEventListener('change', render);
    sortInput.addEventListener('change', render);

    function render() {
      const filterText = filterInput.value.trim().toLowerCase();
      const savedFilter = state.savedFilters.find(filter => filter.id === savedFilterInput.value);
      const sortKey = sortInput.value;
      const filtered = state.tasks
        .filter(task => matchesSavedFilter(task, savedFilter?.criteria))
        .filter(task => matchesFilter(task, filterText))
        .sort((a, b) => compareTasks(a, b, sortKey));

      board.replaceChildren(...state.statuses.map(status => renderColumn(status, filtered)));
    }

    function matchesFilter(task, filterText) {
      if (!filterText) {
        return true;
      }

      const searchable = [
        task.id,
        task.title,
        task.priority,
        task.assignee,
        task.epic,
        task.milestone,
        JSON.stringify(task.metadata),
        task.body,
        ...(task.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(filterText);
    }

    function matchesSavedFilter(task, criteria) {
      if (!criteria) {
        return true;
      }

      if (criteria.query && !matchesFilter(task, String(criteria.query).toLowerCase())) {
        return false;
      }

      if (criteria.status && task.status !== criteria.status) {
        return false;
      }

      if (criteria.assignee && task.assignee !== criteria.assignee) {
        return false;
      }

      if (criteria.epic && task.epic !== criteria.epic) {
        return false;
      }

      if (criteria.priority && task.priority !== criteria.priority) {
        return false;
      }

      if (Array.isArray(criteria.tags) && criteria.tags.length > 0) {
        const tags = new Set(task.tags || []);
        return criteria.tags.every(tag => tags.has(tag));
      }

      return true;
    }

    function compareTasks(a, b, sortKey) {
      if (sortKey === 'priority') {
        return (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99) || a.id.localeCompare(b.id);
      }

      return String(a[sortKey] || '').localeCompare(String(b[sortKey] || '')) || a.id.localeCompare(b.id);
    }

    function renderColumn(status, tasks) {
      const columnTasks = tasks.filter(task => task.status === status);
      const column = document.createElement('section');
      column.className = 'column';

      const header = document.createElement('div');
      header.className = 'columnHeader';
      header.innerHTML = '<span>' + labels[status] + '</span><span class="count">' + columnTasks.length + '</span>';

      const dropzone = document.createElement('div');
      dropzone.className = 'dropzone';
      dropzone.dataset.status = status;
      dropzone.addEventListener('dragover', event => {
        event.preventDefault();
        dropzone.classList.add('dragOver');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragOver'));
      dropzone.addEventListener('drop', event => {
        event.preventDefault();
        dropzone.classList.remove('dragOver');
        const taskId = event.dataTransfer.getData('text/plain');
        vscode.postMessage({ type: 'updateTaskStatus', taskId, status });
      });

      if (columnTasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No tasks';
        dropzone.append(empty);
      } else {
        dropzone.append(...columnTasks.map(renderCard));
      }

      column.append(header, dropzone);
      return column;
    }

    function renderCard(task) {
      const card = document.createElement('article');
      card.className = 'card ' + task.status;
      card.draggable = true;
      card.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
      });

      const meta = [task.priority, task.assignee, task.epic].filter(Boolean);
      card.innerHTML = [
        '<div class="cardId">' + escapeHtml(task.id) + '</div>',
        '<div class="cardTitle">' + escapeHtml(task.title) + '</div>',
        '<div class="meta">' + meta.map(value => '<span class="badge">' + escapeHtml(value) + '</span>').join('') + '</div>'
      ].join('');

      return card;
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    render();
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
