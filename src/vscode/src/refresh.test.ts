import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  createTaskTemplate,
  ensurePlanfsStructure,
  saveEntity
} from 'planfs-core';
import { BoardProvider } from './board';
import { ExplorerProvider } from './explorer';
import { InsightsProvider } from './insights';
import {
  selectPlanFSWorkspaceFolder,
  selectPlanFSWorkspaceFolderForUri
} from './workspace';

interface MutableWorkspace {
  workspaceFolders: vscode.WorkspaceFolder[] | undefined;
}

jest.mock('planfs-core', () => {
  const actual = jest.requireActual('planfs-core');
  return {
    ...actual,
    getBranchPlanningContext: jest.fn(async () => ({
      available: false,
      message: 'Git unavailable in tests.',
      taskIdsInBranchName: [],
      relatedTaskIds: [],
      changedFiles: [],
      addedTasks: [],
      modifiedTasks: [],
      deletedTaskIds: [],
      conflicts: []
    }))
  };
});

describe('VS Code view refresh workspace selection', () => {
  let tempRoot: string;
  let firstRoot: string;
  let secondRoot: string;
  let firstFolder: vscode.WorkspaceFolder;
  let secondFolder: vscode.WorkspaceFolder;

  beforeEach(async () => {
    jest.clearAllMocks();

    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-vscode-refresh-'));
    firstRoot = path.join(tempRoot, 'first-project');
    secondRoot = path.join(tempRoot, 'second-project');
    await fs.mkdir(firstRoot);
    await fs.mkdir(secondRoot);
    await ensurePlanfsStructure(firstRoot);
    await ensurePlanfsStructure(secondRoot);

    const firstTask = createTaskTemplate('TASK-001', 'First project task');
    const secondTask = createTaskTemplate('TASK-002', 'Second project disk task');
    await saveEntity(firstRoot, firstTask);
    await saveEntity(secondRoot, secondTask);

    firstFolder = {
      uri: vscode.Uri.file(firstRoot),
      name: 'first-project',
      index: 0
    };
    secondFolder = {
      uri: vscode.Uri.file(secondRoot),
      name: 'second-project',
      index: 1
    };

    (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = [firstFolder, secondFolder];
    selectPlanFSWorkspaceFolder(firstFolder);
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
    (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = undefined;
  });

  it('refreshes explorer, board, and insights from the workspace containing the changed task file', async () => {
    const createdTaskUri = vscode.Uri.file(
      path.join(secondRoot, '.planfs', 'tasks', 'TASK-002.md')
    );

    selectPlanFSWorkspaceFolderForUri(createdTaskUri);

    const explorer = new ExplorerProvider();
    await explorer.refresh();
    const taskGroup = (await explorer.getChildren()).find(item => item.type === 'tasks');
    const taskItems = taskGroup ? await explorer.getChildren(taskGroup) : [];
    expect(taskItems.map(item => item.id)).toEqual(['TASK-002']);
    expect(taskItems[0].label).toContain('Second project disk task');

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();
    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(boardPanel.webview.html).toContain('TASK-002');
    expect(boardPanel.webview.html).toContain('Second project disk task');
    expect(boardPanel.webview.html).not.toContain('TASK-001');

    const insights = new InsightsProvider(vscode.Uri.file('/extension'));
    await insights.open();
    const insightsPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[1].value;
    expect(insightsPanel.webview.html).toContain('TASK-002');
    expect(insightsPanel.webview.html).not.toContain('TASK-001');
  });
});
