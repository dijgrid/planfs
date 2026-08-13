import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  deleteSavedFilter,
  loadSavedFilters,
  matchesCriteria,
  saveSavedFilter,
  searchEntities,
  searchTasks,
  validateSavedFilter
} from './search';
import { Epic, Repository, Task } from './types';

describe('search helpers', () => {
  const taskA: Task = {
    id: 'TASK-001',
    type: 'task',
    title: 'Build saved filters',
    status: 'todo',
    priority: 'high',
    assignee: 'justin',
    epic: 'EPIC-phase-2-enhanced',
    milestone: 'MILESTONE-phase-2',
    refinementState: 'needs-refinement',
    tags: ['search', 'vscode'],
    body: 'Create reusable filtering across the board and explorer.',
    filePath: '',
    metadata: {
      id: 'TASK-001',
      title: 'Build saved filters',
      custom: 'metadata keyword'
    }
  };
  const taskB: Task = {
    id: 'TASK-002',
    type: 'task',
    title: 'Write unrelated docs',
    status: 'done',
    priority: 'low',
    assignee: 'alex',
    tags: ['docs'],
    body: 'Polish setup notes.',
    filePath: '',
    metadata: {}
  };
  const epic: Epic = {
    id: 'EPIC-phase-2-enhanced',
    type: 'epic',
    title: 'Enhanced Editing and Board Views',
    status: 'active',
    body: 'Search and filtering work lives here.',
    filePath: '',
    metadata: {}
  };
  const repository: Repository = {
    root: '',
    tasks: new Map([
      [taskA.id, taskA],
      [taskB.id, taskB]
    ]),
    epics: new Map([[epic.id, epic]]),
    milestones: new Map(),
    decisions: new Map()
  };

  it('searches full text across IDs, titles, metadata, and body', () => {
    expect(searchEntities(repository, { query: 'TASK-001' }).map(e => e.id)).toEqual(['TASK-001']);
    expect(searchEntities(repository, { query: 'saved filters' }).map(e => e.id)).toEqual(['TASK-001']);
    expect(searchEntities(repository, { query: 'metadata keyword' }).map(e => e.id)).toEqual(['TASK-001']);
    expect(searchEntities(repository, { query: 'filtering work' }).map(e => e.id)).toEqual(['EPIC-phase-2-enhanced']);
  });

  it('filters tasks by status, assignee, epic, milestone, priority, refinement state, and tags', () => {
    expect(searchTasks(repository, { status: 'todo' }).map(task => task.id)).toEqual(['TASK-001']);
    expect(searchTasks(repository, { status: ['todo', 'done'] }).map(task => task.id)).toEqual([
      'TASK-001',
      'TASK-002'
    ]);
    expect(searchTasks(repository, { assignee: 'justin' }).map(task => task.id)).toEqual(['TASK-001']);
    expect(searchTasks(repository, { epic: 'EPIC-phase-2-enhanced' }).map(task => task.id)).toEqual(['TASK-001']);
    expect(searchTasks(repository, { milestone: 'MILESTONE-phase-2' }).map(task => task.id)).toEqual(['TASK-001']);
    expect(searchTasks(repository, { priority: 'high' }).map(task => task.id)).toEqual(['TASK-001']);
    expect(searchTasks(repository, { refinementState: 'needs-refinement' }).map(task => task.id)).toEqual(['TASK-001']);
    expect(searchTasks(repository, { tags: ['search', 'vscode'] }).map(task => task.id)).toEqual(['TASK-001']);
  });

  it('does not match non-task entities for task-only fields', () => {
    expect(matchesCriteria(epic, { assignee: 'justin' })).toBe(false);
  });

  it('loads named saved filters from .planfs/filters', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-filters-'));

    try {
      await fs.mkdir(path.join(rootPath, '.planfs', 'filters'), { recursive: true });
      await fs.writeFile(
        path.join(rootPath, '.planfs', 'filters', 'mine.json'),
        JSON.stringify({
          name: 'Mine',
          criteria: {
            assignee: 'justin',
            status: 'todo',
            tags: ['search']
          }
        }),
        'utf-8'
      );

      await expect(loadSavedFilters(rootPath)).resolves.toEqual([
        {
          id: 'mine',
          name: 'Mine',
          criteria: {
            assignee: 'justin',
            status: 'todo',
            tags: ['search']
          }
        }
      ]);
    } finally {
      await fs.rm(rootPath, { recursive: true, force: true });
    }
  });

  it('validates, saves, renames, and deletes shared filters', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-filter-writes-'));
    try {
      await saveSavedFilter(rootPath, {
        id: 'my-work',
        name: '  My Work  ',
        description: '  Assigned tasks  ',
        criteria: { assignee: 'justin', status: ['todo', 'review'] }
      });
      await saveSavedFilter(rootPath, {
        id: 'renamed-work',
        name: 'Renamed Work',
        criteria: { tags: ['release'] }
      }, 'my-work');

      await expect(loadSavedFilters(rootPath)).resolves.toEqual([
        {
          id: 'renamed-work',
          name: 'Renamed Work',
          criteria: { tags: ['release'] }
        }
      ]);
      await deleteSavedFilter(rootPath, 'renamed-work');
      await expect(loadSavedFilters(rootPath)).resolves.toEqual([]);
    } finally {
      await fs.rm(rootPath, { recursive: true, force: true });
    }
  });

  it('rejects invalid saved filter fields and values', () => {
    const base = { id: 'valid', name: 'Valid', criteria: {} };
    expect(() => validateSavedFilter({ ...base, id: 'bad id' })).toThrow('Filter id');
    expect(() => validateSavedFilter({ ...base, name: ' ' })).toThrow('name is required');
    expect(() => validateSavedFilter({ ...base, criteria: { unsupported: true } as never }))
      .toThrow('Unsupported saved-filter criterion');
    expect(() => validateSavedFilter({ ...base, criteria: { status: 'active' } }))
      .toThrow('status is invalid');
  });

  it('loads defaults and string tags and ignores non-JSON entries', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-filter-normalize-'));
    try {
      const filtersPath = path.join(rootPath, '.planfs', 'filters');
      await fs.mkdir(path.join(filtersPath, 'directory.json'), { recursive: true });
      await fs.writeFile(path.join(filtersPath, 'notes.txt'), 'ignored', 'utf8');
      await fs.writeFile(
        path.join(filtersPath, 'defaults.json'),
        JSON.stringify({ criteria: { tags: 'release' } }),
        'utf8'
      );

      await expect(loadSavedFilters(rootPath)).resolves.toEqual([
        { id: 'defaults', name: 'defaults', criteria: { tags: ['release'] } }
      ]);
    } finally {
      await fs.rm(rootPath, { recursive: true, force: true });
    }
  });

  it('returns no filters when the shared filter directory is absent', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-no-filters-'));
    try {
      await expect(loadSavedFilters(rootPath)).resolves.toEqual([]);
    } finally {
      await fs.rm(rootPath, { recursive: true, force: true });
    }
  });
});
