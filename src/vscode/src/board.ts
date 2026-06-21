/**
 * Kanban board webview provider
 */

import * as vscode from 'vscode';
import {
  createTaskTemplate,
  getNextTaskId,
  getNextWorkCandidates,
  getTaskReadiness,
  loadRepository,
  loadSavedFilters,
  SavedFilter,
  saveEntity,
  Task,
  TaskReadiness,
  TaskStatus,
  validateRepositoryState
} from 'planfs-core';
import { getPlanFSWorkspaceFolder } from './workspace';

const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
const QUICK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in-progress'],
  'in-progress': ['review', 'done'],
  review: ['done'],
  done: []
};

interface BoardTask {
  id: string;
  title: string;
  status: TaskStatus;
  filePath: string;
  updatedAt?: string;
  priority?: string;
  assignee?: string;
  epic?: string;
  milestone?: string;
  dependsOn?: string[];
  dependents: string[];
  tags?: string[];
  dueDate?: string;
  estimate?: string;
  links?: Record<string, string>;
  metadata: Record<string, unknown>;
  body: string;
  readiness: TaskReadiness;
  nextWorkReasons: string[];
  downstreamCount: number;
  critical: boolean;
  nextWorkRank?: number;
}

interface BoardPayload {
  tasks: BoardTask[];
  statuses: TaskStatus[];
  savedFilters: SavedFilter[];
}

interface CreateTaskContext {
  status: TaskStatus;
  assignee?: string;
  epic?: string;
  milestone?: string;
  priority?: string;
  tags?: string[];
}

type BulkUpdateAction = 'status' | 'assignee' | 'tag' | 'epic' | 'milestone' | 'priority';
type BoardMode = 'status' | 'next-work';

interface BulkUpdateRequest {
  taskIds: string[];
  action: BulkUpdateAction;
}

export class BoardProvider {
  private panel: vscode.WebviewPanel | undefined;
  private hasRenderedBoard = false;
  private preferredMode: BoardMode = 'status';

  constructor(private readonly extensionUri: vscode.Uri) {}

  async open(mode: BoardMode = 'status'): Promise<void> {
    this.preferredMode = mode;

    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      await this.render({ replaceHtml: mode === 'next-work' });
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
      this.hasRenderedBoard = false;
    });

    this.panel.webview.onDidReceiveMessage(async message => {
      if (message?.type === 'updateTaskStatus') {
        await this.updateTaskStatus(
          String(message.taskId),
          message.status as TaskStatus
        );
      }

      if (message?.type === 'transitionTaskStatus') {
        await this.transitionTaskStatus(
          String(message.taskId),
          message.status as TaskStatus
        );
      }

      if (message?.type === 'openEntity') {
        await this.openEntity(String(message.entityId));
      }

      if (message?.type === 'openTaskFile') {
        await this.openTaskFile(String(message.taskId));
      }

      if (message?.type === 'copyTaskId') {
        await this.copyTaskId(String(message.taskId));
      }

      if (message?.type === 'createTask') {
        await this.createTask(message.context as Partial<CreateTaskContext>);
      }

      if (message?.type === 'bulkUpdateTasks') {
        await this.bulkUpdateTasks(message as Partial<BulkUpdateRequest>);
      }
    });

    await this.render({ replaceHtml: true });
  }

  async refresh(): Promise<void> {
    if (this.panel) {
      await this.render();
    }
  }

  private async render(options: { replaceHtml?: boolean } = {}): Promise<void> {
    if (!this.panel) {
      return;
    }

    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      this.panel.webview.html = renderMessage('No workspace folder open');
      this.hasRenderedBoard = false;
      return;
    }

    try {
      const payload = await loadBoardPayload(workspaceFolder.uri.fsPath);

      if (!options.replaceHtml && this.hasRenderedBoard) {
        const didPost = await this.panel.webview.postMessage({
          type: 'updateBoard',
          payload
        });

        if (didPost) {
          return;
        }
      }

      this.panel.webview.html = renderBoard(this.panel.webview, payload, this.preferredMode);
      this.hasRenderedBoard = true;
    } catch (error) {
      this.panel.webview.html = renderMessage(
        `Failed to load PlanFS board: ${error instanceof Error ? error.message : String(error)}`
      );
      this.hasRenderedBoard = false;
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

    const workspaceFolder = getPlanFSWorkspaceFolder();
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

  private async transitionTaskStatus(
    taskId: string,
    status: TaskStatus
  ): Promise<void> {
    if (!TASK_STATUSES.includes(status)) {
      vscode.window.showErrorMessage(`Invalid task status: ${status}`);
      await this.render();
      return;
    }

    const workspaceFolder = getPlanFSWorkspaceFolder();
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

      const allowedTargets = QUICK_TRANSITIONS[task.status] ?? [];
      if (!allowedTargets.includes(status)) {
        vscode.window.showErrorMessage(
          `Cannot move ${taskId} from ${task.status} to ${status} with this quick action.`
        );
        await this.render();
        return;
      }

      task.status = status;
      task.updatedAt = new Date().toISOString();
      await saveEntity(workspaceFolder.uri.fsPath, task);
      await this.render();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to update task: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.render();
    }
  }

  private async openEntity(entityId: string): Promise<void> {
    if (!entityId) {
      return;
    }

    await vscode.commands.executeCommand('planfs.openEditor', {
      entity: { id: entityId }
    });
  }

  private async openTaskFile(taskId: string): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const task = repository.tasks.get(taskId);
    if (!task) {
      vscode.window.showErrorMessage(`Task not found: ${taskId}`);
      return;
    }

    const document = await vscode.workspace.openTextDocument(task.filePath);
    await vscode.window.showTextDocument(document);
  }

  private async copyTaskId(taskId: string): Promise<void> {
    if (!taskId) {
      return;
    }

    await vscode.env.clipboard.writeText(taskId);
    vscode.window.showInformationMessage(`Copied ${taskId}`);
  }

  private async createTask(context: Partial<CreateTaskContext>): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const status = TASK_STATUSES.includes(context.status as TaskStatus)
      ? context.status as TaskStatus
      : 'todo';
    const defaults: CreateTaskContext = {
      ...pickTaskContext(context),
      status
    };

    const title = await vscode.window.showInputBox({
      prompt: 'Enter task title',
      placeHolder: 'e.g., Implement board creation flow'
    });

    if (!title) {
      await this.render();
      return;
    }

    const metadata = await vscode.window.showInputBox({
      prompt: 'Review task metadata before creation',
      placeHolder: 'status=todo, epic=EPIC-example, priority=high',
      value: formatTaskContext(defaults)
    });

    if (metadata === undefined) {
      await this.render();
      return;
    }

    let reviewedContext: CreateTaskContext;
    try {
      reviewedContext = {
        ...defaults,
        ...parseTaskContext(metadata)
      };
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.render();
      return;
    }

    if (!TASK_STATUSES.includes(reviewedContext.status)) {
      vscode.window.showErrorMessage(`Invalid task status: ${reviewedContext.status}`);
      await this.render();
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const taskId = getNextTaskId(repository);
      const task = createTaskTemplate(taskId, title);
      task.status = reviewedContext.status;
      task.assignee = reviewedContext.assignee;
      task.epic = reviewedContext.epic;
      task.milestone = reviewedContext.milestone;
      task.priority = reviewedContext.priority as Task['priority'];
      task.tags = reviewedContext.tags;
      task.updatedAt = new Date().toISOString();

      await saveEntity(workspaceFolder.uri.fsPath, task);
      vscode.window.showInformationMessage(`Created task: ${taskId}`);
      await this.render();
      await this.panel?.webview.postMessage({
        type: 'selectTask',
        taskId
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.render();
    }
  }

  private async bulkUpdateTasks(request: Partial<BulkUpdateRequest>): Promise<void> {
    const taskIds = Array.isArray(request.taskIds)
      ? Array.from(new Set(request.taskIds.map(String))).filter(Boolean)
      : [];
    const action = request.action;

    if (taskIds.length === 0) {
      vscode.window.showErrorMessage('No tasks selected for bulk update.');
      await this.render();
      return;
    }

    if (!isBulkUpdateAction(action)) {
      vscode.window.showErrorMessage(`Invalid bulk update action: ${String(action)}`);
      await this.render();
      return;
    }

    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const value = await promptBulkUpdateValue(action, taskIds.length);
    if (value === undefined) {
      await this.render();
      return;
    }

    const confirmation = await vscode.window.showInformationMessage(
      `Apply ${bulkActionLabel(action)} to ${taskIds.length} task${taskIds.length === 1 ? '' : 's'}?`,
      { modal: true },
      'Apply'
    );
    if (confirmation !== 'Apply') {
      await this.render();
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const missingTaskIds = taskIds.filter(taskId => !repository.tasks.has(taskId));
      if (missingTaskIds.length > 0) {
        vscode.window.showErrorMessage(`Cannot bulk update missing tasks: ${missingTaskIds.join(', ')}`);
        await this.render();
        return;
      }

      const updatedTasks = taskIds.map(taskId => repository.tasks.get(taskId)!);
      const now = new Date().toISOString();
      for (const task of updatedTasks) {
        applyBulkUpdate(task, action, value);
        task.updatedAt = now;
      }

      const validation = validateRepositoryState(repository);
      const errors = validation.errors.filter(error => error.severity === 'error');
      if (errors.length > 0) {
        vscode.window.showErrorMessage(
          `Bulk update blocked by validation: ${errors.slice(0, 3).map(error => error.message).join('; ')}`
        );
        await this.render();
        return;
      }

      for (const task of updatedTasks) {
        await saveEntity(workspaceFolder.uri.fsPath, task);
      }

      vscode.window.showInformationMessage(
        `Updated ${updatedTasks.length} task${updatedTasks.length === 1 ? '' : 's'}`
      );
      await this.render();
      await this.panel?.webview.postMessage({ type: 'clearSelection' });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to bulk update tasks: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.render();
    }
  }
}

async function loadBoardPayload(rootPath: string): Promise<BoardPayload> {
  const repository = await loadRepository(rootPath);
  const nextWorkCandidates = getNextWorkCandidates(repository, {
    includeBlocked: true
  });
  const nextWorkByTask = new Map(
    nextWorkCandidates.map((candidate, index) => [
      candidate.task.id,
      {
        candidate,
        rank: index
      }
    ])
  );
  const tasks = Array.from(repository.tasks.values()).map(task => {
    const nextWork = nextWorkByTask.get(task.id);
    const readiness = nextWork?.candidate.readiness
      ?? getTaskReadiness(task, repository);

    return toBoardTask(task, {
      readiness: readiness.status,
      nextWorkReasons: nextWork?.candidate.reasons ?? ['Done'],
      downstreamCount: nextWork?.candidate.downstreamCount ?? 0,
      critical: nextWork?.candidate.critical ?? false,
      nextWorkRank: nextWork?.rank,
      dependents: Array.from(repository.tasks.values())
        .filter(candidate => candidate.dependsOn?.includes(task.id))
        .map(candidate => candidate.id)
        .sort()
    });
  });
  const savedFilters = await loadSavedFilters(rootPath);

  return {
    tasks,
    statuses: TASK_STATUSES,
    savedFilters: savedFilters.map(toBoardSavedFilter)
  };
}

function toBoardTask(
  task: Task,
  nextWork: Pick<BoardTask, 'readiness' | 'nextWorkReasons' | 'downstreamCount' | 'critical' | 'nextWorkRank' | 'dependents'>
): BoardTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    filePath: task.filePath,
    updatedAt: task.updatedAt,
    priority: task.priority,
    assignee: task.assignee,
    epic: task.epic,
    milestone: task.milestone,
    dependsOn: task.dependsOn,
    dependents: nextWork.dependents,
    tags: task.tags,
    dueDate: task.dueDate,
    estimate: task.estimate,
    links: task.links,
    metadata: task.metadata,
    body: task.body,
    readiness: nextWork.readiness,
    nextWorkReasons: nextWork.nextWorkReasons,
    downstreamCount: nextWork.downstreamCount,
    critical: nextWork.critical,
    nextWorkRank: nextWork.nextWorkRank
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

function pickTaskContext(
  context: Partial<CreateTaskContext>
): Partial<CreateTaskContext> {
  return {
    assignee: context.assignee,
    epic: context.epic,
    milestone: context.milestone,
    priority: context.priority,
    tags: context.tags
  };
}

function formatTaskContext(context: Partial<CreateTaskContext>): string {
  return [
    ['status', context.status],
    ['epic', context.epic],
    ['milestone', context.milestone],
    ['assignee', context.assignee],
    ['priority', context.priority],
    ['tags', context.tags?.join('|')]
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

function parseTaskContext(value: string): Partial<CreateTaskContext> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  const context: Partial<CreateTaskContext> = {};
  for (const part of trimmed.split(',')) {
    const [rawKey, ...rawValue] = part.split('=');
    const key = rawKey.trim();
    const parsedValue = rawValue.join('=').trim();

    if (!key || !parsedValue) {
      throw new Error(`Invalid metadata entry: ${part.trim()}`);
    }

    if (key === 'tags') {
      context.tags = parsedValue
        .split('|')
        .map(tag => tag.trim())
        .filter(Boolean);
      continue;
    }

    if (key === 'status') {
      if (!TASK_STATUSES.includes(parsedValue as TaskStatus)) {
        throw new Error(`Invalid task status: ${parsedValue}`);
      }
      context.status = parsedValue as TaskStatus;
      continue;
    }

    if (key === 'epic') {
      context.epic = parsedValue;
      continue;
    }

    if (key === 'milestone') {
      context.milestone = parsedValue;
      continue;
    }

    if (key === 'assignee') {
      context.assignee = parsedValue;
      continue;
    }

    if (key === 'priority') {
      context.priority = parsedValue;
      continue;
    }

    throw new Error(`Unsupported metadata field: ${key}`);
  }

  return context;
}

function isBulkUpdateAction(action: unknown): action is BulkUpdateAction {
  return action === 'status'
    || action === 'assignee'
    || action === 'tag'
    || action === 'epic'
    || action === 'milestone'
    || action === 'priority';
}

async function promptBulkUpdateValue(
  action: BulkUpdateAction,
  taskCount: number
): Promise<string | undefined> {
  const label = bulkActionLabel(action);
  const value = await vscode.window.showInputBox({
    prompt: `${label} for ${taskCount} selected task${taskCount === 1 ? '' : 's'}`,
    placeHolder: bulkActionPlaceholder(action)
  });

  if (value === undefined) {
    return undefined;
  }

  return value.trim();
}

function bulkActionLabel(action: BulkUpdateAction): string {
  return {
    status: 'Set status',
    assignee: 'Set assignee',
    tag: 'Add tag',
    epic: 'Set epic',
    milestone: 'Set milestone',
    priority: 'Set priority'
  }[action];
}

function bulkActionPlaceholder(action: BulkUpdateAction): string {
  return {
    status: 'todo, in-progress, review, or done',
    assignee: 'Assignee name',
    tag: 'Tag to add',
    epic: 'EPIC-example',
    milestone: 'MILESTONE-example',
    priority: 'low, medium, high, or critical'
  }[action];
}

function applyBulkUpdate(
  task: Task,
  action: BulkUpdateAction,
  value: string
): void {
  if (action === 'status') {
    if (!TASK_STATUSES.includes(value as TaskStatus)) {
      throw new Error(`Invalid task status: ${value}`);
    }
    task.status = value as TaskStatus;
    return;
  }

  if (action === 'priority') {
    const priorities = ['low', 'medium', 'high', 'critical'];
    if (!priorities.includes(value)) {
      throw new Error(`Invalid task priority: ${value}`);
    }
    task.priority = value as Task['priority'];
    return;
  }

  if (action === 'tag') {
    if (!value) {
      throw new Error('Tag cannot be empty.');
    }
    task.tags = Array.from(new Set([...(task.tags ?? []), value])).sort();
    return;
  }

  if (action === 'assignee') {
    task.assignee = value || undefined;
    return;
  }

  if (action === 'epic') {
    task.epic = value || undefined;
    return;
  }

  task.milestone = value || undefined;
}

function renderBoard(
  webview: vscode.Webview,
  payload: BoardPayload,
  initialMode: BoardMode = 'status'
): string {
  const nonce = getNonce();
  const serializedPayload = JSON.stringify(payload);
  const serializedInitialMode = JSON.stringify(initialMode);

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

    .bulkBar {
      display: none;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 6px;
      margin: -4px 0 16px;
      padding: 8px 10px;
    }

    .bulkBar.active {
      display: flex;
      flex-wrap: wrap;
    }

    .bulkBar button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 4px 8px;
      font: inherit;
      cursor: pointer;
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

    .modeSwitch {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      min-height: 34px;
    }

    .modeTab {
      color: var(--text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 5px 10px;
      min-height: 26px;
      font: inherit;
      cursor: pointer;
    }

    .modeTab:hover {
      background: color-mix(in srgb, var(--accent) 10%, transparent);
    }

    .modeTab.active {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
      font-weight: 600;
    }

    .modeTab:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(4, var(--column-width));
      gap: var(--gap);
      align-items: start;
      min-width: 920px;
    }

    .board.nextWork {
      grid-template-columns: repeat(5, var(--column-width));
      min-width: 1080px;
    }

    .swimlanes {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      min-width: 920px;
    }

    .swimlane {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: color-mix(in srgb, var(--panel) 72%, transparent);
      overflow: hidden;
    }

    .swimlaneHeader {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--panel-strong);
    }

    .swimlaneTitle {
      font-weight: 650;
      overflow-wrap: anywhere;
    }

    .swimlaneMeta {
      color: var(--muted);
      white-space: nowrap;
    }

    .swimlaneBoard {
      display: grid;
      grid-template-columns: repeat(4, var(--column-width));
      gap: var(--gap);
      align-items: start;
      padding: 10px;
    }

    .content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
      gap: var(--gap);
      align-items: start;
    }

    .boardRegion {
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .detailsDrawer {
      position: sticky;
      top: 18px;
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 6px;
      min-height: 220px;
      overflow: hidden;
    }

    .detailsHeader {
      border-bottom: 1px solid var(--border);
      background: var(--panel-strong);
      padding: 12px;
    }

    .detailsHeader h2 {
      margin: 0 0 4px;
      font-size: 15px;
      line-height: 1.25;
    }

    .detailsBody {
      padding: 12px;
      display: grid;
      gap: 12px;
    }

    .detailGrid {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 6px 10px;
      align-items: baseline;
    }

    .detailLabel {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }

    .detailValue {
      overflow-wrap: anywhere;
    }

    .detailSection h3 {
      margin: 0 0 6px;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--muted);
      letter-spacing: 0;
    }

    .detailActions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .detailActions button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 4px 8px;
      font: inherit;
      cursor: pointer;
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

    .columnHeader button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 2px 6px;
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      text-transform: none;
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

    .card.selected {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }

    .card.bulkSelected {
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 65%, transparent);
    }

    .card:active {
      cursor: grabbing;
    }

    .bulkSelect {
      float: right;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--muted);
      font-size: 11px;
      cursor: pointer;
    }

    .bulkSelect input {
      min-width: 0;
      flex: none;
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

    .badge.reason {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 18%, var(--vscode-badge-background));
    }

    .quickActions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
    }

    .quickActions button,
    .badgeButton {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 4px 7px;
      font: inherit;
      cursor: pointer;
    }

    .badgeButton {
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
      border-color: var(--vscode-badge-background);
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

    .terminalSummary {
      border-top: 1px solid var(--border);
      color: var(--muted);
      display: grid;
      gap: 6px;
      margin-top: 8px;
      padding-top: 10px;
    }

    .terminalSummary button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
      border: 1px solid var(--vscode-button-secondaryBackground, var(--vscode-button-background));
      border-radius: 3px;
      padding: 4px 7px;
      font: inherit;
      cursor: pointer;
      justify-self: start;
    }

    @media (max-width: 980px) {
      .content {
        grid-template-columns: 1fr;
      }

      .detailsDrawer {
        position: static;
      }
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
      <div class="modeSwitch" role="tablist" aria-label="Board view">
        <button type="button" class="modeTab active" role="tab" aria-selected="true" data-mode="status">Status Board</button>
        <button type="button" class="modeTab" role="tab" aria-selected="false" data-mode="next-work">Next Work</button>
      </div>
      <select id="savedFilter" aria-label="Saved filter">
        <option value="">All tasks</option>
      </select>
      <select id="group" aria-label="Group tasks">
        <option value="none">No grouping</option>
        <option value="epic">Group by epic</option>
        <option value="milestone">Group by milestone</option>
        <option value="assignee">Group by assignee</option>
        <option value="priority">Group by priority</option>
      </select>
      <select id="sort" aria-label="Sort tasks">
        <option value="id">Sort by ID</option>
        <option value="title">Sort by title</option>
        <option value="priority">Sort by priority</option>
        <option value="assignee">Sort by assignee</option>
      </select>
    </div>
    <div id="bulkBar" class="bulkBar" aria-live="polite">
      <strong id="bulkCount">0 selected</strong>
      <select id="bulkAction" aria-label="Bulk action">
        <option value="status">Set status</option>
        <option value="assignee">Set assignee</option>
        <option value="tag">Add tag</option>
        <option value="epic">Set epic</option>
        <option value="milestone">Set milestone</option>
        <option value="priority">Set priority</option>
      </select>
      <button type="button" id="bulkApply">Apply</button>
      <button type="button" id="bulkClear">Clear</button>
    </div>
    <div class="content">
      <div class="boardRegion">
        <main id="board" class="board"></main>
      </div>
      <aside id="details" class="detailsDrawer" aria-live="polite"></aside>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let state = ${serializedPayload};
    let selectedTaskId = state.tasks[0]?.id || '';
    const selectedBulkTaskIds = new Set();
    const persistedState = typeof vscode.getState === 'function' ? vscode.getState() : {};
    const initialMode = ${serializedInitialMode};
    let boardMode = initialMode === 'next-work'
      ? 'next-work'
      : persistedState?.boardMode === 'next-work' ? 'next-work' : 'status';
    const groupingModes = ['none', 'epic', 'milestone', 'assignee', 'priority'];
    const terminalStatuses = ['done'];
    const terminalPreviewLimit = 5;
    const expandedTerminalColumns = new Set();
    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const labels = {
      todo: 'Todo',
      'in-progress': 'In Progress',
      review: 'Review',
      done: 'Done'
    };
    const nextWorkGroups = [
      { id: 'ready', label: 'Ready Now' },
      { id: 'in-progress', label: 'In Progress' },
      { id: 'needs-review', label: 'Needs Review' },
      { id: 'blocked', label: 'Blocked' },
      { id: 'later', label: 'Later' }
    ];

    const filterInput = document.getElementById('filter');
    const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
    const savedFilterInput = document.getElementById('savedFilter');
    const groupInput = document.getElementById('group');
    const sortInput = document.getElementById('sort');
    const bulkBar = document.getElementById('bulkBar');
    const bulkCount = document.getElementById('bulkCount');
    const bulkActionInput = document.getElementById('bulkAction');
    const bulkApplyButton = document.getElementById('bulkApply');
    const bulkClearButton = document.getElementById('bulkClear');
    const board = document.getElementById('board');
    const details = document.getElementById('details');

    groupInput.value = groupingModes.includes(persistedState?.groupKey)
      ? persistedState.groupKey
      : 'none';
    renderSavedFilterOptions();
    updateModeButtons();

    filterInput.addEventListener('input', () => render());
    modeButtons.forEach((button, index) => {
      button.addEventListener('click', () => setBoardMode(button.dataset.mode));
      button.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
          return;
        }

        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + direction + modeButtons.length) % modeButtons.length;
        const nextButton = modeButtons[nextIndex];
        nextButton.focus();
        setBoardMode(nextButton.dataset.mode);
      });
    });
    savedFilterInput.addEventListener('change', () => render());
    groupInput.addEventListener('change', () => {
      persistBoardState();
      render();
    });
    sortInput.addEventListener('change', () => render());
    bulkApplyButton.addEventListener('click', () => {
      vscode.postMessage({
        type: 'bulkUpdateTasks',
        taskIds: Array.from(selectedBulkTaskIds),
        action: bulkActionInput.value
      });
    });
    bulkClearButton.addEventListener('click', () => {
      selectedBulkTaskIds.clear();
      render();
    });
    window.addEventListener('message', event => {
      if (event.data?.type !== 'updateBoard') {
        if (event.data?.type === 'selectTask') {
          selectTask(event.data.taskId);
        }
        if (event.data?.type === 'clearSelection') {
          selectedBulkTaskIds.clear();
          render();
        }
        return;
      }

      const selectedFilter = savedFilterInput.value;
      state = event.data.payload;
      const taskIds = new Set(state.tasks.map(task => task.id));
      Array.from(selectedBulkTaskIds).forEach(taskId => {
        if (!taskIds.has(taskId)) {
          selectedBulkTaskIds.delete(taskId);
        }
      });
      if (!state.tasks.some(task => task.id === selectedTaskId)) {
        selectedTaskId = state.tasks[0]?.id || '';
      }
      renderSavedFilterOptions(selectedFilter);
      render({ animate: true });
    });

    function setBoardMode(mode) {
      if (mode !== 'status' && mode !== 'next-work') {
        return;
      }

      boardMode = mode;
      persistBoardState();
      updateModeButtons();
      render();
    }

    function persistBoardState() {
      if (typeof vscode.setState !== 'function') {
        return;
      }

      const currentState = typeof vscode.getState === 'function' ? vscode.getState() : {};
      vscode.setState({ ...(currentState || {}), boardMode, groupKey: groupInput.value });
    }

    function updateModeButtons() {
      modeButtons.forEach(button => {
        const isActive = button.dataset.mode === boardMode;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
        button.tabIndex = isActive ? 0 : -1;
      });
    }

    function renderSavedFilterOptions(selectedFilter = savedFilterInput.value) {
      const allTasks = document.createElement('option');
      allTasks.value = '';
      allTasks.textContent = 'All tasks';
      const options = state.savedFilters.map(filter => {
        const option = document.createElement('option');
        option.value = filter.id;
        option.textContent = filter.name;
        return option;
      });
      savedFilterInput.replaceChildren(allTasks, ...options);
      savedFilterInput.value = state.savedFilters.some(filter => filter.id === selectedFilter)
        ? selectedFilter
        : '';
    }

    function render(options = {}) {
      const previousRects = options.animate ? measureCards() : new Map();
      const filterText = filterInput.value.trim().toLowerCase();
      const savedFilter = state.savedFilters.find(filter => filter.id === savedFilterInput.value);
      const filterContext = savedFilterTaskContext(savedFilter?.criteria);
      const groupKey = groupInput.value;
      const sortKey = sortInput.value;
      const filtered = state.tasks
        .filter(task => matchesSavedFilter(task, savedFilter?.criteria))
        .filter(task => matchesFilter(task, filterText));

      if (boardMode === 'next-work') {
        board.classList.add('nextWork');
        board.classList.remove('swimlanes');
        groupInput.disabled = true;
        sortInput.disabled = true;
        board.replaceChildren(...nextWorkGroups.map(group => renderNextWorkColumn(group, filtered)));
      } else {
        board.classList.remove('nextWork');
        groupInput.disabled = false;
        sortInput.disabled = false;
        const sorted = filtered.sort((a, b) => compareTasks(a, b, sortKey));
        if (groupKey === 'none') {
          board.classList.remove('swimlanes');
          board.replaceChildren(...state.statuses.map(status => renderColumn(
            status,
            sorted,
            filterContext
          )));
        } else {
          board.classList.add('swimlanes');
          board.replaceChildren(...groupTasks(sorted, groupKey).map(group => renderSwimlane(
            group,
            sortKey,
            filterContext
          )));
        }
      }

      if (options.animate) {
        animateMovedCards(previousRects);
      }

      renderDetails();
      renderBulkActions();
    }

    function renderBulkActions() {
      const count = selectedBulkTaskIds.size;
      bulkBar.classList.toggle('active', count > 0);
      bulkCount.textContent = count + ' selected';
      bulkApplyButton.disabled = count === 0;
      bulkClearButton.disabled = count === 0;
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

      if (criteria.status && !matchesValue(task.status, criteria.status)) {
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

    function matchesValue(value, expected) {
      return Array.isArray(expected) ? expected.includes(value) : value === expected;
    }

    function savedFilterTaskContext(criteria) {
      if (!criteria) {
        return {};
      }

      const context = {};
      if (criteria.assignee) context.assignee = criteria.assignee;
      if (criteria.epic) context.epic = criteria.epic;
      if (criteria.priority) context.priority = criteria.priority;
      if (Array.isArray(criteria.tags) && criteria.tags.length > 0) {
        context.tags = criteria.tags;
      }
      return context;
    }

    function groupTasks(tasks, groupKey) {
      const groups = new Map();
      tasks.forEach(task => {
        const value = groupingValue(task, groupKey);
        const existing = groups.get(value.id) || {
          id: value.id,
          label: value.label,
          description: value.description,
          context: value.context,
          tasks: []
        };
        existing.tasks.push(task);
        groups.set(value.id, existing);
      });

      return Array.from(groups.values()).sort((a, b) => compareGroups(a, b, groupKey));
    }

    function groupingValue(task, groupKey) {
      const missing = {
        epic: 'No epic',
        milestone: 'No milestone',
        assignee: 'Unassigned',
        priority: 'No priority'
      };
      const rawValue = task[groupKey];
      const label = rawValue || missing[groupKey] || 'None';
      return {
        id: String(label),
        label: String(label),
        description: groupKey.charAt(0).toUpperCase() + groupKey.slice(1),
        context: rawValue ? { [groupKey]: rawValue } : {}
      };
    }

    function compareGroups(a, b, groupKey) {
      if (groupKey === 'priority') {
        return (priorityRank[a.id] ?? 99) - (priorityRank[b.id] ?? 99) || a.label.localeCompare(b.label);
      }

      return a.label.localeCompare(b.label);
    }

    function renderSwimlane(group, sortKey, filterContext) {
      const section = document.createElement('section');
      section.className = 'swimlane';

      const header = document.createElement('div');
      header.className = 'swimlaneHeader';
      header.innerHTML = [
        '<div>',
          '<div class="swimlaneTitle">' + escapeHtml(group.label) + '</div>',
          '<div class="subtle">' + escapeHtml(group.description) + '</div>',
        '</div>',
        '<div class="swimlaneMeta">' + group.tasks.length + ' task' + (group.tasks.length === 1 ? '' : 's') + '</div>'
      ].join('');

      const row = document.createElement('div');
      row.className = 'swimlaneBoard';
      row.append(...state.statuses.map(status => renderColumn(
        status,
        group.tasks.slice().sort((a, b) => compareTasks(a, b, sortKey)),
        { ...filterContext, ...group.context }
      )));

      section.append(header, row);
      return section;
    }

    function renderColumn(status, tasks, context = {}) {
      const columnTasks = tasks.filter(task => task.status === status);
      const terminalColumn = terminalStatuses.includes(status);
      const terminalKey = terminalColumnKey(status, context);
      const terminalExpanded = expandedTerminalColumns.has(terminalKey);
      const visibleTasks = terminalColumn && !terminalExpanded
        ? columnTasks.slice(0, terminalPreviewLimit)
        : columnTasks;
      const hiddenCount = columnTasks.length - visibleTasks.length;
      const column = document.createElement('section');
      column.className = 'column';
      const createContext = { ...context, status };

      const header = document.createElement('div');
      header.className = 'columnHeader';
      header.innerHTML = [
        '<span>' + labels[status] + '</span>',
        '<span class="count">' + columnTasks.length + '</span>',
        '<button type="button" data-create-context="' + escapeHtml(JSON.stringify(createContext)) + '" title="Create task in ' + escapeHtml(labels[status]) + '">+</button>'
      ].join('');

      const createButton = header.querySelector('[data-create-context]');
      if (createButton) {
        createButton.addEventListener('click', event => {
          event.stopPropagation();
          vscode.postMessage({
            type: 'createTask',
            context: JSON.parse(createButton.dataset.createContext)
          });
        });
      }

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

      if (visibleTasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No tasks';
        dropzone.append(empty);
      } else {
        dropzone.append(...visibleTasks.map(task => renderCard(task)));
      }

      if (terminalColumn && columnTasks.length > terminalPreviewLimit) {
        const terminalSummary = document.createElement('div');
        terminalSummary.className = 'terminalSummary';
        const hiddenLabel = terminalExpanded
          ? 'Showing all ' + columnTasks.length + ' completed tasks'
          : hiddenCount + ' completed task' + (hiddenCount === 1 ? '' : 's') + ' hidden';
        terminalSummary.innerHTML = [
          '<span>' + hiddenLabel + '</span>',
          '<button type="button" data-toggle-terminal="' + escapeHtml(terminalKey) + '">' + (terminalExpanded ? 'Show fewer' : 'Show all') + '</button>'
        ].join('');

        const toggleButton = terminalSummary.querySelector('[data-toggle-terminal]');
        if (toggleButton) {
          toggleButton.addEventListener('click', () => {
            if (expandedTerminalColumns.has(terminalKey)) {
              expandedTerminalColumns.delete(terminalKey);
            } else {
              expandedTerminalColumns.add(terminalKey);
            }
            render();
          });
        }
        dropzone.append(terminalSummary);
      }

      column.append(header, dropzone);
      return column;
    }

    function terminalColumnKey(status, context) {
      return status + ':' + JSON.stringify(stableContext(context));
    }

    function stableContext(context) {
      return Object.keys(context)
        .sort()
        .reduce((stable, key) => {
          stable[key] = context[key];
          return stable;
        }, {});
    }

    function renderNextWorkColumn(group, tasks) {
      const columnTasks = tasks
        .filter(task => nextWorkGroupForTask(task) === group.id)
        .sort(compareNextWorkTasks);
      const column = document.createElement('section');
      column.className = 'column';

      const header = document.createElement('div');
      header.className = 'columnHeader';
      header.innerHTML = '<span>' + group.label + '</span><span class="count">' + columnTasks.length + '</span>';

      const dropzone = document.createElement('div');
      dropzone.className = 'dropzone';

      if (columnTasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No tasks';
        dropzone.append(empty);
      } else {
        dropzone.append(...columnTasks.map(task => renderCard(task, { showReasons: true })));
      }

      column.append(header, dropzone);
      return column;
    }

    function nextWorkGroupForTask(task) {
      if (task.status === 'done') return null;
      if (task.readiness === 'ready') return 'ready';
      if (task.readiness === 'in-progress') return 'in-progress';
      if (task.readiness === 'needs-review') return 'needs-review';
      if (task.readiness === 'blocked' || task.readiness === 'missing-dependency') return 'blocked';
      return 'later';
    }

    function compareNextWorkTasks(a, b) {
      return (a.nextWorkRank ?? 9999) - (b.nextWorkRank ?? 9999) || compareTasks(a, b, 'priority');
    }

    function renderCard(task, options = {}) {
      const card = document.createElement('article');
      card.className = [
        'card',
        task.status,
        task.id === selectedTaskId ? 'selected' : '',
        selectedBulkTaskIds.has(task.id) ? 'bulkSelected' : ''
      ].filter(Boolean).join(' ');
      card.dataset.taskId = task.id;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Select ' + task.id + ': ' + task.title);
      card.draggable = true;
      card.addEventListener('click', () => selectTask(task.id));
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        selectTask(task.id);
      });
      card.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
      });

      const meta = [task.priority, task.assignee].filter(Boolean);
      const reasons = options.showReasons
        ? (task.nextWorkReasons || []).slice(0, 3)
        : [];
      const actions = [
        task.status === 'todo' && task.readiness === 'ready'
          ? '<button type="button" data-transition-task="' + escapeHtml(task.id) + '" data-status="in-progress">Start work</button>'
          : '',
        task.status === 'in-progress'
          ? '<button type="button" data-transition-task="' + escapeHtml(task.id) + '" data-status="review">Mark ready for review</button>'
          : '',
        task.status === 'in-progress' || task.status === 'review'
          ? '<button type="button" data-transition-task="' + escapeHtml(task.id) + '" data-status="done">Mark done</button>'
          : ''
      ].filter(Boolean).join('');
      card.innerHTML = [
        '<label class="bulkSelect"><input type="checkbox" data-bulk-select="' + escapeHtml(task.id) + '"' + (selectedBulkTaskIds.has(task.id) ? ' checked' : '') + '>Select</label>',
        '<div class="cardId">' + escapeHtml(task.id) + '</div>',
        '<div class="cardTitle">' + escapeHtml(task.title) + '</div>',
        '<div class="meta">' +
          meta.map(value => '<span class="badge">' + escapeHtml(value) + '</span>').join('') +
          (task.epic ? '<button type="button" class="badgeButton" data-open-entity="' + escapeHtml(task.epic) + '" title="Open epic details">' + escapeHtml(task.epic) + '</button>' : '') +
          reasons.map(value => '<span class="badge reason">' + escapeHtml(value) + '</span>').join('') +
        '</div>',
        actions ? '<div class="quickActions">' + actions + '</div>' : ''
      ].join('');

      const bulkCheckbox = card.querySelector('[data-bulk-select]');
      if (bulkCheckbox) {
        bulkCheckbox.addEventListener('click', event => event.stopPropagation());
        bulkCheckbox.addEventListener('change', event => {
          event.stopPropagation();
          if (bulkCheckbox.checked) {
            selectedBulkTaskIds.add(task.id);
          } else {
            selectedBulkTaskIds.delete(task.id);
          }
          render();
        });
      }

      card.querySelectorAll('[data-open-entity]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          vscode.postMessage({ type: 'openEntity', entityId: button.dataset.openEntity });
        });
      });

      card.querySelectorAll('[data-transition-task]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          vscode.postMessage({
            type: 'transitionTaskStatus',
            taskId: button.dataset.transitionTask,
            status: button.dataset.status
          });
        });
      });

      return card;
    }

    function selectTask(taskId) {
      selectedTaskId = taskId;
      render();
    }

    function renderDetails() {
      const task = state.tasks.find(candidate => candidate.id === selectedTaskId);
      if (!task) {
        details.innerHTML = [
          '<div class="detailsHeader"><h2>Task Details</h2><div class="subtle">Select a task card to inspect it.</div></div>',
          '<div class="detailsBody"><div class="empty">No task selected</div></div>'
        ].join('');
        return;
      }

      details.innerHTML = [
        '<div class="detailsHeader">',
          '<h2>' + escapeHtml(task.title) + '</h2>',
          '<div class="subtle">' + escapeHtml(task.id) + '</div>',
        '</div>',
        '<div class="detailsBody">',
          '<div class="detailActions">',
            '<button type="button" data-open-selected="' + escapeHtml(task.id) + '">Open editor</button>',
            '<button type="button" data-open-file="' + escapeHtml(task.id) + '">Open Markdown</button>',
            '<button type="button" data-copy-selected="' + escapeHtml(task.id) + '">Copy ID</button>',
            task.epic ? '<button type="button" data-open-selected="' + escapeHtml(task.epic) + '">Open epic</button>' : '',
          '</div>',
          renderDetailGrid(task),
          renderDetailSection('Next Work', task.nextWorkReasons || []),
          renderDetailSection('Dependencies', task.dependsOn || []),
          renderDetailSection('Dependents', task.dependents || []),
          renderLinkSection(task.links || {}),
        '</div>'
      ].join('');

      details.querySelectorAll('[data-open-selected]').forEach(button => {
        button.addEventListener('click', () => {
          vscode.postMessage({ type: 'openEntity', entityId: button.dataset.openSelected });
        });
      });

      details.querySelectorAll('[data-open-file]').forEach(button => {
        button.addEventListener('click', () => {
          vscode.postMessage({ type: 'openTaskFile', taskId: button.dataset.openFile });
        });
      });

      details.querySelectorAll('[data-copy-selected]').forEach(button => {
        button.addEventListener('click', () => {
          vscode.postMessage({ type: 'copyTaskId', taskId: button.dataset.copySelected });
        });
      });
    }

    function renderDetailGrid(task) {
      const rows = [
        ['Status', task.status],
        ['Readiness', task.readiness],
        ['Priority', task.priority],
        ['Assignee', task.assignee],
        ['Epic', task.epic],
        ['Milestone', task.milestone],
        ['Tags', (task.tags || []).join(', ')],
        ['Due date', task.dueDate],
        ['Estimate', task.estimate],
        ['Critical', task.critical ? 'yes' : 'no'],
        ['Unblocks', task.downstreamCount ? String(task.downstreamCount) : '0']
      ].filter(row => row[1]);

      return '<div class="detailGrid">' + rows.map(row =>
        '<div class="detailLabel">' + escapeHtml(row[0]) + '</div><div class="detailValue">' + escapeHtml(row[1]) + '</div>'
      ).join('') + '</div>';
    }

    function renderDetailSection(title, values) {
      const content = values.length > 0
        ? '<div class="meta">' + values.map(value => '<span class="badge">' + escapeHtml(value) + '</span>').join('') + '</div>'
        : '<div class="subtle">None</div>';
      return '<section class="detailSection"><h3>' + escapeHtml(title) + '</h3>' + content + '</section>';
    }

    function renderLinkSection(links) {
      const entries = Object.entries(links);
      if (entries.length === 0) {
        return '<section class="detailSection"><h3>Links</h3><div class="subtle">None</div></section>';
      }

      return '<section class="detailSection"><h3>Links</h3><div class="detailGrid">' + entries.map(entry =>
        '<div class="detailLabel">' + escapeHtml(entry[0]) + '</div><div class="detailValue">' + escapeHtml(entry[1]) + '</div>'
      ).join('') + '</div></section>';
    }

    function measureCards() {
      return new Map(
        Array.from(board.querySelectorAll('.card[data-task-id]')).map(card => [
          card.dataset.taskId,
          card.getBoundingClientRect()
        ])
      );
    }

    function animateMovedCards(previousRects) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      requestAnimationFrame(() => {
        board.querySelectorAll('.card[data-task-id]').forEach(card => {
          const previousRect = previousRects.get(card.dataset.taskId);
          if (!previousRect) {
            return;
          }

          const nextRect = card.getBoundingClientRect();
          const deltaX = previousRect.left - nextRect.left;
          const deltaY = previousRect.top - nextRect.top;

          if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
            return;
          }

          card.animate(
            [
              { transform: 'translate(' + deltaX + 'px, ' + deltaY + 'px)' },
              { transform: 'translate(0, 0)' }
            ],
            {
              duration: 220,
              easing: 'cubic-bezier(0.2, 0, 0, 1)'
            }
          );
        });
      });
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
