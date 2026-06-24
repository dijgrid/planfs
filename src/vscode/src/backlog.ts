/**
 * Backlog management webview provider.
 */

import * as vscode from 'vscode';
import {
  createTaskTemplate,
  getRepositoryDevelopers,
  getNextTaskId,
  listBacklogTasks,
  loadRepository,
  loadSavedFilters,
  RefinementState,
  reviewBacklog,
  saveEntity,
  Task,
  TaskPriority,
  validateRepositoryState
} from 'planfs-core';
import { extractMarkdownSections, MarkdownSection } from './markdownSections';
import { PlanFSUiPreferences, UI_PREFERENCES } from './preferences';
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

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly uiPreferences: PlanFSUiPreferences
  ) {}

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
      if (message?.type === 'updateBacklogTask') {
        await this.updateBacklogTask(message.task as BacklogTaskUpdate);
      }
      if (message?.type === 'openRaw') {
        await this.openRawTask(String(message.taskId));
      }
      if (message?.type === 'updateUiPreference') {
        await this.updateUiPreference(String(message.key), message.value);
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
    const developers = await getRepositoryDevelopers(repository.root);
    const tags = new Set<string>();
    for (const task of repository.tasks.values()) {
      for (const tag of task.tags ?? []) {
        tags.add(tag);
      }
    }
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
      sections: extractMarkdownSections(task.body, ['Acceptance Criteria', 'Questions']),
      needsReview: reviewIds.has(task.id)
    }));

    this.panel.webview.html = renderBacklogHtml({
      tasks,
      options: {
        epics: Array.from(repository.epics.values()).map(epic => ({
          id: epic.id,
          title: epic.title
        })),
        milestones: Array.from(repository.milestones.values()).map(milestone => ({
          id: milestone.id,
          title: milestone.title
        })),
        tags: Array.from(tags).sort(),
        developers: developers.map(developer => developer.label)
      },
      savedFilters: savedFilters.map(filter => ({
        id: filter.id,
        name: filter.name,
        criteria: filter.criteria
      })),
      preferences: {
        backlogPanelsSwapped: this.uiPreferences.get(
          UI_PREFERENCES.backlogPanelsSwapped,
          workspaceFolder
        )
      }
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
    const error = getBlockingTaskValidationError(validationRepository, task.id);
    if (error) {
      vscode.window.showErrorMessage(`Backlog update blocked by validation: ${error.message}`);
      return;
    }

    await saveEntity(workspaceFolder.uri.fsPath, task);
    await this.render();
  }

  private async updateBacklogTask(edited: BacklogTaskUpdate): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const current = repository.tasks.get(String(edited.id));
    if (!current) {
      vscode.window.showErrorMessage(`Task not found: ${String(edited.id)}`);
      return;
    }

    const task = removeEmptyTaskFields({
      ...current,
      title: String(edited.title ?? current.title),
      status: normalizeTaskStatus(edited.status, current.status),
      priority: normalizePriority(edited.priority),
      assignee: normalizeOptionalString(edited.assignee),
      refinementState: normalizeRefinementState(edited.refinementState, current.refinementState ?? 'ready'),
      epic: normalizeOptionalString(edited.epic),
      milestone: normalizeOptionalString(edited.milestone),
      tags: normalizeTags(edited.tags),
      dueDate: normalizeDueDate(edited.dueDate),
      updatedAt: new Date().toISOString()
    });

    const validationRepository = {
      ...repository,
      tasks: new Map(repository.tasks).set(task.id, task)
    };
    const error = getBlockingTaskValidationError(validationRepository, task.id);
    if (error) {
      vscode.window.showErrorMessage(`Backlog update blocked by validation: ${error.message}`);
      return;
    }

    await saveEntity(workspaceFolder.uri.fsPath, task);
    await this.render();
  }

  private async openRawTask(taskId: string): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const task = repository.tasks.get(taskId);
    if (!task) {
      vscode.window.showErrorMessage(`Task not found: ${taskId}`);
      return;
    }

    const document = await vscode.workspace.openTextDocument(task.filePath);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  private async updateUiPreference(key: string, value: unknown): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    if (key === UI_PREFERENCES.backlogPanelsSwapped.key) {
      await this.uiPreferences.set(
        UI_PREFERENCES.backlogPanelsSwapped,
        Boolean(value),
        workspaceFolder
      );
    }
  }
}

interface BacklogTaskUpdate {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  refinementState?: string;
  epic?: string;
  milestone?: string;
  tags?: string[] | string;
  dueDate?: string;
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
    sections: MarkdownSection[];
    needsReview: boolean;
  }>;
  options: {
    epics: Array<{ id: string; title: string }>;
    milestones: Array<{ id: string; title: string }>;
    tags: string[];
    developers: string[];
  };
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
  preferences: {
    backlogPanelsSwapped: boolean;
  };
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
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
    .toolbar { display: flex; gap: 8px; align-items: center; padding: 12px; border-bottom: 1px solid var(--vscode-panel-border); flex-wrap: wrap; }
    input, select, button { max-width: 100%; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); padding: 6px 8px; border-radius: 4px; }
    input, select { width: 100%; min-width: 0; }
    input[type="checkbox"] { width: auto; min-width: auto; flex: 0 0 auto; margin: 2px 0 0; }
    button { cursor: pointer; color: var(--vscode-button-foreground); background: var(--vscode-button-background); border-color: var(--vscode-button-background); }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); border-color: var(--vscode-button-secondaryBackground); }
    main { display: grid; grid-template-columns: minmax(320px, 0.95fr) minmax(320px, 1.05fr); gap: 12px; height: calc(100vh - 58px); padding: 12px; overflow: hidden; }
    .editorPanel, .listPanel { min-width: 0; border: 1px solid var(--vscode-panel-border); border-radius: 6px; background: var(--vscode-editorWidget-background); }
    .editorPanel { min-height: 0; padding: 12px; overflow: auto; }
    .listPanel { min-height: 0; padding: 10px; overflow: auto; }
    main.swapped .editorPanel { order: 1; }
    main.swapped .listPanel { order: 2; }
    .swimlane { margin-bottom: 20px; }
    .swimlane h2 { font-size: 14px; margin: 0 0 8px; }
    .grid { display: grid; gap: 8px; }
    .card { width: 100%; border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 10px; color: var(--vscode-foreground); background: var(--vscode-input-background); text-align: left; }
    .card.selected { border-color: var(--vscode-focusBorder); outline: 1px solid var(--vscode-focusBorder); }
    .card.review { border-color: var(--vscode-editorWarning-foreground); }
    .title { font-weight: 600; margin-bottom: 6px; }
    .meta { color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.5; }
    .empty { color: var(--vscode-descriptionForeground); }
    .editorHead { display: flex; justify-content: space-between; gap: 10px; align-items: start; margin-bottom: 10px; }
    .editorTitle { margin: 0; font-size: 18px; overflow-wrap: anywhere; }
    .editorSub { color: var(--vscode-descriptionForeground); font-size: 12px; }
    .formGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; min-width: 0; }
    label { display: grid; gap: 4px; min-width: 0; color: var(--vscode-descriptionForeground); }
    label.full, .full { grid-column: 1 / -1; }
    .editorActions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .sections { display: grid; gap: 10px; margin-top: 12px; }
    .sectionCard { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 10px; background: var(--vscode-editor-background); }
    .sectionCard h3 { margin: 0 0 8px; font-size: 13px; }
    .sectionItem { display: flex; gap: 8px; align-items: flex-start; padding: 6px 0; color: var(--vscode-foreground); }
    .sectionItem.done { color: var(--vscode-descriptionForeground); }
    .sectionText { line-height: 1.35; overflow-wrap: anywhere; }
    @media (max-width: 820px) {
      main { grid-template-columns: 1fr; height: auto; overflow: visible; }
      .editorPanel, .listPanel { max-height: 70vh; }
    }
    @media (max-width: 1120px) {
      .formGrid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <input id="captureTitle" type="text" placeholder="Capture backlog item" aria-label="Capture backlog item">
    <button type="button" id="capture">Capture</button>
    <input id="filter" type="search" placeholder="Filter backlog" aria-label="Filter backlog">
    <select id="savedFilter" aria-label="Saved filter"></select>
    <select id="groupBy" aria-label="Group backlog">
      <option value="">Backlog order</option>
      <option value="refinementState">Group by refinement</option>
      <option value="epic">Group by epic</option>
      <option value="milestone">Group by milestone</option>
      <option value="assignee">Group by assignee</option>
      <option value="priority">Group by priority</option>
    </select>
  </div>
  <main id="layout">
    <section id="content" class="listPanel"></section>
    <section id="editor" class="editorPanel"></section>
  </main>
  <script>
    const vscode = acquireVsCodeApi();
    const payload = ${json};
    const restoredState = vscode.getState?.() || {};
    let query = String(restoredState.query || '');
    let savedFilterId = String(restoredState.savedFilterId || '');
    let groupBy = String(restoredState.groupBy || '');
    let selectedTaskId = String(restoredState.selectedTaskId || payload.tasks[0]?.id || '');
    let panelsSwapped = typeof restoredState.panelsSwapped === 'boolean'
      ? restoredState.panelsSwapped
      : Boolean(payload.preferences.backlogPanelsSwapped);
    const content = document.getElementById('content');
    const editor = document.getElementById('editor');
    const layout = document.getElementById('layout');
    const filter = document.getElementById('filter');
    const savedFilter = document.getElementById('savedFilter');
    const groupByInput = document.getElementById('groupBy');

    savedFilter.innerHTML = '<option value="">All backlog</option>' + payload.savedFilters.map(filter => '<option value="' + escapeHtml(filter.id) + '">' + escapeHtml(filter.name) + '</option>').join('');
    filter.value = query;
    savedFilter.value = payload.savedFilters.some(filter => filter.id === savedFilterId) ? savedFilterId : '';
    savedFilterId = savedFilter.value;
    groupByInput.value = ['refinementState', 'epic', 'milestone', 'assignee', 'priority'].includes(groupBy) ? groupBy : '';
    groupBy = groupByInput.value;
    layout.classList.toggle('swapped', panelsSwapped);

    document.getElementById('capture').addEventListener('click', () => {
      const input = document.getElementById('captureTitle');
      vscode.postMessage({ type: 'captureBacklogItem', title: input.value });
      input.value = '';
    });
    filter.addEventListener('input', () => { query = filter.value.toLowerCase(); persistUiState(); render(); });
    savedFilter.addEventListener('change', () => { savedFilterId = savedFilter.value; persistUiState(); render(); });
    groupByInput.addEventListener('change', () => { groupBy = groupByInput.value; persistUiState(); render(); });
    function persistUiState() {
      vscode.setState?.({
        query,
        savedFilterId,
        groupBy,
        selectedTaskId,
        panelsSwapped
      });
    }

    function render() {
      const saved = payload.savedFilters.find(filter => filter.id === savedFilterId);
      const visible = payload.tasks.filter(task => matchesQuery(task) && matchesSavedFilter(task, saved?.criteria || {}));
      if (!visible.some(task => task.id === selectedTaskId)) {
        selectedTaskId = visible[0]?.id || '';
      }
      renderEditor(visible.find(task => task.id === selectedTaskId));
      if (visible.length === 0) {
        content.innerHTML = '<p class="empty">No backlog items found</p>';
        return;
      }
      if (!groupBy) {
        content.innerHTML = '<section class="swimlane"><h2>Backlog order (' + visible.length + ')</h2><div class="grid">' + visible.map(renderCard).join('') + '</div></section>';
      } else {
        const groups = new Map();
        for (const task of visible) {
          const key = task[groupBy] || 'None';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(task);
        }
        content.innerHTML = Array.from(groups.entries()).map(([name, tasks]) => '<section class="swimlane"><h2>' + escapeHtml(name) + ' (' + tasks.length + ')</h2><div class="grid">' + tasks.map(renderCard).join('') + '</div></section>').join('');
      }
      content.querySelectorAll('[data-select-task]').forEach(card => {
        card.addEventListener('click', () => {
          selectedTaskId = card.dataset.selectTask;
          persistUiState();
          render();
        });
        card.addEventListener('focus', () => {
          if (selectedTaskId !== card.dataset.selectTask) {
            selectedTaskId = card.dataset.selectTask;
            persistUiState();
            render();
          }
        });
      });
    }

    function renderCard(task) {
      return '<button type="button" data-select-task="' + escapeHtml(task.id) + '" class="card ' + (task.needsReview ? 'review ' : '') + (task.id === selectedTaskId ? 'selected' : '') + '">' +
        '<div class="title">' + escapeHtml(task.id) + ' ' + escapeHtml(task.title) + '</div>' +
        '<div class="meta">' + [task.status, task.priority || 'no priority', task.assignee ? '@' + task.assignee : 'unassigned', task.epic, task.milestone, task.dueDate ? 'due ' + task.dueDate : ''].filter(Boolean).map(escapeHtml).join(' | ') + '</div>' +
        '<div class="meta">' + escapeHtml(task.refinementState) + '</div>' +
        (task.needsReview ? '<div class="meta">Needs review</div>' : '') +
      '</button>';
    }

    function renderEditor(task) {
      if (!task) {
        editor.innerHTML = '<p class="empty">Select a backlog item to edit it.</p>';
        return;
      }

      editor.innerHTML = '<div class="editorHead">' +
        '<div><h2 class="editorTitle">' + escapeHtml(task.title) + '</h2><div class="editorSub">' + escapeHtml(task.id) + '</div></div>' +
        '<button type="button" id="openRaw" class="secondary">Open Markdown</button>' +
        '</div>' +
        '<form id="editorForm" class="formGrid">' +
        input('Title', 'title', task.title, 'text', 'full') +
        select('Status', 'status', task.status, ['todo', 'in-progress', 'review', 'done']) +
        select('Priority', 'priority', task.priority || '', ['', 'low', 'medium', 'high', 'critical']) +
        input('Assignee', 'assignee', task.assignee || '', 'text', '', 'developer-options') +
        selectWithOptions('Refinement', 'refinementState', task.refinementState, ${JSON.stringify(REFINEMENT_STATES)}.map(state => ({ id: state, title: state }))) +
        selectWithOptions('Epic', 'epic', task.epic || '', payload.options.epics) +
        selectWithOptions('Milestone', 'milestone', task.milestone || '', payload.options.milestones) +
        input('Due Date', 'dueDate', String(task.dueDate || '').slice(0, 10), 'date') +
        input('Tags', 'tags', (task.tags || []).join(', '), 'text', 'full', 'tag-options') +
        '</form>' +
        '<datalist id="developer-options">' + payload.options.developers.map(value => '<option value="' + escapeHtml(value) + '"></option>').join('') + '</datalist>' +
        '<datalist id="tag-options">' + payload.options.tags.map(value => '<option value="' + escapeHtml(value) + '"></option>').join('') + '</datalist>' +
        renderSections(task) +
        '<div class="editorActions"><button type="button" id="saveTask" disabled>Save Changes</button></div>';

      const form = document.getElementById('editorForm');
      const save = document.getElementById('saveTask');
      form.addEventListener('input', () => {
        save.disabled = false;
      });
      document.getElementById('saveTask').addEventListener('click', () => {
        const edited = { id: task.id };
        for (const element of form.elements) {
          if (element.name) {
            edited[element.name] = element.value;
          }
        }
        edited.tags = splitList(edited.tags);
        persistUiState();
        vscode.postMessage({ type: 'updateBacklogTask', task: edited });
      });
      document.getElementById('openRaw').addEventListener('click', () => {
        vscode.postMessage({ type: 'openRaw', taskId: task.id });
      });
    }

    function renderSections(task) {
      if (!task.sections || task.sections.length === 0) {
        return '<div class="sections"><p class="empty">No Acceptance Criteria or Questions sections found. Use Open Markdown for full body editing.</p></div>';
      }
      return '<div class="sections">' + task.sections.map(section => '<section class="sectionCard"><h3>' + escapeHtml(section.title) + '</h3>' +
        section.paragraphs.map(paragraph => '<p class="meta">' + escapeHtml(paragraph) + '</p>').join('') +
        (section.items.length ? section.items.map(item => '<div class="sectionItem ' + (item.checked ? 'done' : '') + '"><input type="checkbox" disabled' + (item.checked ? ' checked' : '') + '><span class="sectionText">' + escapeHtml(item.text) + '</span></div>').join('') : '') +
        '</section>').join('') + '</div>';
    }

    function input(label, name, value, type = 'text', className = '', list = '') {
      return '<label class="' + escapeHtml(className) + '">' + escapeHtml(label) + '<input name="' + escapeHtml(name) + '" type="' + escapeHtml(type) + '" value="' + escapeHtml(value) + '"' + (list ? ' list="' + escapeHtml(list) + '"' : '') + '></label>';
    }

    function select(label, name, value, options) {
      return '<label>' + escapeHtml(label) + '<select name="' + escapeHtml(name) + '">' + options.map(option => '<option value="' + escapeHtml(option) + '"' + (option === value ? ' selected' : '') + '>' + escapeHtml(option || 'None') + '</option>').join('') + '</select></label>';
    }

    function selectWithOptions(label, name, value, options) {
      return '<label>' + escapeHtml(label) + '<select name="' + escapeHtml(name) + '"><option value="">None</option>' + options.map(option => '<option value="' + escapeHtml(option.id) + '"' + (option.id === value ? ' selected' : '') + '>' + escapeHtml(option.title ? option.id + ': ' + option.title : option.id) + '</option>').join('') + '</select></label>';
    }

    function splitList(value) {
      return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
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

    persistUiState();
    render();
  </script>
</body>
</html>`;
}

function normalizeTaskStatus(value: unknown, fallback: Task['status']): Task['status'] {
  const status = normalizeStatusValue(value);
  if (status) {
    return status;
  }

  return normalizeStatusValue(fallback) ?? 'todo';
}

function normalizeStatusValue(value: unknown): Task['status'] | undefined {
  const text = String(value ?? '').trim().toLowerCase();
  const aliases: Record<string, Task['status']> = {
    todo: 'todo',
    'to do': 'todo',
    'in-progress': 'in-progress',
    'in progress': 'in-progress',
    review: 'review',
    done: 'done',
    completed: 'done'
  };
  return aliases[text];
}

function normalizePriority(value: unknown): TaskPriority | undefined {
  return ['low', 'medium', 'high', 'critical'].includes(String(value))
    ? String(value) as TaskPriority
    : undefined;
}

function normalizeRefinementState(value: unknown, fallback: RefinementState): RefinementState {
  return REFINEMENT_STATES.includes(String(value) as RefinementState)
    ? String(value) as RefinementState
    : fallback;
}

function normalizeOptionalString(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function normalizeDueDate(value: unknown): string | undefined {
  const text = normalizeOptionalString(value);
  if (!text) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text}T00:00:00.000Z`;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

function getBlockingTaskValidationError(
  repository: Parameters<typeof validateRepositoryState>[0],
  taskId: string
) {
  return validateRepositoryState(repository).errors.find(error =>
    error.severity === 'error' && error.id === taskId
  );
}

function normalizeTags(value: string[] | string | undefined): string[] | undefined {
  const tags = Array.isArray(value)
    ? value
    : String(value ?? '').split(',');
  const normalized = tags.map(tag => tag.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function removeEmptyTaskFields(task: Task): Task {
  const copy = { ...task } as Record<string, unknown>;
  for (const [key, value] of Object.entries(copy)) {
    if (
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    ) {
      delete copy[key];
    }
  }
  return copy as unknown as Task;
}

function escapeScriptJson(json: string): string {
  return json.replace(/</g, '\\u003c');
}
