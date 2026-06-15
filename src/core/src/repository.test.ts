/**
 * Tests for repository module
 */

import {
  generateEntityContent,
  getNextTaskId,
  createTaskTemplate,
  getAllEntities
} from '../src/repository';
import { Task, Epic, Repository } from '../src/types';

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
});
