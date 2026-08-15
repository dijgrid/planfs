import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  applySemanticFormats,
  previewSemanticEntityFormat,
  previewSemanticFormats
} from './semantic-formatter';
import { ensurePlanfsStructure } from './files';
import { archiveEntity } from './repository';
import { Task } from './types';

describe('semantic Markdown formatter', () => {
  it('canonicalizes only recognized headings and criterion markers while preserving opaque content', () => {
    const filePath = '/repo/.planfs/tasks/TASK-001.md';
    const entity = task('TASK-001', filePath);
    const custom = [
      '## Experiment Notes',
      '<!-- keep this comment -->',
      '```md',
      '## Acceptance',
      '- [X] not a real criterion',
      '```',
      '<div data-plan="TASK-999">raw HTML</div>',
      '![diagram](./diagram.png)',
      '[reference](https://example.com?a=1&b=2)'
    ].join('\n');
    const source = [
      '---\r',
      'id: TASK-001\r',
      'title: Format safely\r',
      'status: todo\r',
      '---\r',
      '\r',
      'Keep TASK-777 as prose.\r',
      '\r',
      '## Acceptance\r',
      '\r',
      '*  [X]  Keep links [intact](https://example.com).\r',
      '+ Ordinary criterion\r',
      '  - Nested ordinary criterion\r',
      '\r',
      custom,
      '',
      '## Technical Notes',
      '',
      'Do not rewrite `- [X] inline`.',
      ''
    ].join('\n');

    const preview = previewSemanticEntityFormat(entity, source, '/repo');

    expect(preview.changed).toBe(true);
    expect(preview.blocked).toBe(false);
    expect(preview.edits.map(edit => edit.kind)).toEqual([
      'canonicalize-heading',
      'canonicalize-task-marker',
      'add-task-marker',
      'add-task-marker',
      'canonicalize-heading'
    ]);
    expect(preview.formattedContent).toContain('## Acceptance Criteria\r\n');
    expect(preview.formattedContent).toContain('- [x] Keep links [intact](https://example.com).\r\n');
    expect(preview.formattedContent).toContain('- [ ] Ordinary criterion\r\n');
    expect(preview.formattedContent).toContain('  - [ ] Nested ordinary criterion\r\n');
    expect(preview.formattedContent).toContain('## Implementation Notes\n');
    expect(preview.formattedContent).toContain(custom);
    expect(preview.formattedContent).toContain('Keep TASK-777 as prose.');
    expect(preview.formattedContent.slice(0, preview.formattedContent.indexOf('---\r\n\r\n') + 7))
      .toBe(source.slice(0, source.indexOf('---\r\n\r\n') + 7));
    expect(preview.diff).toContain('@@ body:');
    expect(preview.diff).toContain('-## Acceptance');
    expect(preview.diff).toContain('+## Acceptance Criteria');

    const second = previewSemanticEntityFormat(entity, preview.formattedContent, '/repo');
    expect(second.changed).toBe(false);
    expect(second.edits).toEqual([]);
    expect(second.diff).toBe('');
  });

  it('reports duplicate recognized sections and skips their headings and criteria without merging', () => {
    const entity = task('TASK-002', '/repo/.planfs/tasks/TASK-002.md');
    const source = file('TASK-002', 'Duplicate sections', [
      'Summary.',
      '',
      '## Acceptance',
      '',
      '- First criterion',
      '',
      '## Acceptance Criteria',
      '',
      '* [X] Second criterion',
      '',
      '## Technical Notes',
      '',
      'A safe independent alias.'
    ].join('\n'));

    const preview = previewSemanticEntityFormat(entity, source);

    expect(preview.issues).toContainEqual(expect.objectContaining({
      code: 'format.section.duplicate-skipped',
      sectionKey: 'acceptanceCriteria'
    }));
    expect(preview.formattedContent).toContain('## Acceptance\n\n- First criterion');
    expect(preview.formattedContent).toContain('## Acceptance Criteria\n\n* [X] Second criterion');
    expect(preview.formattedContent).toContain('## Implementation Notes');
    expect(preview.formattedContent.match(/## Acceptance Criteria/g)).toHaveLength(1);
  });

  describe('repository preview and apply', () => {
    let rootPath: string;

    beforeEach(async () => {
      rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-semantic-format-'));
      await ensurePlanfsStructure(rootPath);
    });

    afterEach(async () => {
      await fs.rm(rootPath, { recursive: true, force: true });
    });

    it('requires exact preview fingerprints and applies a validated batch before becoming idempotent', async () => {
      await writeTask(rootPath, 'TASK-001', 'First', '## Acceptance\n\n- First criterion\n');
      await writeTask(rootPath, 'TASK-002', 'Second', '## Technical Notes\n\nSecond notes.\n');
      const firstPath = taskPath(rootPath, 'TASK-001');
      const secondPath = taskPath(rootPath, 'TASK-002');
      const firstPreview = await previewSemanticFormats(rootPath, ['TASK-001', 'TASK-002']);
      const secondBefore = await fs.readFile(secondPath, 'utf8');

      await fs.appendFile(firstPath, '<!-- human edit -->\n', 'utf8');
      await expect(applySemanticFormats(
        rootPath,
        ['TASK-001', 'TASK-002'],
        firstPreview.expectedFingerprints
      )).rejects.toThrow('TASK-001 changed since preview');
      await expect(fs.readFile(secondPath, 'utf8')).resolves.toBe(secondBefore);

      const fresh = await previewSemanticFormats(rootPath, ['TASK-001', 'TASK-002']);
      const applied = await applySemanticFormats(
        rootPath,
        ['TASK-001', 'TASK-002'],
        fresh.expectedFingerprints
      );
      expect(applied.appliedEntityIds).toEqual(['TASK-001', 'TASK-002']);
      await expect(fs.readFile(firstPath, 'utf8')).resolves.toContain('## Acceptance Criteria\n\n- [ ] First criterion');
      await expect(fs.readFile(firstPath, 'utf8')).resolves.toContain('<!-- human edit -->');
      await expect(fs.readFile(secondPath, 'utf8')).resolves.toContain('## Implementation Notes');

      const stable = await previewSemanticFormats(rootPath, ['TASK-001', 'TASK-002']);
      expect(stable.changedEntityIds).toEqual([]);
      expect(stable.expectedFingerprints).toEqual({});
    });

    it('validates every proposed result before writing any selected file', async () => {
      await writeTask(rootPath, 'TASK-001', 'Valid', '## Acceptance\n\n- Valid criterion\n');
      await fs.writeFile(taskPath(rootPath, 'TASK-002'), [
        '---',
        'id: TASK-002',
        'status: todo',
        '---',
        '',
        '## Acceptance',
        '',
        '- Invalid task has no title.',
        ''
      ].join('\n'), 'utf8');
      const validBefore = await fs.readFile(taskPath(rootPath, 'TASK-001'), 'utf8');
      const preview = await previewSemanticFormats(rootPath, ['TASK-001', 'TASK-002']);

      await expect(applySemanticFormats(
        rootPath,
        ['TASK-001', 'TASK-002'],
        preview.expectedFingerprints
      )).rejects.toThrow('Formatted repository validation failed');
      await expect(fs.readFile(taskPath(rootPath, 'TASK-001'), 'utf8')).resolves.toBe(validBefore);
    });

    it('treats archived artifacts as immutable formatter history', async () => {
      await writeTask(rootPath, 'TASK-003', 'Archived', '## Acceptance\n\n- Archived criterion\n');
      await archiveEntity(rootPath, 'TASK-003', { disposition: 'deferred' });

      await expect(previewSemanticFormats(rootPath, ['TASK-003']))
        .rejects.toThrow('Entity not found: TASK-003');
      await expect(fs.readFile(
        path.join(rootPath, '.planfs', 'archive', 'tasks', 'TASK-003.md'),
        'utf8'
      )).resolves.toContain('## Acceptance\n\n- Archived criterion');
    });
  });
});

function task(id: string, filePath: string): Task {
  return {
    id,
    type: 'task',
    filePath,
    metadata: { id, title: id, status: 'todo' },
    body: '',
    title: id,
    status: 'todo'
  };
}

function file(id: string, title: string, body: string): string {
  return ['---', `id: ${id}`, `title: ${title}`, 'status: todo', '---', '', body].join('\n');
}

async function writeTask(rootPath: string, id: string, title: string, body: string): Promise<void> {
  await fs.writeFile(taskPath(rootPath, id), file(id, title, body), 'utf8');
}

function taskPath(rootPath: string, id: string): string {
  return path.join(rootPath, '.planfs', 'tasks', `${id}.md`);
}
