/**
 * Structured PlanFS entity editor
 */

import * as vscode from 'vscode';
import {
  Entity,
  Epic,
  getRepositoryDevelopers,
  loadRepository,
  Milestone,
  Repository,
  saveEntity,
  Task,
  validateEntity
} from 'planfs-core';
import { extractMarkdownSections, MarkdownSection } from './markdownSections';
import { getPlanFSWorkspaceFolder } from './workspace';

interface EditorPayload {
  entity: EditableEntity;
  options: {
    epics: Array<{ id: string; title: string }>;
    milestones: Array<{ id: string; title: string }>;
    tasks: Array<{ id: string; title: string }>;
    tags: string[];
    developers: string[];
  };
  epicBoard?: EpicBoardColumn[];
}

type EditableEntity = Task | Epic | Milestone;

interface EpicBoardTask {
  id: string;
  title: string;
  status: Task['status'];
  priority?: string;
  assignee?: string;
  milestone?: string;
  dueDate?: string;
}

interface EpicBoardColumn {
  status: Task['status'];
  tasks: EpicBoardTask[];
}

export class EntityEditorProvider {
  private panels = new Map<string, vscode.WebviewPanel>();

  constructor(private readonly extensionUri: vscode.Uri) {}

  async open(entityId?: string): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const entity = entityId
        ? findEditableEntity(repository, entityId)
        : await pickEditableEntity(repository);

      if (!entity) {
        return;
      }

      const existingPanel = this.panels.get(entity.id);
      if (existingPanel) {
        existingPanel.reveal(vscode.ViewColumn.One);
        existingPanel.webview.html = renderEditor(
          existingPanel.webview,
          await createPayload(repository, entity)
        );
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        'planfsEntityEditor',
        `PlanFS Editor: ${entity.id}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [this.extensionUri]
        }
      );

      this.panels.set(entity.id, panel);
      panel.onDidDispose(() => this.panels.delete(entity.id));
      panel.webview.onDidReceiveMessage(async message => {
        if (message?.type === 'save') {
          await this.save(String(entity.id), message.entity as EditableEntity, panel);
        }

        if (message?.type === 'openRaw') {
          await openRawFile(String(entity.id));
        }

        if (message?.type === 'openEntity') {
          await this.open(String(message.entityId));
        }
      });
      panel.webview.html = renderEditor(panel.webview, await createPayload(repository, entity));
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to open PlanFS editor: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async refresh(): Promise<void> {
    if (this.panels.size === 0) {
      return;
    }

    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      for (const panel of this.panels.values()) {
        panel.webview.html = renderMessage('No workspace folder open');
      }
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      for (const [entityId, panel] of this.panels.entries()) {
        const entity = findEditableEntity(repository, entityId);
        panel.webview.html = entity
          ? renderEditor(panel.webview, await createPayload(repository, entity))
          : renderMessage(`Entity not found: ${entityId}`);
      }
    } catch (error) {
      const message = `Failed to refresh PlanFS editor: ${error instanceof Error ? error.message : String(error)}`;
      for (const panel of this.panels.values()) {
        panel.webview.html = renderMessage(message);
      }
    }
  }

  private async save(
    originalEntityId: string,
    edited: EditableEntity,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    if (edited.id !== originalEntityId) {
      vscode.window.showErrorMessage('Entity IDs cannot be changed from the structured editor');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const current = findEditableEntity(repository, originalEntityId);

      if (!current) {
        vscode.window.showErrorMessage(`Entity not found: ${originalEntityId}`);
        return;
      }

      const entity = mergeEditableEntity(current, edited);
      const errors = validateEntity(entity).filter(error => error.severity === 'error');

      if (errors.length > 0) {
        panel.webview.postMessage({
          type: 'validation',
          errors: errors.map(error => error.message)
        });
        return;
      }

      await saveEntity(workspaceFolder.uri.fsPath, entity);
      const refreshed = await loadRepository(workspaceFolder.uri.fsPath);
      panel.webview.html = renderEditor(
        panel.webview,
        await createPayload(refreshed, findEditableEntity(refreshed, originalEntityId) ?? entity)
      );
      vscode.window.showInformationMessage(`Saved ${entity.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      panel.webview.postMessage({ type: 'validation', errors: [message] });
      vscode.window.showErrorMessage(`Failed to save entity: ${message}`);
    }
  }
}

function renderMessage(message: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlanFS Entity Editor</title>
</head>
<body>
  <p>${escapeHtml(message)}</p>
</body>
</html>`;
}

async function openRawFile(entityId: string): Promise<void> {
  const workspaceFolder = getPlanFSWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }

  const repository = await loadRepository(workspaceFolder.uri.fsPath);
  const entity = findEntity(repository, entityId);
  if (!entity) {
    return;
  }

  const document = await vscode.workspace.openTextDocument(entity.filePath);
  await vscode.window.showTextDocument(document, { preview: false });
}

async function pickEditableEntity(
  repository: Repository
): Promise<EditableEntity | undefined> {
  const items = [
    ...Array.from(repository.tasks.values()),
    ...Array.from(repository.epics.values()),
    ...Array.from(repository.milestones.values())
  ].map(entity => ({
    label: entity.id,
    description: entity.title,
    detail: entity.type,
    entity
  }));

  const selected = await vscode.window.showQuickPick(items, {
    title: 'Open PlanFS Structured Editor',
    placeHolder: 'Select a task, epic, or milestone'
  });

  return selected?.entity;
}

function findEntity(repository: Repository, entityId: string): Entity | undefined {
  return repository.tasks.get(entityId)
    ?? repository.epics.get(entityId)
    ?? repository.milestones.get(entityId)
    ?? repository.decisions.get(entityId);
}

function findEditableEntity(
  repository: Repository,
  entityId: string
): EditableEntity | undefined {
  return repository.tasks.get(entityId)
    ?? repository.epics.get(entityId)
    ?? repository.milestones.get(entityId);
}

async function createPayload(repository: Repository, entity: EditableEntity): Promise<EditorPayload> {
  const tags = new Set<string>();
  for (const task of repository.tasks.values()) {
    for (const tag of task.tags ?? []) {
      tags.add(tag);
    }
  }
  for (const epic of repository.epics.values()) {
    for (const tag of epic.tags ?? []) {
      tags.add(tag);
    }
  }

  const developers = await getRepositoryDevelopers(repository.root);
  const payload: EditorPayload = {
    entity,
    options: {
      epics: Array.from(repository.epics.values()).map(epic => ({
        id: epic.id,
        title: epic.title
      })),
      milestones: Array.from(repository.milestones.values()).map(milestone => ({
        id: milestone.id,
        title: milestone.title
      })),
      tasks: Array.from(repository.tasks.values()).map(task => ({
        id: task.id,
        title: task.title
      })),
      tags: Array.from(tags).sort(),
      developers: developers.map(developer => developer.label)
    }
  };

  if (entity.type === 'epic') {
    payload.epicBoard = createEpicBoard(repository, entity.id);
  }

  return payload;
}

function createEpicBoard(repository: Repository, epicId: string): EpicBoardColumn[] {
  const statuses: Array<Task['status']> = ['todo', 'in-progress', 'review', 'done'];
  const tasks = Array.from(repository.tasks.values())
    .filter(task => task.epic === epicId)
    .sort((a, b) => statusIndex(a.status) - statusIndex(b.status) || a.id.localeCompare(b.id));

  return statuses.map(status => ({
    status,
    tasks: tasks
      .filter(task => task.status === status)
      .map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        milestone: task.milestone,
        dueDate: task.dueDate
      }))
  }));
}

function statusIndex(status: Task['status']): number {
  return ['todo', 'in-progress', 'review', 'done'].indexOf(status);
}

function mergeEditableEntity(
  current: EditableEntity,
  edited: EditableEntity
): EditableEntity {
  const next = {
    ...current,
    ...edited,
    filePath: current.filePath,
    metadata: current.metadata,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString()
  } as EditableEntity;

  return removeEmptyFields(next);
}

function removeEmptyFields<T extends EditableEntity>(entity: T): T {
  const copy = { ...entity } as Record<string, unknown>;
  for (const [key, value] of Object.entries(copy)) {
    if (
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    ) {
      delete copy[key];
    }
  }
  return copy as T;
}

function renderEditor(webview: vscode.Webview, payload: EditorPayload): string {
  const nonce = getNonce();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>PlanFS Entity Editor</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --panel: color-mix(in srgb, var(--vscode-sideBar-background) 86%, var(--vscode-editor-background));
      --border: var(--vscode-panel-border);
      --text: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --error: var(--vscode-inputValidation-errorBorder);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 18px;
      color: var(--text);
      background: var(--bg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .shell { max-width: 980px; margin: 0 auto; }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: end;
      margin-bottom: 14px;
    }

    h1 { margin: 0 0 4px; font-size: 22px; }
    h2 { margin: 0 0 10px; font-size: 15px; }
    .subtle { color: var(--muted); }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .card {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      padding: 12px;
    }

    .full { grid-column: 1 / -1; }

    label {
      display: grid;
      gap: 5px;
      margin-bottom: 10px;
      color: var(--muted);
    }

    input,
    select,
    textarea {
      width: 100%;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--border));
      border-radius: 3px;
      padding: 7px 8px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    textarea {
      min-height: 180px;
      resize: vertical;
      font-family: var(--vscode-editor-font-family);
    }

    input[type="checkbox"] {
      width: auto;
      min-width: auto;
      flex: 0 0 auto;
      margin: 2px 0 0;
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    button {
      cursor: pointer;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 7px 10px;
    }

    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
      border-color: var(--vscode-button-secondaryBackground);
    }

    .errors {
      display: none;
      border: 1px solid var(--error);
      padding: 10px;
      margin-bottom: 12px;
      border-radius: 4px;
    }

    .checkboxes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      max-height: 170px;
      overflow: auto;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
    }

    .check {
      display: flex;
      gap: 6px;
      align-items: center;
      color: var(--text);
      margin: 0;
    }

    .check input { width: auto; }

    .epicBoard {
      display: grid;
      grid-template-columns: repeat(4, minmax(150px, 1fr));
      gap: 10px;
    }

    .boardColumn {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: color-mix(in srgb, var(--panel) 82%, var(--bg));
      padding: 8px;
    }

    .columnHead {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
    }

    .taskMini {
      display: grid;
      gap: 5px;
      width: 100%;
      margin: 0 0 8px;
      padding: 8px;
      color: var(--text);
      text-align: left;
      background: var(--vscode-input-background);
      border: 1px solid var(--border);
      border-radius: 5px;
    }

    .taskMini:hover {
      border-color: var(--vscode-focusBorder);
    }

    .taskTitle {
      overflow-wrap: anywhere;
      line-height: 1.3;
    }

    .taskMeta {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
    }

    .sectionList {
      display: grid;
      gap: 8px;
    }

    .sectionItem {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 7px 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--vscode-input-background);
    }

    .sectionItem.done {
      color: var(--muted);
    }

    .sectionText {
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .emptyColumn {
      padding: 8px;
      color: var(--muted);
      border: 1px dashed var(--border);
      border-radius: 5px;
    }

    @media (max-width: 760px) {
      .grid,
      .epicBoard {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="header">
      <div>
        <h1>${escapeHtml(payload.entity.id)}</h1>
        <div class="subtle">${escapeHtml(payload.entity.type)} editor</div>
      </div>
      <div class="actions">
        <button id="save">Save</button>
        <button id="openRaw" class="secondary">Open Markdown</button>
      </div>
    </header>
    <div id="errors" class="errors"></div>
    <form id="form" class="grid">
      ${renderEntityFields(payload)}
    </form>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const initial = ${JSON.stringify(payload.entity)};
    const form = document.getElementById('form');
    const errors = document.getElementById('errors');

    document.getElementById('save').addEventListener('click', () => {
      const entity = collectEntity();
      if (entity) {
        vscode.postMessage({ type: 'save', entity });
      }
    });
    document.getElementById('openRaw').addEventListener('click', () => {
      vscode.postMessage({ type: 'openRaw' });
    });
    document.querySelectorAll('[data-open-entity]').forEach(button => {
      button.addEventListener('click', () => {
        vscode.postMessage({ type: 'openEntity', entityId: button.dataset.openEntity });
      });
    });
    window.addEventListener('message', event => {
      if (event.data?.type === 'validation') {
        renderErrors(event.data.errors || []);
      }
    });

    function collectEntity() {
      const entity = { ...initial };
      const validationErrors = [];
      for (const element of form.elements) {
        if (!element.name || element.type === 'checkbox') {
          continue;
        }
        entity[element.name] = element.value;
      }

      entity.tags = splitList(entity.tags);
      entity.dependsOn = Array.from(document.querySelectorAll('[data-dependency]:checked')).map(item => item.value);
      const links = parseJson(entity.links);
      if (!links.valid) {
        validationErrors.push('Links must be valid JSON.');
      }
      entity.links = links.value;

      if (entity.type !== 'task') {
        delete entity.dependsOn;
      }
      if (entity.type === 'milestone') {
        delete entity.tags;
      }

      if (validationErrors.length > 0) {
        renderErrors(validationErrors);
        return undefined;
      }

      return entity;
    }

    function splitList(value) {
      return String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }

    function parseJson(value) {
      const text = String(value || '').trim();
      if (!text) {
        return { valid: true, value: {} };
      }
      try {
        return { valid: true, value: JSON.parse(text) };
      } catch {
        return { valid: false, value: {} };
      }
    }

    function renderErrors(messages) {
      if (messages.length === 0) {
        errors.style.display = 'none';
        errors.innerHTML = '';
        return;
      }
      errors.style.display = 'block';
      errors.innerHTML = '<strong>Save blocked</strong><ul>' + messages.map(message => '<li>' + escapeHtml(message) + '</li>').join('') + '</ul>';
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

function renderEntityFields(payload: EditorPayload): string {
  const entity = payload.entity;
  const common = [
    input('ID', 'id', entity.id, 'text', true),
    input('Title', 'title', entity.title)
  ];

  if (entity.type === 'task') {
    const task = entity as Task;
    return [
      input('ID', 'id', task.id, 'text', true),
      input('Title', 'title', task.title),
      select('Status', 'status', task.status, ['todo', 'in-progress', 'review', 'done']),
      select('Priority', 'priority', task.priority ?? '', ['', 'low', 'medium', 'high', 'critical']),
      input('Assignee', 'assignee', task.assignee ?? '', 'text', false, 'developer-options'),
      datalist('developer-options', payload.options.developers),
      selectWithOptions('Epic', 'epic', task.epic ?? '', payload.options.epics),
      selectWithOptions('Milestone', 'milestone', task.milestone ?? '', payload.options.milestones),
      input('Due Date', 'dueDate', toDateInput(task.dueDate), 'date'),
      input('Estimate', 'estimate', task.estimate ?? ''),
      input('Tags', 'tags', (task.tags ?? []).join(', '), 'text', false, 'tag-options'),
      datalist('tag-options', payload.options.tags),
      dependencyChecks(task, payload.options.tasks),
      textarea('Links JSON', 'links', formatJson(task.links), 'full'),
      renderBodySections(task.body)
    ].join('');
  }

  if (entity.type === 'epic') {
    const epic = entity as Epic;
    return [
      common[0],
      common[1],
      select('Status', 'status', epic.status, ['active', 'completed', 'on-hold', 'archived']),
      input('Owner', 'owner', epic.owner ?? '', 'text', false, 'developer-options'),
      datalist('developer-options', payload.options.developers),
      input('Target Date', 'targetDate', toDateInput(epic.targetDate), 'date'),
      input('Tags', 'tags', (epic.tags ?? []).join(', '), 'text', false, 'tag-options'),
      datalist('tag-options', payload.options.tags),
      textarea('Description', 'description', epic.description ?? '', 'full'),
      textarea('Links JSON', 'links', formatJson(epic.links), 'full'),
      renderEpicBoard(payload),
      renderBodySections(epic.body)
    ].join('');
  }

  const milestone = entity as Milestone;
  return [
    common[0],
    common[1],
    select('Status', 'status', milestone.status, ['active', 'completed', 'delayed']),
    input('Target Date', 'targetDate', toDateInput(milestone.targetDate), 'date'),
    input('Owner', 'owner', milestone.owner ?? '', 'text', false, 'developer-options'),
    datalist('developer-options', payload.options.developers),
    textarea('Description', 'description', milestone.description ?? '', 'full'),
    textarea('Links JSON', 'links', formatJson(milestone.links), 'full'),
    renderBodySections(milestone.body)
  ].join('');
}

function renderEpicBoard(payload: EditorPayload): string {
  const columns = payload.epicBoard ?? [];
  const totalTasks = columns.reduce((total, column) => total + column.tasks.length, 0);

  if (columns.length === 0) {
    return '';
  }

  return [
    '<section class="card full">',
    '<h2>Epic Task Board</h2>',
    totalTasks === 0
      ? '<p class="subtle">No tasks currently reference this epic.</p>'
      : '<div class="epicBoard">' + columns.map(renderEpicBoardColumn).join('') + '</div>',
    '</section>'
  ].join('');
}

function renderEpicBoardColumn(column: EpicBoardColumn): string {
  const tasks = column.tasks.length === 0
    ? '<div class="emptyColumn">No tasks</div>'
    : column.tasks.map(renderEpicBoardTask).join('');

  return [
    '<section class="boardColumn">',
    '<div class="columnHead"><span>' + escapeHtml(column.status) + '</span><span>' + column.tasks.length + '</span></div>',
    tasks,
    '</section>'
  ].join('');
}

function renderEpicBoardTask(task: EpicBoardTask): string {
  const meta = [
    task.priority,
    task.assignee,
    task.milestone,
    toDateInput(task.dueDate)
  ].filter(Boolean).join(' · ');

  return [
    '<button type="button" class="taskMini" data-open-entity="' + escapeHtml(task.id) + '">',
    '<strong>' + escapeHtml(task.id) + '</strong>',
    '<span class="taskTitle">' + escapeHtml(task.title) + '</span>',
    meta ? '<span class="taskMeta">' + escapeHtml(meta) + '</span>' : '',
    '</button>'
  ].join('');
}

function input(
  label: string,
  name: string,
  value: string,
  type = 'text',
  readonly = false,
  list?: string
): string {
  return `<label>${escapeHtml(label)}<input name="${name}" type="${type}" value="${escapeHtml(value)}"${readonly ? ' readonly' : ''}${list ? ` list="${list}"` : ''}></label>`;
}

function select(label: string, name: string, value: string, options: string[]): string {
  return `<label>${escapeHtml(label)}<select name="${name}">${options.map(option => `<option value="${escapeHtml(option)}"${option === value ? ' selected' : ''}>${escapeHtml(option || 'None')}</option>`).join('')}</select></label>`;
}

function selectWithOptions(
  label: string,
  name: string,
  value: string,
  options: Array<{ id: string; title: string }>
): string {
  return `<label>${escapeHtml(label)}<select name="${name}"><option value="">None</option>${options.map(option => `<option value="${escapeHtml(option.id)}"${option.id === value ? ' selected' : ''}>${escapeHtml(`${option.id}: ${option.title}`)}</option>`).join('')}</select></label>`;
}

function textarea(label: string, name: string, value: string, className = ''): string {
  return `<label class="${className}">${escapeHtml(label)}<textarea name="${name}">${escapeHtml(value)}</textarea></label>`;
}

function renderBodySections(body: string): string {
  const sections = extractMarkdownSections(body, ['Acceptance Criteria', 'Questions']);

  return [
    '<section class="card full">',
    '<h2>Markdown Sections</h2>',
    '<p class="subtle">Use Open Markdown for full body editing. Common planning sections are shown here for quick review.</p>',
    sections.length === 0
      ? '<p class="subtle">No Acceptance Criteria or Questions sections found.</p>'
      : '<div class="sectionList">' + sections.map(renderMarkdownSection).join('') + '</div>',
    '</section>'
  ].join('');
}

function renderMarkdownSection(section: MarkdownSection): string {
  const checklist = section.items.length > 0
    ? section.items.map(item => [
      '<div class="sectionItem' + (item.checked ? ' done' : '') + '">',
      '<input type="checkbox" disabled' + (item.checked ? ' checked' : '') + '>',
      '<span class="sectionText">' + escapeHtml(item.text) + '</span>',
      '</div>'
    ].join('')).join('')
    : '';
  const paragraphs = section.paragraphs
    .map(paragraph => '<p class="subtle">' + escapeHtml(paragraph) + '</p>')
    .join('');

  return [
    '<section>',
    '<h2>' + escapeHtml(section.title) + '</h2>',
    paragraphs,
    checklist || (paragraphs ? '' : '<p class="subtle">Section is empty.</p>'),
    '</section>'
  ].join('');
}

function dependencyChecks(
  task: Task,
  tasks: Array<{ id: string; title: string }>
): string {
  const selected = new Set(task.dependsOn ?? []);
  const rows = tasks
    .filter(candidate => candidate.id !== task.id)
    .map(candidate => `<label class="check"><input data-dependency type="checkbox" value="${escapeHtml(candidate.id)}"${selected.has(candidate.id) ? ' checked' : ''}>${escapeHtml(`${candidate.id}: ${candidate.title}`)}</label>`)
    .join('');
  return `<div class="card full"><h2>Dependencies</h2><div class="checkboxes">${rows || '<span class="subtle">No other tasks available.</span>'}</div></div>`;
}

function datalist(id: string, values: string[]): string {
  return `<datalist id="${id}">${values.map(value => `<option value="${escapeHtml(value)}"></option>`).join('')}</datalist>`;
}

function formatJson(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }
  return JSON.stringify(value, null, 2);
}

function toDateInput(value?: string): string {
  return String(value ?? '').slice(0, 10);
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
