import { promises as fs } from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { createTaskTemplate } from './repository';
import { SemanticInspectionCache } from './semantic-inspection';
import { parseSemanticDocument } from './semantic';
import { validateSemanticDocument } from './semantic-validator';
import { EntityType } from './types';

const FIXTURE_ROOT = path.join(__dirname, 'fixtures', 'semantic-v1-4');

const fixtures: Array<{
  file: string;
  type: EntityType;
  expectedCodes: string[];
}> = [
  { file: 'canonical-task.md', type: 'task', expectedCodes: [] },
  { file: 'legacy-task.md', type: 'task', expectedCodes: ['content.section.alias'] },
  { file: 'custom-imported-task.md', type: 'task', expectedCodes: [] },
  {
    file: 'ambiguous-duplicate-task.md',
    type: 'task',
    expectedCodes: ['content.section.alias', 'content.section.duplicate', 'content.section.ambiguous', 'content.section.empty']
  },
  { file: 'malformed-task.md', type: 'task', expectedCodes: ['content.markdown.unclosed-fence'] },
  { file: 'canonical-decision.md', type: 'decision', expectedCodes: [] }
];

describe('v1.4 semantic compatibility corpus', () => {
  it.each(fixtures)('tolerantly reads $file without losing source', async fixture => {
    const markdown = await fs.readFile(path.join(FIXTURE_ROOT, fixture.file), 'utf8');
    const document = parseSemanticDocument(fixture.type, markdown, { filePath: fixture.file });

    expect(document.source.rawMarkdown).toBe(markdown);
    expect(document.contractVersion).toBe('1.0.0');
    expect(document.diagnostics.map(diagnostic => diagnostic.code)).toEqual(
      expect.arrayContaining(fixture.expectedCodes)
    );
    expect(document.sections.some(section => section.key === null)).toBe(
      fixture.file === 'custom-imported-task.md' || fixture.file === 'legacy-task.md'
    );
  });

  it('keeps parser and validation throughput within the v1.4 regression budget', async () => {
    const bodies = await Promise.all(fixtures.map(async fixture => ({
      ...fixture,
      markdown: await fs.readFile(path.join(FIXTURE_ROOT, fixture.file), 'utf8')
    })));
    const started = performance.now();
    for (let index = 0; index < 1_000; index += 1) {
      const fixture = bodies[index % bodies.length]!;
      const document = parseSemanticDocument(fixture.type, fixture.markdown);
      if (fixture.type === 'task') {
        const entity = {
          ...createTaskTemplate(`TASK-${String(index).padStart(3, '0')}`, 'Synthetic fixture'),
          body: fixture.markdown
        };
        validateSemanticDocument(entity, document, { tier: 'automation-ready' });
      }
    }
    expect(performance.now() - started).toBeLessThan(5_000);
  });

  it('reuses an unchanged inspection within the editor interaction budget', async () => {
    const body = await fs.readFile(path.join(FIXTURE_ROOT, 'canonical-task.md'), 'utf8');
    const entity = { ...createTaskTemplate('TASK-900', 'Cached fixture'), body };
    const cache = new SemanticInspectionCache({ capacity: 8 });

    await cache.inspect(entity, { tier: 'automation-ready', analysis: true, language: 'en' });
    const started = performance.now();
    for (let index = 0; index < 100; index += 1) {
      await cache.inspect(entity, { tier: 'automation-ready', analysis: true, language: 'en' });
    }
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(cache.stats).toMatchObject({ hits: 100, misses: 1, size: 1, evictions: 0 });

    const changed = { ...entity, body: `${body}\nChanged.` };
    await cache.inspect(changed, { tier: 'automation-ready', analysis: true, language: 'en' });
    expect(cache.stats.misses).toBe(2);
  });
});
