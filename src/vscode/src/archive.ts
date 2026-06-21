/**
 * Archive webview provider.
 */

import * as vscode from 'vscode';
import {
  archiveEntity,
  deleteArchivedEntity,
  Entity,
  listArchivedEntities,
  loadRepository,
  restoreArchivedEntity
} from 'planfs-core';
import { getPlanFSWorkspaceFolder } from './workspace';

interface ArchivePayload {
  items: Array<{
    id: string;
    title: string;
    type: string;
    status?: string;
    archivedAt?: string;
    originalPath?: string;
    body: string;
  }>;
}

export class ArchiveProvider {
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
      'planfsArchive',
      'PlanFS Archive',
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
      if (message?.type === 'restore') {
        await this.restore(String(message.id));
      }
      if (message?.type === 'delete') {
        await this.delete(String(message.id));
      }
      if (message?.type === 'openRaw') {
        await this.openRaw(String(message.id));
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
    const items = listArchivedEntities(repository).map(entity => ({
      id: entity.id,
      title: entity.title,
      type: entity.type,
      status: String(entity.status ?? ''),
      archivedAt: entity.archive?.archivedAt,
      originalPath: entity.archive?.originalPath,
      body: entity.body
    }));

    this.panel.webview.html = renderArchiveHtml({ items });
  }

  private async restore(id: string): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    await restoreArchivedEntity(workspaceFolder.uri.fsPath, id);
    vscode.window.showInformationMessage(`Restored ${id}`);
    await this.render();
  }

  private async delete(id: string): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    const confirmed = await vscode.window.showWarningMessage(
      `Permanently delete archived item ${id}?`,
      { modal: true },
      'Delete'
    );
    if (confirmed !== 'Delete') {
      return;
    }

    await deleteArchivedEntity(workspaceFolder.uri.fsPath, id);
    vscode.window.showInformationMessage(`Deleted archived item ${id}`);
    await this.render();
  }

  private async openRaw(id: string): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const entity = listArchivedEntities(repository).find(item => item.id === id);
    if (!entity) {
      vscode.window.showErrorMessage(`Archived item not found: ${id}`);
      return;
    }

    const document = await vscode.workspace.openTextDocument(entity.filePath);
    await vscode.window.showTextDocument(document, { preview: false });
  }
}

export async function archiveExplorerItem(item: { entity?: Entity } | undefined): Promise<void> {
  const workspaceFolder = getPlanFSWorkspaceFolder();
  if (!workspaceFolder || !item?.entity) {
    return;
  }

  const entity = item.entity;
  if (entity.type !== 'task' && entity.type !== 'epic') {
    vscode.window.showErrorMessage('Only tasks and epics can be archived.');
    return;
  }

  let includeChildren = false;
  if (entity.type === 'epic') {
    const answer = await vscode.window.showWarningMessage(
      `Archive ${entity.id} and its child tasks?`,
      { modal: true },
      'Archive epic only',
      'Archive epic and tasks'
    );
    if (!answer) {
      return;
    }
    includeChildren = answer === 'Archive epic and tasks';
  } else {
    const answer = await vscode.window.showWarningMessage(
      `Archive ${entity.id}?`,
      { modal: true },
      'Archive'
    );
    if (answer !== 'Archive') {
      return;
    }
  }

  const result = await archiveEntity(workspaceFolder.uri.fsPath, entity.id, { includeChildren });
  vscode.window.showInformationMessage(`Archived ${result.archived.length} item${result.archived.length === 1 ? '' : 's'}`);
}

function renderArchiveHtml(payload: ArchivePayload): string {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlanFS Archive</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
    .toolbar { display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--vscode-panel-border); }
    input, select, button { color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); padding: 6px 8px; border-radius: 4px; }
    input { flex: 1; min-width: 160px; }
    button { cursor: pointer; color: var(--vscode-button-foreground); background: var(--vscode-button-background); border-color: var(--vscode-button-background); }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); border-color: var(--vscode-button-secondaryBackground); }
    main { padding: 12px; display: grid; gap: 8px; }
    .card { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 10px; background: var(--vscode-editorWidget-background); }
    .head { display: flex; justify-content: space-between; gap: 10px; align-items: start; }
    h2 { margin: 0 0 6px; font-size: 15px; }
    .meta { color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.5; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .empty { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <div class="toolbar">
    <input id="query" type="search" placeholder="Filter archive" aria-label="Filter archive">
    <select id="type" aria-label="Archive type">
      <option value="">All types</option>
      <option value="task">Tasks</option>
      <option value="epic">Epics</option>
    </select>
  </div>
  <main id="content"></main>
  <script>
    const vscode = acquireVsCodeApi();
    const payload = ${json};
    const content = document.getElementById('content');
    const queryInput = document.getElementById('query');
    const typeInput = document.getElementById('type');
    queryInput.addEventListener('input', render);
    typeInput.addEventListener('change', render);

    function render() {
      const query = queryInput.value.trim().toLowerCase();
      const type = typeInput.value;
      const items = payload.items.filter(item => {
        if (type && item.type !== type) return false;
        if (!query) return true;
        return [item.id, item.title, item.type, item.status, item.originalPath, item.body].filter(Boolean).join(' ').toLowerCase().includes(query);
      });
      if (items.length === 0) {
        content.innerHTML = '<p class="empty">No archived items found</p>';
        return;
      }
      content.innerHTML = items.map(renderItem).join('');
      content.querySelectorAll('[data-restore]').forEach(button => button.addEventListener('click', () => {
        vscode.postMessage({ type: 'restore', id: button.dataset.restore });
      }));
      content.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => {
        vscode.postMessage({ type: 'delete', id: button.dataset.delete });
      }));
      content.querySelectorAll('[data-open-raw]').forEach(button => button.addEventListener('click', () => {
        vscode.postMessage({ type: 'openRaw', id: button.dataset.openRaw });
      }));
    }

    function renderItem(item) {
      return '<section class="card">' +
        '<div class="head"><div><h2>' + escapeHtml(item.id) + ' ' + escapeHtml(item.title) + '</h2>' +
        '<div class="meta">' + [item.type, item.status, item.archivedAt ? 'archived ' + item.archivedAt : '', item.originalPath].filter(Boolean).map(escapeHtml).join(' | ') + '</div></div>' +
        '<div class="actions"><button type="button" data-restore="' + escapeHtml(item.id) + '">Restore</button>' +
        '<button type="button" class="secondary" data-open-raw="' + escapeHtml(item.id) + '">Open Markdown</button>' +
        '<button type="button" class="secondary" data-delete="' + escapeHtml(item.id) + '">Delete</button></div></div>' +
      '</section>';
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    render();
  </script>
</body>
</html>`;
}
