import * as vscode from 'vscode';
import manifest from '../../package.json';
import { TreeItem } from '../explorer';
import { openTaskCommand } from './open';

describe('open commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles Open Markdown without an explorer item', async () => {
    await expect(openTaskCommand(undefined)).resolves.toBeUndefined();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Open Markdown is available from a task in the PlanFS Explorer.'
    );
  });

  it('opens Markdown for an explorer task', async () => {
    const item = new TreeItem(
      'TASK-001',
      vscode.TreeItemCollapsibleState.None,
      'task',
      'TASK-001',
      {
        id: 'TASK-001',
        type: 'task',
        title: 'Open me',
        status: 'todo',
        filePath: '/workspace/.planfs/tasks/TASK-001.md',
        metadata: {},
        body: ''
      }
    );

    await openTaskCommand(item);

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
      '/workspace/.planfs/tasks/TASK-001.md'
    );
    expect(vscode.window.showTextDocument).toHaveBeenCalled();
  });

  it('exposes Open Item while hiding the contextual Markdown command from the palette', () => {
    expect(manifest.contributes.commands).toContainEqual({
      command: 'planfs.openItem',
      title: 'PlanFS: Open Item'
    });
    expect(manifest.contributes.commands).not.toContainEqual(expect.objectContaining({
      command: 'planfs.openEditor'
    }));
    expect(manifest.contributes.menus.commandPalette).toContainEqual({
      command: 'planfs.openTask',
      when: 'false'
    });
  });
});
