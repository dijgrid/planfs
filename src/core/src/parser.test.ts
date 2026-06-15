/**
 * Tests for parser module
 */

import { parseFrontmatter, normalizeMetadata } from '../src/parser';

describe('Parser', () => {
  describe('parseFrontmatter', () => {
    it('should parse valid frontmatter', () => {
      const content = `---
id: TASK-001
title: Test Task
status: todo
---

Body content here`;

      const result = parseFrontmatter(content);

      expect(result.metadata.id).toBe('TASK-001');
      expect(result.metadata.title).toBe('Test Task');
      expect(result.metadata.status).toBe('todo');
      expect(result.body).toBe('Body content here');
    });

    it('should handle empty body', () => {
      const content = `---
id: TASK-001
---`;

      const result = parseFrontmatter(content);

      expect(result.metadata.id).toBe('TASK-001');
      expect(result.body).toBe('');
    });

    it('should throw on missing opening delimiter', () => {
      const content = `id: TASK-001
---

Body`;

      expect(() => parseFrontmatter(content)).toThrow('must start with');
    });

    it('should throw on missing closing delimiter', () => {
      const content = `---
id: TASK-001
Body`;

      expect(() => parseFrontmatter(content)).toThrow('must be closed');
    });

    it('should throw on invalid YAML', () => {
      const content = `---
invalid: [yaml: content
---

Body`;

      expect(() => parseFrontmatter(content)).toThrow('Failed to parse YAML');
    });

    it('should handle multiline body', () => {
      const content = `---
id: TASK-001
---

Line 1
Line 2
Line 3`;

      const result = parseFrontmatter(content);

      expect(result.body).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle YAML arrays', () => {
      const content = `---
id: TASK-001
tags:
  - tag1
  - tag2
---

Body`;

      const result = parseFrontmatter(content);

      expect(Array.isArray(result.metadata.tags)).toBe(true);
      expect(result.metadata.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('normalizeMetadata', () => {
    it('should convert kebab-case and snake_case to camelCase', () => {
      const metadata = {
        'depends-on': ['TASK-001'],
        due_date: '2026-07-01',
        created_at: '2026-06-14'
      };

      const result = normalizeMetadata(metadata);

      expect(result.dependsOn).toBe(metadata['depends-on']);
      expect(result.dueDate).toBe(metadata.due_date);
      expect(result.createdAt).toBe(metadata.created_at);
    });

    it('should preserve camelCase fields', () => {
      const metadata = {
        id: 'TASK-001',
        title: 'Test',
        camelCaseField: 'value'
      };

      const result = normalizeMetadata(metadata);

      expect(result.id).toBe('TASK-001');
      expect(result.camelCaseField).toBe('value');
    });
  });
});
