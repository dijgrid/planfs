import * as vscode from 'vscode';
import {
  getWorkspaceScopeId,
  PlanFSUiPreferences,
  UI_PREFERENCES
} from './preferences';

class TestMemento implements vscode.Memento {
  private readonly values = new Map<string, unknown>();
  readonly keys = jest.fn(() => Array.from(this.values.keys()));
  readonly get = jest.fn((key: string, defaultValue?: unknown) =>
    this.values.has(key) ? this.values.get(key) : defaultValue
  ) as vscode.Memento['get'];
  readonly update = jest.fn(async (key: string, value: unknown) => {
    if (value === undefined) {
      this.values.delete(key);
      return;
    }
    this.values.set(key, value);
  });
}

function workspaceFolder(fsPath: string): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(fsPath),
    name: fsPath.split('/').pop() ?? 'workspace',
    index: 0
  };
}

describe('PlanFSUiPreferences', () => {
  it('returns the default value before a preference is stored', () => {
    const preferences = new PlanFSUiPreferences(new TestMemento());

    expect(preferences.get(
      UI_PREFERENCES.backlogPanelsSwapped,
      workspaceFolder('/tmp/planfs-a')
    )).toBe(false);
  });

  it('stores and loads workspace-scoped preferences', async () => {
    const state = new TestMemento();
    const preferences = new PlanFSUiPreferences(state);
    const folder = workspaceFolder('/tmp/planfs-a');

    await preferences.set(UI_PREFERENCES.backlogPanelsSwapped, true, folder);

    expect(preferences.get(UI_PREFERENCES.backlogPanelsSwapped, folder)).toBe(true);
    expect(state.update).toHaveBeenCalledWith(
      `planfs.uiPreferences.workspace.${getWorkspaceScopeId(folder)}.backlog.panelsSwapped`,
      true
    );
  });

  it('does not leak workspace preferences between repositories', async () => {
    const preferences = new PlanFSUiPreferences(new TestMemento());
    const firstFolder = workspaceFolder('/tmp/planfs-a');
    const secondFolder = workspaceFolder('/tmp/planfs-b');

    await preferences.set(UI_PREFERENCES.backlogPanelsSwapped, true, firstFolder);

    expect(preferences.get(UI_PREFERENCES.backlogPanelsSwapped, firstFolder)).toBe(true);
    expect(preferences.get(UI_PREFERENCES.backlogPanelsSwapped, secondFolder)).toBe(false);
  });

  it('clears stored preferences back to their fallback value', async () => {
    const preferences = new PlanFSUiPreferences(new TestMemento());
    const folder = workspaceFolder('/tmp/planfs-a');

    await preferences.set(UI_PREFERENCES.backlogPanelsSwapped, true, folder);
    await preferences.clear(UI_PREFERENCES.backlogPanelsSwapped, folder);

    expect(preferences.get(UI_PREFERENCES.backlogPanelsSwapped, folder)).toBe(false);
  });

  it('falls back when a workspace-scoped preference has no workspace', async () => {
    const preferences = new PlanFSUiPreferences(new TestMemento());

    await preferences.set(UI_PREFERENCES.backlogPanelsSwapped, true);

    expect(preferences.get(UI_PREFERENCES.backlogPanelsSwapped)).toBe(false);
  });
});
