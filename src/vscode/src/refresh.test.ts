import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  createEpicTemplate,
  createTaskTemplate,
  ensurePlanfsStructure,
  saveEntity
} from 'planfs-core';
import { BoardProvider } from './board';
import { EntityEditorProvider } from './editor';
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

  it('renders visual planning controls for graph and timeline insights', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    const insights = new InsightsProvider(vscode.Uri.file('/extension'));
    await insights.open();

    const insightsPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(insightsPanel.webview.html).toContain('graphHealth');
    expect(insightsPanel.webview.html).toContain('graphMilestone');
    expect(insightsPanel.webview.html).toContain('zoomInGraph');
    expect(insightsPanel.webview.html).toContain('renderGraphLegend');
    expect(insightsPanel.webview.html).toContain('timelineWindow');
    expect(insightsPanel.webview.html).toContain('timelineGroup');
    expect(insightsPanel.webview.html).toContain('renderTimelineDetails');
  });

  it('renders next-work board controls and readiness data', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-020', 'Open dependency'),
      status: 'todo'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-021', 'Blocked board task'),
      status: 'todo',
      dependsOn: ['TASK-020']
    });

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();

    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(boardPanel.webview.html).toContain('Board mode');
    expect(boardPanel.webview.html).toContain('Next Work');
    expect(boardPanel.webview.html).toContain('Ready Now');
    expect(boardPanel.webview.html).toContain('Needs Review');
    expect(boardPanel.webview.html).toContain('Blocked');
    expect(boardPanel.webview.html).toContain('Start work');
    expect(boardPanel.webview.html).toContain('"readiness":"ready"');
    expect(boardPanel.webview.html).toContain('"readiness":"blocked"');
    expect(boardPanel.webview.html).toContain('Blocked by TASK-020');
  });

  it('renders an epic-scoped task board in the structured editor', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    const epic = createEpicTemplate('EPIC-refresh', 'Refresh Epic');
    const todoTask = {
      ...createTaskTemplate('TASK-010', 'Todo task'),
      epic: epic.id,
      priority: 'high' as const,
      assignee: 'PlanFS Test',
      dueDate: '2026-07-01'
    };
    const reviewTask = {
      ...createTaskTemplate('TASK-011', 'Review task'),
      epic: epic.id,
      status: 'review' as const,
      milestone: 'MILESTONE-refresh'
    };
    await saveEntity(firstRoot, epic);
    await saveEntity(firstRoot, todoTask);
    await saveEntity(firstRoot, reviewTask);

    const editor = new EntityEditorProvider(vscode.Uri.file('/extension'));
    await editor.open(epic.id);

    const editorPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(editorPanel.webview.html).toContain('Epic Task Board');
    expect(editorPanel.webview.html).toContain('todo');
    expect(editorPanel.webview.html).toContain('in-progress');
    expect(editorPanel.webview.html).toContain('review');
    expect(editorPanel.webview.html).toContain('done');
    expect(editorPanel.webview.html).toContain('Todo task');
    expect(editorPanel.webview.html).toContain('Review task');
    expect(editorPanel.webview.html).toContain('developer-options');
    expect(editorPanel.webview.html).toContain('data-open-entity="TASK-010"');

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-012', 'Newly refreshed task'),
      epic: epic.id,
      status: 'in-progress'
    });
    await editor.refresh();
    expect(editorPanel.webview.html).toContain('Newly refreshed task');
  });
});
