/**
 * Explorer tree view provider
 */

import * as vscode from 'vscode';
import {
  getCurrentRepositoryUser,
  getNextWorkCandidates,
  listBacklogTasks,
  loadRepository,
  getAllEntities,
  loadSavedFilters,
  reviewBacklog,
  searchEntities
} from 'planfs-core';
import {
  Decision,
  Entity,
  Epic,
  Milestone,
  NextWorkCandidate,
  RefinementState,
  Repository,
  SavedFilter,
  Task,
  TaskStatus
} from 'planfs-core';
import { getPlanFSWorkspaceFolder } from './workspace';

export class ExplorerProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> =
    new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private repository: Repository | null = null;
  private entities: Entity[] = [];
  private savedFilters: SavedFilter[] = [];
  private activeFilter: SavedFilter | null = null;
  private nextWorkCandidates: NextWorkCandidate[] = [];
  private currentWorkTasks: Task[] = [];
  private backlogTasks: BacklogQuickTask[] = [];

  async refresh(): Promise<void> {
    try {
      const workspaceFolder = getPlanFSWorkspaceFolder();
      if (!workspaceFolder) {
        this.repository = null;
        this.entities = [];
        this.nextWorkCandidates = [];
        this.currentWorkTasks = [];
        this.backlogTasks = [];
      } else {
        this.repository = await loadRepository(workspaceFolder.uri.fsPath);
        this.savedFilters = await loadSavedFilters(workspaceFolder.uri.fsPath);
        this.entities = this.activeFilter
          ? searchEntities(this.repository, this.activeFilter.criteria)
          : getAllEntities(this.repository);
        this.nextWorkCandidates = getNextWorkCandidates(this.repository, {
          limit: 3
        });
        this.currentWorkTasks = await getCurrentWorkTasks(
          this.repository,
          workspaceFolder.uri.fsPath
        );
        this.backlogTasks = getBacklogQuickTasks(this.repository);
      }
    } catch (error) {
      console.error('Failed to load repository:', error);
      this.repository = null;
      this.entities = [];
      this.nextWorkCandidates = [];
      this.currentWorkTasks = [];
      this.backlogTasks = [];
    }

    this._onDidChangeTreeData.fire(null);
  }

  async applySavedFilter(): Promise<void> {
    if (this.savedFilters.length === 0) {
      vscode.window.showInformationMessage('No PlanFS saved filters found');
      return;
    }

    const selected = await vscode.window.showQuickPick(
      this.savedFilters.map(filter => ({
        label: filter.name,
        description: filter.id,
        detail: filter.description,
        filter
      })),
      {
        title: 'Apply PlanFS Saved Filter',
        placeHolder: 'Select a saved filter'
      }
    );

    if (!selected) {
      return;
    }

    this.activeFilter = selected.filter;
    await this.refresh();
  }

  async clearSavedFilter(): Promise<void> {
    this.activeFilter = null;
    await this.refresh();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!this.repository) {
      return Promise.resolve([new TreeItem('No repository found', vscode.TreeItemCollapsibleState.None)]);
    }

    if (!element) {
      // Root level - show categories
      const rootItems: TreeItem[] = [
        new TreeItem(
          this.activeFilter ? `Filter: ${this.activeFilter.name}` : 'No saved filter',
          vscode.TreeItemCollapsibleState.None,
          'filter'
        )
      ];

      if (this.currentWorkTasks.length > 0) {
        const section = new TreeItem(
          'Current Work',
          vscode.TreeItemCollapsibleState.Expanded,
          'current-work',
          'current-work'
        );
        section.description = `${this.currentWorkTasks.length} active`;
        section.iconPath = new vscode.ThemeIcon('person');
        rootItems.push(section);
      }

      if (this.nextWorkCandidates.length > 0) {
        const section = new TreeItem(
          'Next Work',
          vscode.TreeItemCollapsibleState.Expanded,
          'next-work',
          'next-work'
        );
        section.description = `${this.nextWorkCandidates.length} ready`;
        section.iconPath = new vscode.ThemeIcon('target');
        rootItems.push(section);
      }

      if (this.backlogTasks.length > 0) {
        const reviewCount = this.backlogTasks.filter(item => item.needsReview).length;
        const section = new TreeItem(
          'Backlog',
          vscode.TreeItemCollapsibleState.Expanded,
          'backlog',
          'backlog'
        );
        section.description = reviewCount > 0
          ? `${this.backlogTasks.length} items | ${reviewCount} need review`
          : `${this.backlogTasks.length} items`;
        section.iconPath = new vscode.ThemeIcon('inbox');
        rootItems.push(section);
      }

      rootItems.push(
        new TreeItem('Tasks', vscode.TreeItemCollapsibleState.Collapsed, 'tasks', 'tasks'),
        new TreeItem('Epics', vscode.TreeItemCollapsibleState.Collapsed, 'epics', 'epics'),
        new TreeItem('Milestones', vscode.TreeItemCollapsibleState.Collapsed, 'milestones', 'milestones'),
        new TreeItem('Decisions', vscode.TreeItemCollapsibleState.Collapsed, 'decisions', 'decisions')
      );

      return Promise.resolve(rootItems);
    }

    if (element.type === 'backlog') {
      const taskItems = this.backlogTasks.map((item, index) =>
        createBacklogTaskItem(item, index)
      );
      taskItems.push(createOpenBacklogItem());
      return Promise.resolve(taskItems);
    }

    if (element.type === 'next-work') {
      const taskItems = this.nextWorkCandidates.map((candidate, index) =>
        createNextWorkTaskItem(candidate, index)
      );
      taskItems.push(createOpenNextWorkBoardItem());
      return Promise.resolve(taskItems);
    }

    if (element.type === 'current-work') {
      return Promise.resolve(
        this.currentWorkTasks.map((task, index) => createCurrentWorkTaskItem(task, index))
      );
    }

    // Show items in category
    if (element.type === 'tasks') {
      const tasks = this.entities.filter(entity => entity.type === 'task') as Task[];
      return Promise.resolve(
        tasks.map(t => new TreeItem(
          `${t.id}: ${t.title}`,
          vscode.TreeItemCollapsibleState.None,
          'task',
          t.id,
          t
        ))
      );
    }

    if (element.type === 'epics') {
      const epics = this.entities.filter(entity => entity.type === 'epic') as Epic[];
      return Promise.resolve(
        epics.map(e => new TreeItem(
          `${e.id}: ${e.title}`,
          vscode.TreeItemCollapsibleState.None,
          'epic',
          e.id,
          e
        ))
      );
    }

    if (element.type === 'milestones') {
      const milestones = this.entities.filter(entity => entity.type === 'milestone') as Milestone[];
      return Promise.resolve(
        milestones.map(m => new TreeItem(
          `${m.id}: ${m.title}`,
          vscode.TreeItemCollapsibleState.None,
          'milestone',
          m.id,
          m
        ))
      );
    }

    if (element.type === 'decisions') {
      const decisions = this.entities.filter(entity => entity.type === 'decision') as Decision[];
      return Promise.resolve(
        decisions.map(d => new TreeItem(
          `${d.id}: ${d.title}`,
          vscode.TreeItemCollapsibleState.None,
          'decision',
          d.id,
          d
        ))
      );
    }

    return Promise.resolve([]);
  }
}

interface BacklogQuickTask {
  task: Task;
  needsReview: boolean;
  reasons: string[];
}

const EXPLORER_BACKLOG_STATES: RefinementState[] = [
  'captured',
  'needs-refinement',
  'deferred',
  'ready'
];

function getBacklogQuickTasks(repository: Repository): BacklogQuickTask[] {
  const reviewItems = new Map(
    reviewBacklog(repository).map(item => [item.task.id, item])
  );

  return listBacklogTasks(repository, {
    refinementState: EXPLORER_BACKLOG_STATES
  }).map(task => {
    const reviewItem = reviewItems.get(task.id);
    return {
      task,
      needsReview: Boolean(reviewItem),
      reasons: reviewItem?.reasons ?? []
    };
  });
}

async function getCurrentWorkTasks(
  repository: Repository,
  rootPath: string
): Promise<Task[]> {
  const currentUser = await getCurrentRepositoryUser(rootPath);
  if (!currentUser) {
    return [];
  }

  const aliases = new Set(
    currentUser.aliases.map((alias: string) => alias.toLowerCase())
  );
  return Array.from(repository.tasks.values())
    .filter(task => task.status === 'in-progress' || task.status === 'review')
    .filter(task => task.assignee && aliases.has(task.assignee.toLowerCase()))
    .sort(compareCurrentWorkTasks);
}

function compareCurrentWorkTasks(a: Task, b: Task): number {
  return currentWorkStatusRank(a.status) - currentWorkStatusRank(b.status)
    || compareOptionalDate(a.dueDate, b.dueDate)
    || comparePriority(a.priority, b.priority)
    || a.id.localeCompare(b.id);
}

function currentWorkStatusRank(status: TaskStatus): number {
  return status === 'review' ? 0 : 1;
}

function compareOptionalDate(a: string | undefined, b: string | undefined): number {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return a.localeCompare(b);
}

function comparePriority(a: Task['priority'], b: Task['priority']): number {
  return priorityRank(a) - priorityRank(b);
}

function priorityRank(priority: Task['priority']): number {
  switch (priority) {
    case 'critical':
      return 0;
    case 'high':
      return 1;
    case 'medium':
      return 2;
    case 'low':
      return 3;
    default:
      return 99;
  }
}

export class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type?: string,
    public readonly id?: string,
    public readonly entity?: Entity
  ) {
    super(label, collapsibleState);

    if (this.entity) {
      this.contextValue = this.entity.type;
      this.command = {
        command: 'planfs.openEditor',
        title: 'Open',
        arguments: [this]
      };

      // Add status badge for tasks
      if (this.entity.type === 'task') {
        const status = (this.entity as Task).status;
        this.description = status;
        this.iconPath = getTaskStatusIcon(status);
      }
    }
  }
}

function createNextWorkTaskItem(
  candidate: NextWorkCandidate,
  index: number
): TreeItem {
  const task = candidate.task;
  const item = new TreeItem(
    `${index + 1}. ${task.id}: ${task.title}`,
    vscode.TreeItemCollapsibleState.None,
    'next-work-task',
    task.id,
    task
  );
  const context = task.dueDate ? `due ${task.dueDate}` : task.milestone ?? task.epic;
  item.description = [
    task.priority,
    task.status,
    context
  ].filter(Boolean).join(' | ');
  item.tooltip = `${task.id}: ${task.title}\n${candidate.reasons.slice(0, 2).join('; ')}`;
  item.iconPath = index === 0
    ? new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'))
    : new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('descriptionForeground'));
  return item;
}

function createBacklogTaskItem(
  backlogTask: BacklogQuickTask,
  index: number
): TreeItem {
  const task = backlogTask.task;
  const refinementState = task.refinementState ?? 'ready';
  const item = new TreeItem(
    `${index + 1}. ${task.id}: ${task.title}`,
    vscode.TreeItemCollapsibleState.None,
    'backlog-task',
    task.id,
    task
  );
  const context = task.dueDate ? `due ${task.dueDate}` : task.milestone ?? task.epic;
  item.description = [
    backlogTask.needsReview ? 'needs review' : refinementState,
    task.priority,
    context
  ].filter(Boolean).join(' | ');
  item.tooltip = [
    `${task.id}: ${task.title}`,
    `Backlog: ${refinementState}`,
    ...backlogTask.reasons.slice(0, 3)
  ].join('\n');
  item.iconPath = backlogTask.needsReview
    ? new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'))
    : new vscode.ThemeIcon('inbox', new vscode.ThemeColor('descriptionForeground'));
  return item;
}

function createOpenBacklogItem(): TreeItem {
  const item = new TreeItem(
    'Open Full Backlog',
    vscode.TreeItemCollapsibleState.None,
    'backlog-view'
  );
  item.description = 'browse and refine';
  item.iconPath = new vscode.ThemeIcon('layout');
  item.command = {
    command: 'planfs.openBacklog',
    title: 'Open Full Backlog'
  };
  return item;
}

function createCurrentWorkTaskItem(
  task: Task,
  index: number
): TreeItem {
  const item = new TreeItem(
    `${index + 1}. ${task.id}: ${task.title}`,
    vscode.TreeItemCollapsibleState.None,
    'current-work-task',
    task.id,
    task
  );
  const context = task.dueDate ? `due ${task.dueDate}` : task.milestone ?? task.epic;
  item.description = [
    task.status,
    task.priority,
    context
  ].filter(Boolean).join(' | ');
  item.tooltip = `${task.id}: ${task.title}\n${task.status}`;
  item.iconPath = getTaskStatusIcon(task.status);
  return item;
}

function createOpenNextWorkBoardItem(): TreeItem {
  const item = new TreeItem(
    'Open Next Work Board',
    vscode.TreeItemCollapsibleState.None,
    'next-work-board'
  );
  item.description = 'more context';
  item.iconPath = new vscode.ThemeIcon('layout');
  item.command = {
    command: 'planfs.openNextWorkBoard',
    title: 'Open Next Work Board'
  };
  return item;
}

function getTaskStatusIcon(status: TaskStatus): vscode.ThemeIcon {
  switch (status) {
    case 'done':
      return new vscode.ThemeIcon(
        'pass-filled',
        new vscode.ThemeColor('testing.iconPassed')
      );
    case 'in-progress':
      return new vscode.ThemeIcon(
        'sync',
        new vscode.ThemeColor('testing.iconQueued')
      );
    case 'review':
      return new vscode.ThemeIcon(
        'eye',
        new vscode.ThemeColor('testing.iconUnset')
      );
    case 'todo':
      return new vscode.ThemeIcon(
        'circle-outline',
        new vscode.ThemeColor('testing.iconFailed')
      );
  }
}
