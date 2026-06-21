import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  createEpicTemplate,
  createMilestoneTemplate,
  createTaskTemplate,
  ensurePlanfsStructure,
  loadRepository,
  saveEntity,
  validateRepositoryState
} from 'planfs-core';
import { BoardProvider } from './board';
import { EntityEditorProvider } from './editor';
import { ExplorerProvider } from './explorer';
import {
  selectPlanFSWorkspaceFolder
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
    })),
    getRepositoryDevelopers: jest.fn(async () => [])
  };
});

describe('VS Code lifecycle integration', () => {
  let rootPath: string;
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(async () => {
    jest.clearAllMocks();
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-vscode-lifecycle-'));
    await createLifecycleFixture(rootPath);

    workspaceFolder = {
      uri: vscode.Uri.file(rootPath),
      name: 'lifecycle-project',
      index: 0
    };
    (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = [workspaceFolder];
    selectPlanFSWorkspaceFolder(workspaceFolder);
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
    (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = undefined;
  });

  it('renders lifecycle entities, board views, command wiring, and editor saves', async () => {
    const explorer = new ExplorerProvider();
    await explorer.refresh();

    const rootItems = await explorer.getChildren();
    const tasksGroup = rootItems.find(item => item.type === 'tasks');
    const epicsGroup = rootItems.find(item => item.type === 'epics');
    const milestonesGroup = rootItems.find(item => item.type === 'milestones');
    expect(tasksGroup).toBeDefined();
    expect(epicsGroup).toBeDefined();
    expect(milestonesGroup).toBeDefined();

    const taskItems = tasksGroup ? await explorer.getChildren(tasksGroup) : [];
    const epicItems = epicsGroup ? await explorer.getChildren(epicsGroup) : [];
    const milestoneItems = milestonesGroup ? await explorer.getChildren(milestonesGroup) : [];
    expect(taskItems.map(item => item.id)).toEqual([
      'TASK-001',
      'TASK-002',
      'TASK-003'
    ]);
    expect(epicItems.map(item => item.id)).toEqual(['EPIC-product-launch']);
    expect(milestoneItems.map(item => item.id)).toEqual(['MILESTONE-v1-launch']);

    const nextWorkSection = rootItems.find(item => item.type === 'next-work');
    expect(nextWorkSection).toBeDefined();
    const nextWorkItems = nextWorkSection ? await explorer.getChildren(nextWorkSection) : [];
    expect(nextWorkItems[0].id).toBe('TASK-001');

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open('next-work');
    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(boardPanel.webview.html).toContain('TASK-001');
    expect(boardPanel.webview.html).toContain('TASK-002');
    expect(boardPanel.webview.html).toContain('Ready Now');
    expect(boardPanel.webview.html).toContain('Blocked by TASK-001');
    expect(boardPanel.webview.html).toContain('const initialMode = "next-work"');

    await boardPanel.webview.postMessage({
      type: 'openEntity',
      entityId: 'TASK-001'
    });
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'planfs.openEditor',
      { entity: { id: 'TASK-001' } }
    );

    await boardPanel.webview.postMessage({
      type: 'openTaskFile',
      taskId: 'TASK-001'
    });
    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md')
    );
    expect(vscode.window.showTextDocument).toHaveBeenCalled();

    await boardPanel.webview.postMessage({
      type: 'transitionTaskStatus',
      taskId: 'TASK-001',
      status: 'done'
    });
    let repository = await loadRepository(rootPath);
    expect(repository.tasks.get('TASK-001')?.status).toBe('todo');
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Cannot move TASK-001 from todo to done with this quick action.'
    );
    expect(validateRepositoryState(repository).valid).toBe(true);
    jest.mocked(vscode.window.showErrorMessage).mockClear();

    await boardPanel.webview.postMessage({
      type: 'transitionTaskStatus',
      taskId: 'TASK-001',
      status: 'in-progress'
    });
    repository = await loadRepository(rootPath);
    expect(repository.tasks.get('TASK-001')?.status).toBe('in-progress');
    expect(validateRepositoryState(repository).valid).toBe(true);

    await boardPanel.webview.postMessage({
      type: 'transitionTaskStatus',
      taskId: 'TASK-001',
      status: 'review'
    });
    repository = await loadRepository(rootPath);
    expect(repository.tasks.get('TASK-001')?.status).toBe('review');
    expect(validateRepositoryState(repository).valid).toBe(true);

    const editor = new EntityEditorProvider(vscode.Uri.file('/extension'));
    await editor.open('TASK-002');
    const editorPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[1].value;
    expect(editorPanel.webview.html).toContain('TASK-002');
    expect(editorPanel.webview.html).toContain('Structured lifecycle implementation');
    expect(editorPanel.webview.html).toContain('EPIC-product-launch');
    expect(editorPanel.webview.html).toContain('MILESTONE-v1-launch');

    await editorPanel.webview.postMessage({
      type: 'save',
      entity: {
        ...repository.tasks.get('TASK-002')!,
        id: 'TASK-renamed'
      }
    });
    repository = await loadRepository(rootPath);
    expect(repository.tasks.has('TASK-renamed')).toBe(false);
    expect(repository.tasks.get('TASK-002')?.title).toBe('Structured lifecycle implementation');
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Entity IDs cannot be changed from the structured editor'
    );
    expect(validateRepositoryState(repository).valid).toBe(true);
    jest.mocked(vscode.window.showErrorMessage).mockClear();

    await editorPanel.webview.postMessage({
      type: 'save',
      entity: {
        ...repository.tasks.get('TASK-002')!,
        status: 'not-a-status'
      }
    });
    repository = await loadRepository(rootPath);
    expect(repository.tasks.get('TASK-002')?.status).toBe('todo');
    expect(editorPanel.webview.postedMessages).toContainEqual({
      type: 'validation',
      errors: expect.arrayContaining([
        expect.stringContaining('Invalid task status')
      ])
    });
    expect(validateRepositoryState(repository).valid).toBe(true);

    await editorPanel.webview.postMessage({
      type: 'save',
      entity: {
        ...repository.tasks.get('TASK-002')!,
        title: 'Structured lifecycle implementation',
        status: 'review',
        priority: 'critical',
        assignee: 'casey',
        tags: ['lifecycle', 'vscode'],
        body: 'Updated through structured editor.\n\n## Acceptance Criteria\n\n- [ ] Save from editor'
      }
    });

    repository = await loadRepository(rootPath);
    const editedTask = repository.tasks.get('TASK-002');
    expect(editedTask).toMatchObject({
      title: 'Structured lifecycle implementation',
      status: 'review',
      priority: 'critical',
      assignee: 'casey',
      tags: ['lifecycle', 'vscode']
    });
    expect(editedTask?.body).toContain('Updated through structured editor');
    expect(validateRepositoryState(repository).valid).toBe(true);
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Saved TASK-002');

    await editorPanel.webview.postMessage({
      type: 'openRaw'
    });
    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-002.md')
    );
  });
});

async function createLifecycleFixture(rootPath: string): Promise<void> {
  await ensurePlanfsStructure(rootPath);

  const epic = {
    ...createEpicTemplate('EPIC-product-launch', 'Product Launch'),
    targetDate: '2026-09-01',
    body: 'Coordinate the launch lifecycle.'
  };
  const milestone = createMilestoneTemplate(
    'MILESTONE-v1-launch',
    'v1 Launch',
    '2026-09-01'
  );
  const planning = {
    ...createTaskTemplate('TASK-001', 'Define lifecycle plan'),
    priority: 'critical' as const,
    assignee: 'justin',
    epic: epic.id,
    milestone: milestone.id,
    dueDate: '2026-08-01',
    tags: ['lifecycle', 'planning'],
    body: 'Plan the lifecycle before implementation.'
  };
  const implementation = {
    ...createTaskTemplate('TASK-002', 'Structured lifecycle implementation'),
    priority: 'high' as const,
    assignee: 'justin',
    epic: epic.id,
    milestone: milestone.id,
    dueDate: '2026-08-10',
    dependsOn: [planning.id],
    tags: ['lifecycle', 'implementation'],
    body: 'Build after planning completes.'
  };
  const review = {
    ...createTaskTemplate('TASK-003', 'Review lifecycle flow'),
    priority: 'medium' as const,
    assignee: 'casey',
    epic: epic.id,
    milestone: milestone.id,
    dueDate: '2026-08-15',
    dependsOn: [implementation.id],
    tags: ['lifecycle', 'review'],
    body: 'Review after implementation completes.'
  };

  await saveEntity(rootPath, epic);
  await saveEntity(rootPath, milestone);
  await saveEntity(rootPath, planning);
  await saveEntity(rootPath, implementation);
  await saveEntity(rootPath, review);
}
