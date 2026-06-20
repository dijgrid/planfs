/**
 * Tests for validator module
 */

import {
  validateEntity,
  validateRepository,
  validateAll
} from '../src/validator';
import { Task, Epic, Milestone } from '../src/types';

describe('Validator', () => {
  describe('validateEntity', () => {
    it('should validate a valid task', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateEntity(task);

      expect(errors).toHaveLength(0);
    });

    it('should catch missing id', () => {
      const task: Task = {
        id: '',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateEntity(task);

      expect(errors.some(e => e.message.includes('id'))).toBe(true);
    });

    it('should catch invalid task status', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'invalid' as any,
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateEntity(task);

      expect(errors.some(e => e.message.includes('status'))).toBe(true);
    });

    it('should catch invalid task id format', () => {
      const task: Task = {
        id: 'task-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateEntity(task);

      expect(errors.some(e => e.message.includes('Schema validation'))).toBe(true);
    });

    it('should catch invalid priority', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        priority: 'invalid' as any,
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateEntity(task);

      expect(errors.some(e => e.message.includes('priority'))).toBe(true);
    });

    it('should catch invalid refinement state and backlog order', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        refinementState: 'unclear' as any,
        backlogOrder: 'first' as any,
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateEntity(task);

      expect(errors.some(e => e.message.includes('refinementState'))).toBe(true);
      expect(errors.some(e => e.message.includes('backlogOrder'))).toBe(true);
    });

    it('should catch invalid epic priority', () => {
      const epic: Epic = {
        id: 'EPIC-test',
        type: 'epic',
        title: 'Test Epic',
        status: 'active',
        priority: 'invalid' as any,
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateEntity(epic);

      expect(errors.some(e => e.message.includes('priority'))).toBe(true);
    });

    it('should catch invalid milestone status', () => {
      const milestone: Milestone = {
        id: 'MILESTONE-001',
        type: 'milestone',
        title: 'Release',
        status: 'invalid' as any,
        targetDate: '2026-07-01',
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateEntity(milestone);

      expect(errors.some(e => e.message.includes('status'))).toBe(true);
    });

    it('should catch missing milestone targetDate', () => {
      const milestone: Milestone = {
        id: 'MILESTONE-001',
        type: 'milestone',
        title: 'Release',
        status: 'active',
        targetDate: '',
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateEntity(milestone);

      expect(errors.some(e => e.message.includes('targetDate'))).toBe(true);
    });
  });

  describe('validateRepository', () => {
    it('should detect duplicate IDs', () => {
      const task1: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Task 1',
        status: 'todo',
        filePath: 'file1.md',
        metadata: {},
        body: ''
      };

      const task2: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Task 2',
        status: 'todo',
        filePath: 'file2.md',
        metadata: {},
        body: ''
      };

      const errors = validateRepository([task1, task2]);

      expect(errors.some(e => e.message.includes('Duplicate'))).toBe(true);
    });

    it('should detect missing epic reference', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Task',
        status: 'todo',
        epic: 'EPIC-999',
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

      const errors = validateRepository([task, epic]);

      expect(errors.some(e => e.message.includes('epic not found'))).toBe(true);
    });

    it('should detect circular dependencies', () => {
      const task1: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Task 1',
        status: 'todo',
        dependsOn: ['TASK-002'],
        filePath: '',
        metadata: {},
        body: ''
      };

      const task2: Task = {
        id: 'TASK-002',
        type: 'task',
        title: 'Task 2',
        status: 'todo',
        dependsOn: ['TASK-001'],
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateRepository([task1, task2]);

      expect(errors.some(e => e.message.includes('Circular'))).toBe(true);
    });

    it('should allow valid dependencies', () => {
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
        dependsOn: ['TASK-001'],
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateRepository([task1, task2]);

      expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should allow shared dependencies without reporting a cycle', () => {
      const task1: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Task 1',
        status: 'todo',
        dependsOn: ['TASK-002', 'TASK-003'],
        filePath: '',
        metadata: {},
        body: ''
      };

      const task2: Task = {
        id: 'TASK-002',
        type: 'task',
        title: 'Task 2',
        status: 'todo',
        dependsOn: ['TASK-004'],
        filePath: '',
        metadata: {},
        body: ''
      };

      const task3: Task = {
        id: 'TASK-003',
        type: 'task',
        title: 'Task 3',
        status: 'todo',
        dependsOn: ['TASK-004'],
        filePath: '',
        metadata: {},
        body: ''
      };

      const task4: Task = {
        id: 'TASK-004',
        type: 'task',
        title: 'Task 4',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const errors = validateRepository([task1, task2, task3, task4]);

      expect(errors.some(e => e.message.includes('Circular'))).toBe(false);
    });
  });

  describe('validateAll', () => {
    it('should return valid result for good data', () => {
      const task: Task = {
        id: 'TASK-001',
        type: 'task',
        title: 'Test Task',
        status: 'todo',
        filePath: '',
        metadata: {},
        body: ''
      };

      const result = validateAll([task]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid result for bad data', () => {
      const task: Task = {
        id: '',
        type: 'task',
        title: '',
        status: 'invalid' as any,
        filePath: '',
        metadata: {},
        body: ''
      };

      const result = validateAll([task]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
