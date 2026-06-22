import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';
import {
  archiveEntity,
  createEpicTemplate,
  createTaskTemplate,
  ensurePlanfsStructure,
  loadRepository,
  saveEntity
} from 'planfs-core';
import { BacklogProvider } from './backlog';
import { ArchiveProvider } from './archive';
import { BoardProvider } from './board';
import { EntityEditorProvider } from './editor';
import { ExplorerProvider } from './explorer';
import { InsightsProvider } from './insights';
import { PlanFSUiPreferences, UI_PREFERENCES } from './preferences';
import {
  selectPlanFSWorkspaceFolder,
  selectPlanFSWorkspaceFolderForUri
} from './workspace';

interface MutableWorkspace {
  workspaceFolders: vscode.WorkspaceFolder[] | undefined;
}

const execFileAsync = promisify(execFile);

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
    expect(boardPanel.webview.html).toContain('id="details"');
    expect(boardPanel.webview.html).toContain('renderDetails');
    expect(boardPanel.webview.html).toContain('selectTask(task.id)');
    expect(boardPanel.webview.html).toContain('data-open-entity');
    expect(boardPanel.webview.html).toContain('Open Markdown');
    expect(boardPanel.webview.html).toContain('Copy ID');
    expect(boardPanel.webview.html).not.toContain('bodyPreview');
    expect(boardPanel.webview.html).not.toContain('data-select-task');
    expect(boardPanel.webview.html).not.toContain('TASK-001');

    await boardPanel.webview.postMessage({
      type: 'openEntity',
      entityId: 'TASK-002'
    });
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'planfs.openEditor',
      { entity: { id: 'TASK-002' } }
    );

    await boardPanel.webview.postMessage({
      type: 'openTaskFile',
      taskId: 'TASK-002'
    });
    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
      path.join(secondRoot, '.planfs', 'tasks', 'TASK-002.md')
    );
    expect(vscode.window.showTextDocument).toHaveBeenCalled();

    const insights = new InsightsProvider(vscode.Uri.file('/extension'));
    await insights.open();
    const insightsPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[1].value;
    expect(insightsPanel.webview.html).toContain('TASK-002');
    expect(insightsPanel.webview.html).not.toContain('TASK-001');
  });

  it('renders and updates the backlog view as a separate command surface', async () => {
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-050', 'Captured backlog task'),
      refinementState: 'captured',
      priority: 'high',
      body: 'Needs later refinement.\n\n## Acceptance Criteria\n\n- [ ] Refine the task'
    });

    const uiPreferences = new PlanFSUiPreferences(new TestMemento());
    await uiPreferences.set(UI_PREFERENCES.backlogPanelsSwapped, true, firstFolder);

    const backlog = new BacklogProvider(vscode.Uri.file('/extension'), uiPreferences);
    await backlog.open();
    const backlogPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;

    expect(backlogPanel.webview.html).toContain('PlanFS Backlog');
    expect(backlogPanel.webview.html).toContain('Captured backlog task');
    expect(backlogPanel.webview.html).toContain('captureBacklogItem');
    expect(backlogPanel.webview.html).toContain('updateBacklogTask');
    expect(backlogPanel.webview.html).toContain('vscode.getState');
    expect(backlogPanel.webview.html).toContain('savedFilterId');
    expect(backlogPanel.webview.html).toContain('persistUiState');
    expect(backlogPanel.webview.html).toContain('editorPanel');
    expect(backlogPanel.webview.html).toContain('data-select-task');
    expect(backlogPanel.webview.html).toContain('Open Markdown');
    expect(backlogPanel.webview.html).toContain('Acceptance Criteria');
    expect(backlogPanel.webview.html).toContain('Group by refinement');
    expect(backlogPanel.webview.html).toContain('"backlogPanelsSwapped":true');
    expect(backlogPanel.webview.html).toContain('updateUiPreference');

    await backlogPanel.webview.postMessage({
      type: 'updateBacklogTask',
      task: {
        id: 'TASK-050',
        title: 'Refined backlog task',
        status: 'todo',
        refinementState: 'ready',
        priority: 'critical',
        assignee: 'PlanFS Test',
        tags: ['backlog', 'ux']
      }
    });

    const repository = await loadRepository(firstRoot);
    expect(repository.tasks.get('TASK-050')?.title).toBe('Refined backlog task');
    expect(repository.tasks.get('TASK-050')?.refinementState).toBe('ready');
    expect(repository.tasks.get('TASK-050')?.priority).toBe('critical');
    expect(repository.tasks.get('TASK-050')?.assignee).toBe('PlanFS Test');
    expect(repository.tasks.get('TASK-050')?.tags).toEqual(['backlog', 'ux']);
    expect(repository.tasks.get('TASK-050')?.body).toContain('## Acceptance Criteria');
  });

  it('updates backlog task assignee without being blocked by unrelated invalid task status', async () => {
    await saveEntity(firstRoot, createTaskTemplate('TASK-050', 'Editable backlog task'));
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-051', 'Legacy status task'),
      status: 'active' as never
    });

    const backlog = new BacklogProvider(vscode.Uri.file('/extension'), new PlanFSUiPreferences(new TestMemento()));
    await backlog.open();
    const backlogPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;

    await backlogPanel.webview.postMessage({
      type: 'updateBacklogTask',
      task: {
        id: 'TASK-050',
        title: 'Editable backlog task',
        assignee: 'PlanFS Test',
        dueDate: '2026-09-01'
      }
    });

    const repository = await loadRepository(firstRoot);
    expect(repository.tasks.get('TASK-050')?.assignee).toBe('PlanFS Test');
    expect(repository.tasks.get('TASK-050')?.dueDate).toBe('2026-09-01T00:00:00.000Z');
    expect(repository.tasks.get('TASK-051')?.status).toBe('active');
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalledWith(
      expect.stringContaining('Schema validation failed for status')
    );
  });

  it('renders archived tasks and epics in a dedicated archive view', async () => {
    const epic = createEpicTemplate('EPIC-archive', 'Archived epic');
    await saveEntity(firstRoot, epic);
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-071', 'Archived task'),
      epic: epic.id
    });
    await archiveEntity(firstRoot, epic.id, { includeChildren: true });

    const archive = new ArchiveProvider(vscode.Uri.file('/extension'));
    await archive.open();

    const archivePanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(archivePanel.webview.html).toContain('PlanFS Archive');
    expect(archivePanel.webview.html).toContain('EPIC-archive');
    expect(archivePanel.webview.html).toContain('TASK-071');
    expect(archivePanel.webview.html).toContain("type: 'restore'");
    expect(archivePanel.webview.html).toContain("type: 'delete'");
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

    const epic = createEpicTemplate('EPIC-board', 'Board Epic');
    await saveEntity(firstRoot, epic);
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-020', 'Open dependency'),
      status: 'todo',
      epic: epic.id
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-021', 'Blocked board task'),
      status: 'todo',
      dependsOn: ['TASK-020']
    });

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();

    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(boardPanel.webview.html).toContain('role="tablist"');
    expect(boardPanel.webview.html).toContain('aria-label="Board view"');
    expect(boardPanel.webview.html).toContain('data-mode="status"');
    expect(boardPanel.webview.html).toContain('data-mode="next-work"');
    expect(boardPanel.webview.html).toContain('aria-selected="true"');
    expect(boardPanel.webview.html).toContain('setBoardMode');
    expect(boardPanel.webview.html).toContain('Next Work');
    expect(boardPanel.webview.html).toContain('Ready Now');
    expect(boardPanel.webview.html).toContain('Needs Review');
    expect(boardPanel.webview.html).toContain('Blocked');
    expect(boardPanel.webview.html).toContain('Start work');
    expect(boardPanel.webview.html).toContain('data-open-entity');
    expect(boardPanel.webview.html).toContain('EPIC-board');
    expect(boardPanel.webview.html).toContain('"readiness":"ready"');
    expect(boardPanel.webview.html).toContain('"readiness":"blocked"');
    expect(boardPanel.webview.html).toContain('Blocked by TASK-020');
  });

  it('can open the board directly in next-work mode', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open('next-work');

    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(boardPanel.webview.html).toContain('const initialMode = "next-work"');
    expect(boardPanel.webview.html).toContain("initialMode === 'next-work'");
  });

  it('shows a compact next-work quick view in the explorer', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-020', 'Open dependency'),
      status: 'todo',
      priority: 'medium'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-021', 'Top recommended task'),
      status: 'todo',
      priority: 'critical',
      dueDate: '2026-09-01',
      refinementState: 'ready'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-022', 'Blocked quick view task'),
      status: 'todo',
      priority: 'high',
      dependsOn: ['TASK-020'],
      refinementState: 'ready'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-023', 'Needs refinement task'),
      status: 'todo',
      priority: 'critical',
      refinementState: 'needs-refinement'
    });

    const explorer = new ExplorerProvider();
    await explorer.refresh();

    const rootItems = await explorer.getChildren();
    const nextWorkSection = rootItems.find(item => item.type === 'next-work');
    expect(nextWorkSection).toBeDefined();
    expect(nextWorkSection?.label).toBe('Next Work');
    expect(nextWorkSection?.description).toBe('3 ready');

    const quickItems = nextWorkSection ? await explorer.getChildren(nextWorkSection) : [];
    expect(quickItems.map(item => item.id)).toEqual([
      'TASK-021',
      'TASK-020',
      'TASK-001',
      undefined
    ]);
    expect(quickItems[0].label).toContain('Top recommended task');
    expect(quickItems[0].description).toContain('critical');
    expect(quickItems[0].description).toContain('todo');
    expect(quickItems[0].description).toContain('due 2026-09-01');
    expect(quickItems[0].command).toEqual({
      command: 'planfs.openEditor',
      title: 'Open',
      arguments: [quickItems[0]]
    });
    expect(quickItems[3].label).toBe('Open Next Work Board');
    expect(quickItems[3].command).toEqual({
      command: 'planfs.openNextWorkBoard',
      title: 'Open Next Work Board'
    });
  });

  it('shows current work assigned to the current git user in the explorer', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);
    await initializeGitIdentity(firstRoot);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-040', 'Active current task'),
      status: 'in-progress',
      priority: 'high',
      assignee: 'PlanFS Test <test@example.com>',
      dueDate: '2026-09-15'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-041', 'Review current task'),
      status: 'review',
      priority: 'critical',
      assignee: 'PlanFS Test'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-042', 'Other active task'),
      status: 'in-progress',
      priority: 'critical',
      assignee: 'casey'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-043', 'Assigned todo task'),
      status: 'todo',
      priority: 'critical',
      assignee: 'PlanFS Test'
    });

    const explorer = new ExplorerProvider();
    await explorer.refresh();

    const rootItems = await explorer.getChildren();
    const currentWorkSection = rootItems.find(item => item.type === 'current-work');
    expect(currentWorkSection).toBeDefined();
    expect(currentWorkSection?.label).toBe('Current Work');
    expect(currentWorkSection?.description).toBe('2 active');

    const currentItems = currentWorkSection ? await explorer.getChildren(currentWorkSection) : [];
    expect(currentItems.map(item => item.id)).toEqual(['TASK-041', 'TASK-040']);
    expect(currentItems[0].label).toContain('Review current task');
    expect(currentItems[0].description).toContain('review');
    expect(currentItems[0].description).toContain('critical');
    expect(currentItems[0].command).toEqual({
      command: 'planfs.openEditor',
      title: 'Open',
      arguments: [currentItems[0]]
    });
    expect(rootItems.findIndex(item => item.type === 'current-work')).toBeLessThan(
      rootItems.findIndex(item => item.type === 'next-work')
    );
  });

  it('omits current work when no active tasks match the current git user', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);
    await initializeGitIdentity(firstRoot);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-040', 'Other active task'),
      status: 'in-progress',
      assignee: 'casey'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-041', 'Done current task'),
      status: 'done',
      assignee: 'PlanFS Test'
    });

    const explorer = new ExplorerProvider();
    await explorer.refresh();

    const rootItems = await explorer.getChildren();
    expect(rootItems.find(item => item.type === 'current-work')).toBeUndefined();
  });

  it('omits the next-work quick view when no tasks are actionable', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    const repository = await loadRepository(firstRoot);
    const task = repository.tasks.get('TASK-001');
    expect(task).toBeDefined();
    task!.status = 'done';
    await saveEntity(firstRoot, task!);

    const explorer = new ExplorerProvider();
    await explorer.refresh();

    const rootItems = await explorer.getChildren();
    expect(rootItems.find(item => item.type === 'next-work')).toBeUndefined();
  });

  it('handles board card quick actions and guarded transitions', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-030', 'Ready todo task'),
      status: 'todo'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-031', 'Active task'),
      status: 'in-progress'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-032', 'Review task'),
      status: 'review'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-033', 'Finished task'),
      status: 'done'
    });

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();

    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(boardPanel.webview.html).not.toContain('data-open-task');
    expect(boardPanel.webview.html).not.toContain('data-copy-task');
    expect(boardPanel.webview.html).toContain('data-open-file');
    expect(boardPanel.webview.html).toContain('data-copy-selected');
    expect(boardPanel.webview.html).toContain('data-transition-task');
    expect(boardPanel.webview.html).toContain('selectTask(task.id)');
    expect(boardPanel.webview.html).toContain('Start work');
    expect(boardPanel.webview.html).toContain('Mark ready for review');
    expect(boardPanel.webview.html).toContain('Mark done');

    await boardPanel.webview.postMessage({
      type: 'copyTaskId',
      taskId: 'TASK-030'
    });
    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('TASK-030');
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Copied TASK-030');

    await boardPanel.webview.postMessage({
      type: 'transitionTaskStatus',
      taskId: 'TASK-030',
      status: 'in-progress'
    });
    await boardPanel.webview.postMessage({
      type: 'transitionTaskStatus',
      taskId: 'TASK-031',
      status: 'review'
    });
    await boardPanel.webview.postMessage({
      type: 'transitionTaskStatus',
      taskId: 'TASK-032',
      status: 'done'
    });

    let repository = await loadRepository(firstRoot);
    expect(repository.tasks.get('TASK-030')?.status).toBe('in-progress');
    expect(repository.tasks.get('TASK-031')?.status).toBe('review');
    expect(repository.tasks.get('TASK-032')?.status).toBe('done');

    await boardPanel.webview.postMessage({
      type: 'transitionTaskStatus',
      taskId: 'TASK-033',
      status: 'in-progress'
    });

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Cannot move TASK-033 from done to in-progress with this quick action.'
    );
    repository = await loadRepository(firstRoot);
    expect(repository.tasks.get('TASK-033')?.status).toBe('done');
  });

  it('renders bulk selection controls and applies validated bulk updates', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-034', 'First bulk task'),
      status: 'todo'
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-035', 'Second bulk task'),
      status: 'todo'
    });

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();

    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(boardPanel.webview.html).toContain('id="bulkBar"');
    expect(boardPanel.webview.html).toContain('data-bulk-select');
    expect(boardPanel.webview.html).toContain('bulkUpdateTasks');
    expect(boardPanel.webview.html).toContain('selectedBulkTaskIds');
    expect(boardPanel.webview.html).toContain('clearSelection');

    jest.mocked(vscode.window.showInputBox).mockResolvedValueOnce('review');
    jest.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce('Apply' as never);

    await boardPanel.webview.postMessage({
      type: 'bulkUpdateTasks',
      taskIds: ['TASK-034', 'TASK-035'],
      action: 'status'
    });

    const repository = await loadRepository(firstRoot);
    expect(repository.tasks.get('TASK-034')?.status).toBe('review');
    expect(repository.tasks.get('TASK-035')?.status).toBe('review');
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Apply Set status to 2 tasks?',
      { modal: true },
      'Apply'
    );
  });

  it('blocks invalid bulk updates before writing task files', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-036', 'Invalid bulk target'),
      status: 'todo'
    });

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();
    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;

    jest.mocked(vscode.window.showInputBox).mockResolvedValueOnce('EPIC-missing');
    jest.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce('Apply' as never);

    await boardPanel.webview.postMessage({
      type: 'bulkUpdateTasks',
      taskIds: ['TASK-036'],
      action: 'epic'
    });

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Bulk update blocked by validation:')
    );
    const repository = await loadRepository(firstRoot);
    expect(repository.tasks.get('TASK-036')?.epic).toBeUndefined();
  });

  it('renders board grouping controls and keeps saved filters in the grouping pipeline', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await fs.mkdir(path.join(firstRoot, '.planfs', 'filters'), { recursive: true });
    await fs.writeFile(
      path.join(firstRoot, '.planfs', 'filters', 'grouped-epic.json'),
      JSON.stringify({
        id: 'grouped-epic',
        name: 'Grouped Epic',
        criteria: {
          epic: 'EPIC-group-a'
        }
      })
    );

    await saveEntity(firstRoot, createEpicTemplate('EPIC-group-a', 'Grouped Epic A'));
    await saveEntity(firstRoot, createEpicTemplate('EPIC-group-b', 'Grouped Epic B'));
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-040', 'Epic grouped task'),
      status: 'todo',
      epic: 'EPIC-group-a',
      milestone: 'MILESTONE-group',
      assignee: 'PlanFS Test',
      priority: 'high' as const
    });
    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-041', 'Ungrouped task'),
      status: 'review',
      epic: 'EPIC-group-b',
      priority: 'low' as const
    });

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();

    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(boardPanel.webview.html).toContain('aria-label="Group tasks"');
    expect(boardPanel.webview.html).toContain('value="none">No grouping');
    expect(boardPanel.webview.html).toContain('value="epic">Group by epic');
    expect(boardPanel.webview.html).toContain('value="milestone">Group by milestone');
    expect(boardPanel.webview.html).toContain('value="assignee">Group by assignee');
    expect(boardPanel.webview.html).toContain('value="priority">Group by priority');
    expect(boardPanel.webview.html).toContain('.swimlane');
    expect(boardPanel.webview.html).toContain("section.className = 'swimlane'");
    expect(boardPanel.webview.html).toContain('function groupTasks');
    expect(boardPanel.webview.html).toContain('function groupingValue');
    expect(boardPanel.webview.html).toContain('function renderSwimlane');
    expect(boardPanel.webview.html).toContain('matchesSavedFilter(task, savedFilter?.criteria)');
    expect(boardPanel.webview.html).toContain('groupTasks(sorted, groupKey)');
    expect(boardPanel.webview.html.indexOf('matchesSavedFilter(task, savedFilter?.criteria)'))
      .toBeLessThan(boardPanel.webview.html.indexOf('groupTasks(sorted, groupKey)'));
    expect(boardPanel.webview.html).toContain('Grouped Epic');
    expect(boardPanel.webview.html).toContain('"epic":"EPIC-group-a"');
    expect(boardPanel.webview.html).toContain('No epic');
    expect(boardPanel.webview.html).toContain('No milestone');
    expect(boardPanel.webview.html).toContain('Unassigned');
    expect(boardPanel.webview.html).toContain('No priority');
  });

  it('renders terminal-state collapse behavior for done columns', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await fs.mkdir(path.join(firstRoot, '.planfs', 'filters'), { recursive: true });
    await fs.writeFile(
      path.join(firstRoot, '.planfs', 'filters', 'finished-board.json'),
      JSON.stringify({
        id: 'finished-board',
        name: 'Finished Board',
        criteria: {
          status: 'done',
          epic: 'EPIC-terminal'
        }
      })
    );

    await saveEntity(firstRoot, createEpicTemplate('EPIC-terminal', 'Terminal Epic'));
    for (let index = 0; index < 7; index += 1) {
      await saveEntity(firstRoot, {
        ...createTaskTemplate(`TASK-08${index}`, `Completed task ${index}`),
        status: 'done',
        epic: 'EPIC-terminal'
      });
    }

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();

    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(boardPanel.webview.html).toContain('const terminalStatuses = [');
    expect(boardPanel.webview.html).toContain("const terminalPreviewLimit = 5");
    expect(boardPanel.webview.html).toContain('expandedTerminalColumns');
    expect(boardPanel.webview.html).toContain('terminalSummary');
    expect(boardPanel.webview.html).toContain('completed task');
    expect(boardPanel.webview.html).toContain('Show all');
    expect(boardPanel.webview.html).toContain('Show fewer');
    expect(boardPanel.webview.html).toContain('terminalColumnKey(status, context)');
    expect(boardPanel.webview.html).toContain('stableContext(context)');
    expect(boardPanel.webview.html).toContain('if (task.status ===');
    expect(boardPanel.webview.html).toContain('done');
    expect(boardPanel.webview.html.indexOf('matchesSavedFilter(task, savedFilter?.criteria)'))
      .toBeLessThan(boardPanel.webview.html.indexOf('renderColumn('));
    expect(boardPanel.webview.html).toContain('Finished Board');
    expect(boardPanel.webview.html).toContain('EPIC-terminal');
  });

  it('creates board tasks with reviewed status and metadata context', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();
    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;

    expect(boardPanel.webview.html).toContain('data-create-context');
    expect(boardPanel.webview.html).toContain('savedFilterTaskContext');
    expect(boardPanel.webview.html).toContain('context: rawValue ? { [groupKey]: rawValue } : {}');

    jest.mocked(vscode.window.showInputBox)
      .mockResolvedValueOnce('Review-created task')
      .mockResolvedValueOnce('status=review');

    await boardPanel.webview.postMessage({
      type: 'createTask',
      context: {
        status: 'review'
      }
    });

    let repository = await loadRepository(firstRoot);
    const reviewTask = repository.tasks.get('TASK-002');
    expect(reviewTask?.title).toBe('Review-created task');
    expect(reviewTask?.status).toBe('review');
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Created task: TASK-002');

    jest.mocked(vscode.window.showInputBox)
      .mockResolvedValueOnce('Context-created task')
      .mockResolvedValueOnce('status=todo, epic=EPIC-board, milestone=MILESTONE-board, assignee=PlanFS Test, priority=high, tags=board|ux');

    await boardPanel.webview.postMessage({
      type: 'createTask',
      context: {
        status: 'todo',
        epic: 'EPIC-board',
        milestone: 'MILESTONE-board',
        assignee: 'PlanFS Test',
        priority: 'high',
        tags: ['board']
      }
    });

    repository = await loadRepository(firstRoot);
    const contextTask = repository.tasks.get('TASK-003');
    expect(contextTask?.title).toBe('Context-created task');
    expect(contextTask?.status).toBe('todo');
    expect(contextTask?.epic).toBe('EPIC-board');
    expect(contextTask?.milestone).toBe('MILESTONE-board');
    expect(contextTask?.assignee).toBe('PlanFS Test');
    expect(contextTask?.priority).toBe('high');
    expect(contextTask?.tags).toEqual(['board', 'ux']);
  });

  it('does not create a board task when creation is cancelled', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    const board = new BoardProvider(vscode.Uri.file('/extension'));
    await board.open();
    const boardPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;

    jest.mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);

    await boardPanel.webview.postMessage({
      type: 'createTask',
      context: {
        status: 'todo'
      }
    });

    const repository = await loadRepository(firstRoot);
    expect(repository.tasks.has('TASK-002')).toBe(false);
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

  it('renders common Markdown sections instead of a raw body field in the structured editor', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-020', 'Structured body task'),
      priority: 'high',
      body: [
        'Body intro.',
        '',
        '## Acceptance Criteria',
        '',
        '- [ ] Keep the body in Markdown',
        '- [x] Render common sections',
        '',
        '## Questions',
        '',
        '- [ ] Should this be editable later?'
      ].join('\n')
    });

    const editor = new EntityEditorProvider(vscode.Uri.file('/extension'));
    await editor.open('TASK-020');

    const editorPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(editorPanel.webview.html).not.toContain('Markdown Body');
    expect(editorPanel.webview.html).toContain('Markdown Sections');
    expect(editorPanel.webview.html).toContain('Archive Task');
    expect(editorPanel.webview.html).toContain('Acceptance Criteria');
    expect(editorPanel.webview.html).toContain('Keep the body in Markdown');
    expect(editorPanel.webview.html).toContain('Questions');
    expect(editorPanel.webview.html).toContain('Open Markdown');

    await editorPanel.webview.postMessage({
      type: 'save',
      entity: {
        id: 'TASK-020',
        type: 'task',
        title: 'Structured body task edited',
        status: 'todo',
        priority: 'high'
      }
    });

    const repository = await loadRepository(firstRoot);
    expect(repository.tasks.get('TASK-020')?.title).toBe('Structured body task edited');
    expect(repository.tasks.get('TASK-020')?.body).toContain('## Acceptance Criteria');
  });

  it('renders backlog readiness blockers and refreshes them after saving task metadata', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-021', 'Needs backlog review'),
      body: 'This task has enough detail.',
      updatedAt: '2026-01-01T00:00:00Z'
    });

    const editor = new EntityEditorProvider(vscode.Uri.file('/extension'));
    await editor.open('TASK-021');

    const editorPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(editorPanel.webview.html).toContain('Backlog Readiness');
    expect(editorPanel.webview.html).toContain('Missing priority');
    expect(editorPanel.webview.html).toContain('No updates in 60 days');
    expect(editorPanel.webview.html).toContain('Backlog readiness is separate from workflow status');
    expect(editorPanel.webview.html).toContain('todo, in-progress, review, or done');

    await editorPanel.webview.postMessage({
      type: 'save',
      entity: {
        id: 'TASK-021',
        type: 'task',
        title: 'Needs backlog review',
        status: 'todo',
        priority: 'high'
      }
    });

    expect(editorPanel.webview.html).toContain('No backlog review blockers remain.');
    expect(editorPanel.webview.html).not.toContain('Missing priority');
    expect(editorPanel.webview.html).not.toContain('No updates in 60 days');
  });

  it('renders a clear backlog readiness message for fully ready tasks', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await saveEntity(firstRoot, {
      ...createTaskTemplate('TASK-022', 'Ready backlog task'),
      priority: 'medium',
      body: 'Ready body content.',
      updatedAt: '2026-06-20T00:00:00Z'
    });

    const editor = new EntityEditorProvider(vscode.Uri.file('/extension'));
    await editor.open('TASK-022');

    const editorPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(editorPanel.webview.html).toContain('Backlog Readiness');
    expect(editorPanel.webview.html).toContain('No backlog review blockers remain.');
    expect(editorPanel.webview.html).toContain('Needs review can come from missing body content');
  });

  it('archives tasks from the structured editor', async () => {
    selectPlanFSWorkspaceFolder(firstFolder);

    await saveEntity(firstRoot, createTaskTemplate('TASK-030', 'Editor archived task'));

    const editor = new EntityEditorProvider(vscode.Uri.file('/extension'));
    await editor.open('TASK-030');

    const editorPanel = jest.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
    expect(editorPanel.webview.html).toContain('Archive Task');
    jest.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce('Archive' as never);

    await editorPanel.webview.postMessage({
      type: 'archiveTask'
    });

    const repository = await loadRepository(firstRoot);
    expect(repository.tasks.has('TASK-030')).toBe(false);
    expect(repository.archivedTasks?.has('TASK-030')).toBe(true);
    expect(editorPanel.webview.html).toContain('Archived TASK-030');
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Archived TASK-030');
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('planfs.refreshExplorer');
  });
});

async function initializeGitIdentity(rootPath: string): Promise<void> {
  await execFileAsync('git', ['init'], { cwd: rootPath });
  await execFileAsync('git', ['config', 'user.name', 'PlanFS Test'], { cwd: rootPath });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: rootPath });
}
