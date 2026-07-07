/**
 * VS Code-backed UI preference storage for PlanFS views.
 */

import * as crypto from 'crypto';
import * as vscode from 'vscode';

const STORAGE_PREFIX = 'planfs.uiPreferences';

export type UiPreferenceScope = 'global' | 'workspace';

export const UI_PREFERENCES = {
  backlogPanelsSwapped: {
    key: 'backlog.panelsSwapped',
    defaultValue: false,
    scope: 'workspace' as UiPreferenceScope
  },
  boardDetailsPanelWidth: {
    key: 'board.details.width',
    defaultValue: 340,
    scope: 'workspace' as UiPreferenceScope
  },
  boardDetailsPanelCompact: {
    key: 'board.details.compact',
    defaultValue: false,
    scope: 'workspace' as UiPreferenceScope
  }
} as const;

type PreferenceDefinition<T> = {
  key: string;
  defaultValue: T;
  scope: UiPreferenceScope;
};

export class PlanFSUiPreferences {
  constructor(private readonly state: vscode.Memento) {}

  get<T>(definition: PreferenceDefinition<T>, workspaceFolder?: vscode.WorkspaceFolder): T {
    const storageKey = this.getStorageKey(definition, workspaceFolder);
    if (!storageKey) {
      return definition.defaultValue;
    }
    return this.state.get<T>(storageKey, definition.defaultValue);
  }

  async set<T>(
    definition: PreferenceDefinition<T>,
    value: T,
    workspaceFolder?: vscode.WorkspaceFolder
  ): Promise<void> {
    const storageKey = this.getStorageKey(definition, workspaceFolder);
    if (!storageKey) {
      return;
    }
    await this.state.update(storageKey, value);
  }

  async clear<T>(
    definition: PreferenceDefinition<T>,
    workspaceFolder?: vscode.WorkspaceFolder
  ): Promise<void> {
    const storageKey = this.getStorageKey(definition, workspaceFolder);
    if (!storageKey) {
      return;
    }
    await this.state.update(storageKey, undefined);
  }

  private getStorageKey<T>(
    definition: PreferenceDefinition<T>,
    workspaceFolder?: vscode.WorkspaceFolder
  ): string | undefined {
    if (definition.scope === 'global') {
      return `${STORAGE_PREFIX}.global.${definition.key}`;
    }

    if (!workspaceFolder) {
      return undefined;
    }

    return `${STORAGE_PREFIX}.workspace.${getWorkspaceScopeId(workspaceFolder)}.${definition.key}`;
  }
}

export function getWorkspaceScopeId(workspaceFolder: vscode.WorkspaceFolder): string {
  return crypto
    .createHash('sha256')
    .update(workspaceFolder.uri.fsPath)
    .digest('hex')
    .slice(0, 16);
}
