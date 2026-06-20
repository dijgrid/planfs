import { DiscoveredFile } from '../src/files';
import { loadEntity } from '../src/loader';

describe('Loader', () => {
  it('loads epic priority metadata', () => {
    const file: DiscoveredFile = {
      path: '.planfs/epics/EPIC-test.md',
      type: 'epic',
      name: 'EPIC-test.md'
    };
    const content = `---
id: EPIC-test
title: Test Epic
status: active
priority: high
---

Epic body`;

    const entity = loadEntity(file, content);

    expect(entity).toMatchObject({
      id: 'EPIC-test',
      type: 'epic',
      priority: 'high'
    });
  });
});
