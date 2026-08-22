/**
 * Kanban board webview provider
 */

import * as vscode from 'vscode';
import {
  bulkUpdateTasks as bulkUpdateTaskSet,
  createTaskTemplate,
  getNextTaskId,
  getNextWorkCandidates,
  getTaskReadiness,
  loadRepository,
  loadSavedFilters,
  searchTasks,
  SavedFilter,
  saveEntity,
  saveSavedFilter,
  deleteSavedFilter,
  Task,
  TaskReadiness,
  RefinementState,
  TaskStatus
} from 'planfs-core';
import {
  createHelpTopics,
  handleHelpMessage,
  HelpTopic
} from './help';
import { renderBoard } from './board-view';
import { renderMessageDocument } from './webview';
import { PlanFSUiPreferences, UI_PREFERENCES } from './preferences';
import { getPlanFSWorkspaceFolder } from './workspace';

const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
const QUICK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in-progress'],
  'in-progress': ['review', 'done'],
  review: ['done'],
  done: []
};
const REFINEMENT_STATES: RefinementState[] = ['captured', 'needs-refinement', 'ready', 'deferred', 'discarded'];

export interface BoardTask {
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
  refinementState?: RefinementState;
  links?: Record<string, string>;
  metadata: Record<string, unknown>;
  body: string;
  readiness: TaskReadiness;
  nextWorkReasons: string[];
  downstreamCount: number;
  critical: boolean;
  nextWorkRank?: number;
}

export interface BoardPayload {
  tasks: BoardTask[];
  milestones: Array<{ id: string; title: string }>;
  statuses: TaskStatus[];
  savedFilters: SavedFilter[];
  helpTopics: HelpTopic[];
  preferences: BoardPreferences;
}

export interface BoardPreferences {
  detailsPanelWidth: number;
  detailsPanelCompact: boolean;
  boardScope: BoardScope;
  milestoneFocus: string;
}

interface CreateTaskContext {
  status: TaskStatus;
  assignee?: string;
  epic?: string;
  milestone?: string;
  priority?: string;
  tags?: string[];
}

type BulkUpdateAction = 'status' | 'assignee' | 'milestone' | 'priority' | 'estimate';
export type BoardMode = 'status' | 'next-work';
export type BoardScope = 'actionable' | 'all-open' | 'backlog' | 'saved-filter';

interface BulkUpdateRequest {
  taskIds: string[];
  action: BulkUpdateAction;
  expectedUpdatedAtByTaskId?: Record<string, string | undefined>;
}

export class BoardProvider {
  private panel: vscode.WebviewPanel | undefined;
  private hasRenderedBoard = false;
  private preferredMode: BoardMode = 'status';
  private workspaceUri: string | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly uiPreferences?: PlanFSUiPreferences
  ) {}

  async open(mode: BoardMode = 'status'): Promise<void> {
    this.preferredMode = mode;

    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }
    this.workspaceUri ??= workspaceFolder.uri.toString();

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      await this.render({ replaceHtml: mode === 'next-work' });
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'planfsBoard',
      `PlanFS Board — ${workspaceFolder.name}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri]
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      this.hasRenderedBoard = false;
      this.workspaceUri = undefined;
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

      if (message?.type === 'updateTaskRefinementState') {
        await this.updateTaskRefinementState(
          String(message.taskId),
          message.refinementState as RefinementState
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
      if (message?.type === 'saveCurrentFilter') {
        await this.saveCurrentFilter(message.criteria as Record<string, unknown>);
      }
      if (message?.type === 'manageSavedFilter') await this.manageSavedFilter(String(message.id));

      if (message?.type === 'bulkUpdateTasks') {
        await this.bulkUpdateTasks(message as Partial<BulkUpdateRequest>);
      }

      if (message?.type === 'setBoardPreference') {
        await this.setBoardPreference(message);
      }

      await handleHelpMessage(this.extensionUri, message);
    });

    await this.render({ replaceHtml: true });
  }

  private async saveCurrentFilter(criteria: Record<string, unknown>): Promise<void> {
    const workspaceFolder = this.workspaceFolder();
    if (!workspaceFolder) return;
    const name = await vscode.window.showInputBox({ prompt: 'Name this shared board filter' });
    if (!name) return;
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    await saveSavedFilter(workspaceFolder.uri.fsPath, { id, name, criteria: criteria as never });
    await this.render();
  }

  private async manageSavedFilter(id: string): Promise<void> {
    const workspaceFolder = this.workspaceFolder();
    if (!workspaceFolder || !id) return;
    const filter = (await loadSavedFilters(workspaceFolder.uri.fsPath)).find(item => item.id === id);
    if (!filter) return;
    const action = await vscode.window.showQuickPick(['Rename', 'Duplicate', 'Delete'], { title: `Manage shared filter: ${filter.name}` });
    if (action === 'Delete') await deleteSavedFilter(workspaceFolder.uri.fsPath, id);
    if (action === 'Rename' || action === 'Duplicate') {
      const name = await vscode.window.showInputBox({ prompt: `${action} shared filter`, value: action === 'Rename' ? filter.name : `${filter.name} copy` });
      if (name) {
        const nextId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        await saveSavedFilter(workspaceFolder.uri.fsPath, { ...filter, id: nextId, name }, action === 'Rename' ? id : undefined);
      }
    }
    await this.render();
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

    const workspaceFolder = this.workspaceFolder();
    if (!workspaceFolder) {
      this.panel.webview.html = renderMessage('No workspace folder open');
      this.hasRenderedBoard = false;
      return;
    }

    try {
      const preferences = this.getPreferences(workspaceFolder);
      const boardPayload = await loadBoardPayload(workspaceFolder.uri.fsPath, preferences.milestoneFocus);
      if (
        preferences.milestoneFocus
        && !boardPayload.milestones.some(milestone => milestone.id === preferences.milestoneFocus)
      ) {
        preferences.milestoneFocus = '';
        await this.uiPreferences?.clear(UI_PREFERENCES.boardMilestoneFocus, workspaceFolder);
      }
      const payload = {
        ...boardPayload,
        preferences,
        helpTopics: createHelpTopics(this.extensionUri, ['board'])
      };

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

    const workspaceFolder = this.workspaceFolder();
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

    const workspaceFolder = this.workspaceFolder();
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

  private async updateTaskRefinementState(
    taskId: string,
    refinementState: RefinementState
  ): Promise<void> {
    if (!REFINEMENT_STATES.includes(refinementState)) {
      vscode.window.showErrorMessage(`Invalid refinement state: ${refinementState}`);
      await this.render();
      return;
    }

    const workspaceFolder = this.workspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    if (refinementState === 'discarded') {
      const answer = await vscode.window.showWarningMessage(
        `Discard ${taskId} from active planning?`,
        { modal: true },
        'Discard'
      );
      if (answer !== 'Discard') {
        await this.render();
        return;
      }
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const task = repository.tasks.get(taskId);

      if (!task) {
        vscode.window.showErrorMessage(`Task not found: ${taskId}`);
        return;
      }

      if (task.refinementState !== refinementState) {
        task.refinementState = refinementState;
        task.updatedAt = new Date().toISOString();
        await saveEntity(workspaceFolder.uri.fsPath, task);
      }

      await this.render();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to update task refinement state: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.render();
    }
  }

  private async openEntity(entityId: string): Promise<void> {
    if (!entityId) {
      return;
    }

    await vscode.commands.executeCommand('planfs.openItem', {
      entity: { id: entityId }
    });
  }

  private async openTaskFile(taskId: string): Promise<void> {
    const workspaceFolder = this.workspaceFolder();
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
    const workspaceFolder = this.workspaceFolder();
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
      task.refinementState = 'ready';
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

    const workspaceFolder = this.workspaceFolder();
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
      const result = await bulkUpdateTaskSet(workspaceFolder.uri.fsPath, repository, {
        taskIds,
        patch: { [action]: value },
        expectedUpdatedAt: request.expectedUpdatedAtByTaskId
      });

      vscode.window.showInformationMessage(
        `Updated ${result.changedTasks.length} task${result.changedTasks.length === 1 ? '' : 's'}`
      );
      await this.render();
      await this.panel?.webview.postMessage({ type: 'clearSelection' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        message.startsWith('Bulk update failed validation:')
          ? `Bulk update blocked by validation: ${message.replace('Bulk update failed validation: ', '')}`
          : `Failed to bulk update tasks: ${message}`
      );
      await this.render();
    }
  }

  private workspaceFolder(): vscode.WorkspaceFolder | undefined {
    return this.workspaceUri
      ? vscode.workspace.workspaceFolders?.find(folder => folder.uri.toString() === this.workspaceUri)
      : getPlanFSWorkspaceFolder();
  }

  private getPreferences(workspaceFolder: vscode.WorkspaceFolder): BoardPreferences {
    return {
      detailsPanelWidth: this.uiPreferences?.get(
        UI_PREFERENCES.boardDetailsPanelWidth,
        workspaceFolder
      ) ?? UI_PREFERENCES.boardDetailsPanelWidth.defaultValue,
      detailsPanelCompact: this.uiPreferences?.get(
        UI_PREFERENCES.boardDetailsPanelCompact,
        workspaceFolder
      ) ?? UI_PREFERENCES.boardDetailsPanelCompact.defaultValue,
      boardScope: normalizeBoardScope(this.uiPreferences?.get(
        UI_PREFERENCES.boardScope,
        workspaceFolder
      )),
      milestoneFocus: this.uiPreferences?.get(
        UI_PREFERENCES.boardMilestoneFocus,
        workspaceFolder
      ) ?? ''
    };
  }

  private async setBoardPreference(message: unknown): Promise<void> {
    if (!this.uiPreferences || !message || typeof message !== 'object') {
      return;
    }

    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    const request = message as { key?: unknown; value?: unknown };
    if (
      request.key === UI_PREFERENCES.boardDetailsPanelWidth.key
      && typeof request.value === 'number'
    ) {
      await this.uiPreferences.set(
        UI_PREFERENCES.boardDetailsPanelWidth,
        clampDetailsPanelWidth(request.value),
        workspaceFolder
      );
    }

    if (
      request.key === UI_PREFERENCES.boardDetailsPanelCompact.key
      && typeof request.value === 'boolean'
    ) {
      await this.uiPreferences.set(
        UI_PREFERENCES.boardDetailsPanelCompact,
        request.value,
        workspaceFolder
      );
    }

    if (
      request.key === UI_PREFERENCES.boardScope.key
      && typeof request.value === 'string'
    ) {
      await this.uiPreferences.set(
        UI_PREFERENCES.boardScope,
        normalizeBoardScope(request.value),
        workspaceFolder
      );
    }

    if (request.key === UI_PREFERENCES.boardMilestoneFocus.key && typeof request.value === 'string') {
      await this.uiPreferences.set(UI_PREFERENCES.boardMilestoneFocus, request.value, workspaceFolder);
      await this.render();
    }
  }
}

function normalizeBoardScope(value: unknown): BoardScope {
  return value === 'all-open' || value === 'backlog' || value === 'saved-filter'
    ? value
    : 'actionable';
}

export function taskMatchesBoardScope(
  task: { status: TaskStatus; refinementState?: RefinementState },
  scope: BoardScope
): boolean {
  if (scope === 'saved-filter') {
    return true;
  }

  if (scope === 'all-open') {
    return task.status !== 'done';
  }

  if (scope === 'backlog') {
    return task.status !== 'done'
      && ['captured', 'needs-refinement', 'deferred', 'discarded'].includes(task.refinementState ?? '');
  }

  return task.status !== 'done'
    && (task.refinementState === 'ready' || task.status === 'in-progress' || task.status === 'review');
}

function clampDetailsPanelWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return UI_PREFERENCES.boardDetailsPanelWidth.defaultValue;
  }

  return Math.min(560, Math.max(280, Math.round(width)));
}

async function loadBoardPayload(
  rootPath: string,
  requestedMilestoneFocus = ''
): Promise<Omit<BoardPayload, 'helpTopics' | 'preferences'>> {
  const repository = await loadRepository(rootPath);
  const milestones = Array.from(repository.milestones.values())
    .filter(milestone => milestone.status === 'active')
    .map(milestone => ({ id: milestone.id, title: milestone.title }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const milestoneFocus = milestones.some(milestone => milestone.id === requestedMilestoneFocus)
    ? requestedMilestoneFocus
    : '';
  const nextWorkCandidates = getNextWorkCandidates(repository, {
    includeBlocked: true,
    milestone: milestoneFocus || undefined
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
  const tasks = searchTasks(repository, { milestone: milestoneFocus || undefined }).map(task => {
    const nextWork = nextWorkByTask.get(task.id);
    const readiness = nextWork?.candidate.readiness
      ?? getTaskReadiness(task, repository);

    return toBoardTask(task, {
      readiness: readiness.status,
      nextWorkReasons: [
        ...(nextWork?.candidate.reasons ?? ['Done']),
        ...(milestoneFocus ? [`Milestone focus: ${milestoneFocus}`] : [])
      ],
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
    milestones,
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
    refinementState: task.refinementState,
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
  return renderMessageDocument('PlanFS Board', message);
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
    || action === 'milestone'
    || action === 'priority'
    || action === 'estimate';
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
    milestone: 'Set milestone',
    priority: 'Set priority',
    estimate: 'Set estimate'
  }[action];
}
function bulkActionPlaceholder(action: BulkUpdateAction): string {
  return {
    status: 'todo, in-progress, review, or done',
    assignee: 'Assignee name',
    milestone: 'MILESTONE-example',
    priority: 'low, medium, high, or critical',
    estimate: '2d, 3h, or team estimate'
  }[action];
}
