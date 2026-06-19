/**
 * Explorer tree view provider
 */

import * as vscode from 'vscode';
import {
  loadRepository,
  getAllEntities,
  loadSavedFilters,
  searchEntities
} from 'planfs-core';
import {
  Decision,
  Entity,
  Epic,
  Milestone,
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

  async refresh(): Promise<void> {
    try {
      const workspaceFolder = getPlanFSWorkspaceFolder();
      if (!workspaceFolder) {
        this.repository = null;
        this.entities = [];
      } else {
        this.repository = await loadRepository(workspaceFolder.uri.fsPath);
        this.savedFilters = await loadSavedFilters(workspaceFolder.uri.fsPath);
        this.entities = this.activeFilter
          ? searchEntities(this.repository, this.activeFilter.criteria)
          : getAllEntities(this.repository);
      }
    } catch (error) {
      console.error('Failed to load repository:', error);
      this.repository = null;
      this.entities = [];
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
      return Promise.resolve([
        new TreeItem(
          this.activeFilter ? `Filter: ${this.activeFilter.name}` : 'No saved filter',
          vscode.TreeItemCollapsibleState.None,
          'filter'
        ),
        new TreeItem('Tasks', vscode.TreeItemCollapsibleState.Collapsed, 'tasks', 'tasks'),
        new TreeItem('Epics', vscode.TreeItemCollapsibleState.Collapsed, 'epics', 'epics'),
        new TreeItem('Milestones', vscode.TreeItemCollapsibleState.Collapsed, 'milestones', 'milestones'),
        new TreeItem('Decisions', vscode.TreeItemCollapsibleState.Collapsed, 'decisions', 'decisions')
      ]);
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
        command: 'planfs.openTask',
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
