/**
 * YAML frontmatter parser
 * Extracts and parses YAML frontmatter from markdown files
 */

import { parse as parseYaml } from 'yaml';

export interface ParsedContent {
  metadata: Record<string, unknown>;
  body: string;
}

export interface FrontmatterDiagnostic {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface TolerantParsedContent extends ParsedContent {
  diagnostics: FrontmatterDiagnostic[];
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
 * Parse YAML frontmatter without throwing.
 *
 * This is intended for repository loading paths where one malformed file should
 * not hide unrelated planning artifacts from the user.
 */
export function parseFrontmatterTolerant(content: string): TolerantParsedContent {
  const lines = content.split('\n');
  const diagnostics: FrontmatterDiagnostic[] = [];

  if (lines[0]?.trim() !== '---') {
    return {
      metadata: {},
      body: content.trimStart(),
      diagnostics: [{
        field: 'frontmatter',
        message: 'Missing opening YAML frontmatter delimiter. Repair by adding --- before metadata and a closing --- before the Markdown body.',
        severity: 'error'
      }]
    };
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endIndex === -1) {
    const yamlContent = lines.slice(1).join('\n');
    const metadata = parseYamlObject(yamlContent, diagnostics);
    diagnostics.push({
      field: 'frontmatter',
      message: 'Missing closing YAML frontmatter delimiter. Repair by adding a line containing only --- before the Markdown body.',
      severity: 'error'
    });
    return {
      metadata,
      body: '',
      diagnostics
    };
  }

  const yamlContent = lines.slice(1, endIndex).join('\n');
  const metadata = parseYamlObject(yamlContent, diagnostics);
  const body = lines.slice(endIndex + 1).join('\n').trimStart();
  return {
    metadata,
    body,
    diagnostics
  };
}

function parseYamlObject(
  yamlContent: string,
  diagnostics: FrontmatterDiagnostic[]
): Record<string, unknown> {
  if (!yamlContent.trim()) {
    return {};
  }

  try {
    const parsed = parseYaml(yamlContent);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }

    diagnostics.push({
      field: 'frontmatter',
      message: 'YAML frontmatter must be a key/value object. Repair by using fields such as id, title, and status.',
      severity: 'error'
    });
    return {};
  } catch (error) {
    diagnostics.push({
      field: 'frontmatter',
      message: `Failed to parse YAML frontmatter. Repair the YAML syntax before relying on metadata. Parser message: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error'
    });
    return {};
  }
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
