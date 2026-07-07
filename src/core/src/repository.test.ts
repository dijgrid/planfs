/**
 * Tests for repository module
 */

import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  generateEntityContent,
  getNextTaskId,
  getNextEpicId,
  getNextMilestoneId,
  createTaskTemplate,
  createEpicTemplate,
  createMilestoneTemplate,
  getAllEntities,
  initializeRepository,
  archiveEntity,
  deleteArchivedEntity,
  listArchivedEntities,
  loadRepository,
  restoreArchivedEntity,
  saveEntity,
  validateRepositoryState
} from '../src/repository';
import { Task, Epic, Milestone, Repository } from '../src/types';

describe('Repository', () => {
  describe('generateEntityContent', () => {
    it('should generate valid task content', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        priority: 'high',
        assignee: 'user@example.com',
        tags: ['backend', 'urgent'],
        body: 'This is the task description.',
        filePath: '',
        metadata: {}
      };

      const content = generateEntityContent(task);

      expect(content).toContain('---');
      expect(content).toContain('id: TASK-001');
      expect(content).toContain('title: Test Task');
      expect(content).toContain('status: todo');
      expect(content).toContain('priority: high');
      expect(content).toContain('tags:');
      expect(content).toContain('This is the task description.');
    });

    it('should handle optional fields', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        body: 'Description',
        filePath: '',
        metadata: {}
      };

      const content = generateEntityContent(task);

      expect(content).toContain('id: TASK-001');
      expect(content).toContain('title: Test Task');
      expect(content).not.toContain('priority:');
      expect(content).not.toContain('assignee:');
    });

    it('should format timestamps', () => {
      const now = new Date().toISOString();
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        body: '',
        createdAt: now,
        updatedAt: now,
        filePath: '',
        metadata: {}
      };

      const content = generateEntityContent(task);

      expect(content).toContain('createdAt:');
      expect(content).toContain('updatedAt:');
    });

    it('should handle array fields', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        dependsOn: ['TASK-000', 'TASK-002'],
        tags: ['tag1', 'tag2'],
        body: '',
        filePath: '',
        metadata: {}
      };

      const content = generateEntityContent(task);

      expect(content).toContain('dependsOn:');
      expect(content).toContain('- TASK-000');
      expect(content).toContain('- TASK-002');
      expect(content).toContain('tags:');
    });

    it('should handle object fields', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        links: {
          github: 'https://github.com/issue/123',
          figma: 'https://figma.com/...'
        },
        body: '',
        filePath: '',
        metadata: {}
      };

      const content = generateEntityContent(task);

      expect(content).toContain('links:');
      expect(content).toContain('github:');
    });

    it('should preserve unknown metadata fields while serializing known fields', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        priority: 'high',
        body: '',
        filePath: '',
        metadata: {
          externalKey: 'JIRA-123',
          review: {
            required: true
          }
        }
      };

      const content = generateEntityContent(task);

      expect(content).toContain('externalKey: JIRA-123');
      expect(content).toContain('review:');
      expect(content).toContain('required: true');
      expect(content).toContain('priority: high');
    });

    it('should generate backlog refinement metadata', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Backlog Task',
        status: 'todo',
        refinementState: 'needs-refinement',
        backlogOrder: 10,
        body: '',
        filePath: '',
        metadata: {}
      };

      const content = generateEntityContent(task);

      expect(content).toContain('refinementState: needs-refinement');
      expect(content).toContain('backlogOrder: 10');
    });

    it('should generate epic priority metadata', () => {
      const epic: Epic = {
        id: 'EPIC-test',
        type: 'epic',
        title: 'Test Epic',
        status: 'active',
        priority: 'critical',
        body: '',
        filePath: '',
        metadata: {}
      };

      const content = generateEntityContent(epic);

      expect(content).toContain('priority: critical');
    });
  });

  describe('getNextTaskId', () => {
    it('should return TASK-001 for empty repository', () => {
      const repo: Repository = {
        root: '',
        tasks: new Map(),
        epics: new Map(),
        milestones: new Map(),
        decisions: new Map()
      };

      const nextId = getNextTaskId(repo);

      expect(nextId).toBe('TASK-001');
    });

    it('should increment task ID', () => {
      const task1: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Task 1',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const task2: Task = {
        id: 'TASK-002',
        type: 'task',
        title: 'Task 2',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const repo: Repository = {
        root: '',
        tasks: new Map([
          ['TASK-001', task1],
          ['TASK-002', task2]
        ]),
        epics: new Map(),
        milestones: new Map(),
        decisions: new Map()
      };

      const nextId = getNextTaskId(repo);

      expect(nextId).toBe('TASK-003');
    });

    it('should handle non-sequential IDs', () => {
      const task1: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Task 1',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const task5: Task = {
        id: 'TASK-005',
        type: 'task',
        title: 'Task 5',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const repo: Repository = {
        root: '',
        tasks: new Map([
          ['TASK-001', task1],
          ['TASK-005', task5]
        ]),
        epics: new Map(),
        milestones: new Map(),
        decisions: new Map()
      };

      const nextId = getNextTaskId(repo);

      expect(nextId).toBe('TASK-006');
    });
  });

  describe('createTaskTemplate', () => {
    it('should create a valid task template', () => {
      const task = createTaskTemplate('TASK-001', 'New Task');

      expect(task.id).toBe('TASK-001');
      expect(task.title).toBe('New Task');
      expect(task.type).toBe('task');
      expect(task.status).toBe('todo');
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should have timestamps', () => {
      const task = createTaskTemplate('TASK-001', 'New Task');

      expect(new Date(task.createdAt || '').getTime()).toBeGreaterThan(0);
      expect(new Date(task.updatedAt || '').getTime()).toBeGreaterThan(0);
    });
  });

  describe('slug IDs and structural templates', () => {
    it('should generate slug epic and milestone IDs', () => {
      const repo: Repository = {
        root: '',
        tasks: new Map(),
        epics: new Map(),
        milestones: new Map(),
        decisions: new Map()
      };

      expect(getNextEpicId(repo, 'Phase 6 - Polish')).toBe('EPIC-phase-6-polish');
      expect(getNextMilestoneId(repo, 'Phase 6 - Polish')).toBe('MILESTONE-phase-6-polish');
    });

    it('should append numeric suffixes for duplicate slug IDs', () => {
      const epic: Epic = {
        id: 'EPIC-phase-6-polish',
        type: 'epic',
        title: 'Phase 6 - Polish',
        status: 'active',
        filePath: '',
        metadata: {},
        body: ''
      };
      const milestone: Milestone = {
        id: 'MILESTONE-phase-6-polish',
        type: 'milestone',
        title: 'Phase 6 - Polish',
        status: 'active',
        targetDate: '2026-09-01',
        filePath: '',
        metadata: {},
        body: ''
      };
      const repo: Repository = {
        root: '',
        tasks: new Map(),
        epics: new Map([[epic.id, epic]]),
        milestones: new Map([[milestone.id, milestone]]),
        decisions: new Map()
      };

      expect(getNextEpicId(repo, 'Phase 6 - Polish')).toBe('EPIC-phase-6-polish-2');
      expect(getNextMilestoneId(repo, 'Phase 6 - Polish')).toBe('MILESTONE-phase-6-polish-2');
    });

    it('should create valid epic and milestone templates', () => {
      const epic = createEpicTemplate('EPIC-new-work', 'New Work');
      const milestone = createMilestoneTemplate(
        'MILESTONE-new-work',
        'New Work',
        '2026-09-01'
      );

      expect(epic).toMatchObject({
        id: 'EPIC-new-work',
        title: 'New Work',
        type: 'epic',
        status: 'active'
      });
      expect(milestone).toMatchObject({
        id: 'MILESTONE-new-work',
        title: 'New Work',
        type: 'milestone',
        status: 'active',
        targetDate: '2026-09-01'
      });
    });
  });

  describe('getAllEntities', () => {
    it('should return all entities', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Task',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const epic: Epic = {
        id: 'EPIC-001',
        type: 'epic',
        title: 'Epic',
        status: 'active',
        filePath: '',
        metadata: {},
        body: ''
      };

      const repo: Repository = {
        root: '',
        tasks: new Map([['TASK-001', task]]),
        epics: new Map([['EPIC-001', epic]]),
        milestones: new Map(),
        decisions: new Map()
      };

      const entities = getAllEntities(repo);

      expect(entities).toHaveLength(2);
      expect(entities[0].id).toBe('TASK-001');
      expect(entities[1].id).toBe('EPIC-001');
    });
  });

  describe('initializeRepository', () => {
    let rootPath: string;

    beforeEach(async () => {
      rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-init-'));
    });

    afterEach(async () => {
      await fs.rm(rootPath, { recursive: true, force: true });
    });

    it('should create the standard PlanFS directory structure', async () => {
      const result = await initializeRepository(rootPath);

      expect(result.created).toEqual([
        '.planfs',
        '.planfs/tasks',
        '.planfs/epics',
        '.planfs/milestones',
        '.planfs/decisions',
        '.planfs/filters',
        '.planfs/archive',
        '.planfs/archive/tasks',
        '.planfs/archive/epics'
      ]);

      for (const dir of result.created) {
        await expect(
          fs.stat(path.join(rootPath, dir))
        ).resolves.toMatchObject({ isDirectory: expect.any(Function) });
      }
    });

    it('should be idempotent', async () => {
      await initializeRepository(rootPath);
      const result = await initializeRepository(rootPath);

      expect(result.created).toEqual([]);
      expect(result.existing).toEqual([
        '.planfs',
        '.planfs/tasks',
        '.planfs/epics',
        '.planfs/milestones',
        '.planfs/decisions',
        '.planfs/filters',
        '.planfs/archive',
        '.planfs/archive/tasks',
        '.planfs/archive/epics'
      ]);
    });
  });

  describe('malformed markdown recovery', () => {
    let rootPath: string;

    beforeEach(async () => {
      rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-malformed-'));
      await initializeRepository(rootPath);
    });

    afterEach(async () => {
      await fs.rm(rootPath, { recursive: true, force: true });
    });

    it('loads entities with missing optional fields using safe defaults', async () => {
      await fs.writeFile(
        path.join(rootPath, '.planfs', 'tasks', 'TASK-010.md'),
        [
          '---',
          'id: TASK-010',
          'title: Missing optional status',
          '---',
          '',
          'Body'
        ].join('\n')
      );

      const repository = await loadRepository(rootPath);
      const task = repository.tasks.get('TASK-010');

      expect(task?.status).toBe('todo');
      expect(task?.body).toBe('Body');
      expect(validateRepositoryState(repository).valid).toBe(true);
    });

    it('recovers a missing id from the file name and reports repair guidance', async () => {
      await fs.writeFile(
        path.join(rootPath, '.planfs', 'tasks', 'TASK-011.md'),
        [
          '---',
          'title: Missing id',
          'status: todo',
          '---',
          '',
          'Body'
        ].join('\n')
      );

      const repository = await loadRepository(rootPath);
      const task = repository.tasks.get('TASK-011');
      const validation = validateRepositoryState(repository);

      expect(task?.id).toBe('TASK-011');
      expect(validation.errors).toContainEqual(expect.objectContaining({
        id: 'TASK-011',
        path: path.join(rootPath, '.planfs', 'tasks', 'TASK-011.md'),
        severity: 'warning',
        message: expect.stringContaining("Missing required field 'id'")
      }));
      expect(validation.errors.find(error => error.message.includes('Repair by adding id: TASK-011'))).toBeDefined();
    });

    it('keeps malformed YAML visible and continues loading unrelated entities', async () => {
      await saveEntity(rootPath, createTaskTemplate('TASK-012', 'Healthy task'));
      await fs.writeFile(
        path.join(rootPath, '.planfs', 'tasks', 'TASK-013.md'),
        [
          '---',
          'invalid: [yaml: content',
          '---',
          '',
          'Malformed body'
        ].join('\n')
      );

      const repository = await loadRepository(rootPath);
      const malformed = repository.tasks.get('TASK-013');
      const validation = validateRepositoryState(repository);

      expect(repository.tasks.has('TASK-012')).toBe(true);
      expect(malformed?.body).toBe('Malformed body');
      expect(malformed?.diagnostics).toContainEqual(expect.objectContaining({
        path: path.join(rootPath, '.planfs', 'tasks', 'TASK-013.md'),
        severity: 'error',
        message: expect.stringContaining('Failed to parse YAML frontmatter')
      }));
      expect(validation.valid).toBe(false);
      expect(validation.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'TASK-013',
          message: expect.stringContaining("Missing required field 'title'")
        })
      ]));
    });

    it('loads invalid enum values as diagnostics instead of hiding the file', async () => {
      await fs.writeFile(
        path.join(rootPath, '.planfs', 'epics', 'EPIC-invalid.md'),
        [
          '---',
          'id: EPIC-invalid',
          'title: Invalid epic',
          'status: nope',
          '---',
          '',
          'Body'
        ].join('\n')
      );

      const repository = await loadRepository(rootPath);
      const validation = validateRepositoryState(repository);

      expect(repository.epics.has('EPIC-invalid')).toBe(true);
      expect(validation.errors).toContainEqual(expect.objectContaining({
        id: 'EPIC-invalid',
        severity: 'error',
        message: expect.stringContaining('Invalid epic status: nope')
      }));
    });

    it('refuses to save when the entity id no longer matches its source file', async () => {
      const task = createTaskTemplate('TASK-014', 'Original task');
      await saveEntity(rootPath, task);
      const repository = await loadRepository(rootPath);
      const loaded = repository.tasks.get('TASK-014')!;

      await expect(saveEntity(rootPath, {
        ...loaded,
        id: 'TASK-999'
      })).rejects.toThrow('does not match existing file name TASK-014');
    });
  });

  describe('archive workflows', () => {
    let rootPath: string;

    beforeEach(async () => {
      rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-archive-'));
      await initializeRepository(rootPath);
    });

    afterEach(async () => {
      await fs.rm(rootPath, { recursive: true, force: true });
    });

    it('archives and restores tasks from the dedicated archive directory', async () => {
      const task = createTaskTemplate('TASK-001', 'Archive me');
      task.backlogOrder = 20;
      await saveEntity(rootPath, task);

      const result = await archiveEntity(rootPath, task.id, {
        now: new Date('2026-06-21T18:44:00Z')
      });

      expect(result.archived.map(entity => entity.id)).toEqual(['TASK-001']);
      await expect(
        fs.stat(path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'))
      ).rejects.toMatchObject({ code: 'ENOENT' });
      const archivedPath = path.join(rootPath, '.planfs', 'archive', 'tasks', 'TASK-001.md');
      await expect(fs.stat(archivedPath)).resolves.toBeDefined();

      let repository = await loadRepository(rootPath);
      expect(repository.tasks.has('TASK-001')).toBe(false);
      expect(repository.archivedTasks?.has('TASK-001')).toBe(true);
      expect(listArchivedEntities(repository).map(entity => entity.id)).toEqual(['TASK-001']);
      expect(validateRepositoryState(repository).valid).toBe(true);

      const restored = await restoreArchivedEntity(rootPath, 'TASK-001', {
        now: new Date('2026-06-21T19:00:00Z')
      });

      expect(restored.archive).toBeUndefined();
      await expect(fs.stat(archivedPath)).rejects.toMatchObject({ code: 'ENOENT' });
      repository = await loadRepository(rootPath);
      expect(repository.tasks.has('TASK-001')).toBe(true);
      expect(repository.archivedTasks?.has('TASK-001')).toBe(false);
    });

    it('allows active tasks to keep historical dependencies on archived tasks', async () => {
      const dependency = {
        ...createTaskTemplate('TASK-001', 'Archived dependency'),
        status: 'done' as const
      };
      const active = {
        ...createTaskTemplate('TASK-002', 'Active dependent'),
        dependsOn: [dependency.id]
      };
      await saveEntity(rootPath, dependency);
      await saveEntity(rootPath, active);
      await archiveEntity(rootPath, dependency.id, {
        now: new Date('2026-06-21T18:44:00Z')
      });

      const repository = await loadRepository(rootPath);
      const result = validateRepositoryState(repository);

      expect(result.valid).toBe(true);
      expect(result.errors).toContainEqual(expect.objectContaining({
        id: 'TASK-002',
        message: 'Task depends on archived task: TASK-001',
        severity: 'warning'
      }));
    });

    it('archives an epic with child tasks and can permanently delete archived items', async () => {
      const epic = createEpicTemplate('EPIC-archive', 'Archive epic');
      const child = {
        ...createTaskTemplate('TASK-001', 'Child task'),
        epic: epic.id
      };
      await saveEntity(rootPath, epic);
      await saveEntity(rootPath, child);

      const result = await archiveEntity(rootPath, epic.id, { includeChildren: true });
      expect(result.archived.map(entity => entity.id).sort()).toEqual(['EPIC-archive', 'TASK-001']);

      await deleteArchivedEntity(rootPath, 'TASK-001');
      const repository = await loadRepository(rootPath);
      expect(repository.archivedTasks?.has('TASK-001')).toBe(false);
      expect(repository.archivedEpics?.has('EPIC-archive')).toBe(true);
    });
  });
});
