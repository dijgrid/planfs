/**
 * Explorer tree view provider
 */

import * as vscode from 'vscode';
import { loadRepository, getAllEntities } from 'planfs-core';
import {
  Decision,
  Entity,
  Epic,
  Milestone,
  Repository,
  Task,
  TaskStatus
} from 'planfs-core';

export class ExplorerProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> =
    new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private repository: Repository | null = null;
  private entities: Entity[] = [];

  async refresh(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        this.repository = null;
        this.entities = [];
      } else {
        this.repository = await loadRepository(workspaceFolder.uri.fsPath);
        this.entities = getAllEntities(this.repository);
      }
    } catch (error) {
      console.error('Failed to load repository:', error);
      this.repository = null;
      this.entities = [];
    }

    this._onDidChangeTreeData.fire(null);
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
        new TreeItem('Tasks', vscode.TreeItemCollapsibleState.Collapsed, 'tasks', 'tasks'),
        new TreeItem('Epics', vscode.TreeItemCollapsibleState.Collapsed, 'epics', 'epics'),
        new TreeItem('Milestones', vscode.TreeItemCollapsibleState.Collapsed, 'milestones', 'milestones'),
        new TreeItem('Decisions', vscode.TreeItemCollapsibleState.Collapsed, 'decisions', 'decisions')
      ]);
    }

    // Show items in category
    if (element.type === 'tasks') {
      const tasks = Array.from(this.repository.tasks.values()) as Task[];
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
      const epics = Array.from(this.repository.epics.values()) as Epic[];
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
      const milestones = Array.from(this.repository.milestones.values()) as Milestone[];
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
      const decisions = Array.from(this.repository.decisions.values()) as Decision[];
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
