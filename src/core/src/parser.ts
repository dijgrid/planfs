/**
 * YAML frontmatter parser
 * Extracts and parses YAML frontmatter from markdown files
 */

import { parse as parseYaml } from 'yaml';

export interface ParsedContent {
  metadata: Record<string, unknown>;
  body: string;
}

/**
 * Parse YAML frontmatter from markdown content
 * Expected format:
 * ---
 * key: value
 * ---
 * Body content here
 */
export function parseFrontmatter(content: string): ParsedContent {
  const lines = content.split('\n');

  // First line should be ---
  if (lines[0]?.trim() !== '---') {
    throw new Error('Content must start with --- frontmatter delimiter');
  }

  // Find closing ---
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error('Frontmatter must be closed with --- delimiter');
  }

  // Extract and parse YAML
  const yamlContent = lines.slice(1, endIndex).join('\n');
  let metadata: Record<string, unknown> = {};

  if (yamlContent.trim()) {
    try {
      const parsed = parseYaml(yamlContent);
      metadata = typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
      throw new Error(
        `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Extract body
  const body = lines.slice(endIndex + 1).join('\n').trimStart();

  return { metadata, body };
}

/**
 * Normalize metadata keys from kebab-case or snake_case to camelCase
 */
export function normalizeMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const camelKey = key.replace(/[-_]([a-z])/g, (_, char) => char.toUpperCase());
    normalized[camelKey] = value;
  }

  return normalized;
}
