import { createHash } from 'crypto';
import * as path from 'path';
import { readFile, writeFile } from './files';
import { getAllEntities, loadRepository, validateRepositoryState } from './repository';
import { parseSemanticDocument } from './semantic';
import { getSemanticContentProfile } from './semantic-profiles';
import { OrderedSection, SourceRange } from './semantic-types';
import { validateSemanticRepository } from './semantic-validator';
import { Entity, Repository } from './types';

export const SEMANTIC_FORMAT_VERSION = '1.0.0' as const;

export type SemanticFormatEditKind =
  | 'canonicalize-heading'
  | 'canonicalize-task-marker'
  | 'add-task-marker';

export interface SemanticFormatEdit {
  kind: SemanticFormatEditKind;
  sectionKey: string;
  range: SourceRange;
  before: string;
  after: string;
}

export interface SemanticFormatIssue {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  sectionKey: string | null;
  range: SourceRange | null;
  blocksApply: boolean;
}

export interface SemanticFormatEntityPreview {
  formatVersion: typeof SEMANTIC_FORMAT_VERSION;
  entityId: string;
  entityType: Entity['type'];
  filePath: string;
  sourceFingerprint: string;
  changed: boolean;
  blocked: boolean;
  edits: SemanticFormatEdit[];
  issues: SemanticFormatIssue[];
  diff: string;
  formattedContent: string;
}

export interface SemanticFormatBatchPreview {
  formatVersion: typeof SEMANTIC_FORMAT_VERSION;
  entityIds: string[];
  changedEntityIds: string[];
  blockedEntityIds: string[];
  expectedFingerprints: Record<string, string>;
  previews: SemanticFormatEntityPreview[];
}

export interface SemanticFormatApplyResult extends SemanticFormatBatchPreview {
  appliedEntityIds: string[];
}

interface PendingEdit extends SemanticFormatEdit {
  start: number;
  end: number;
}

/** Preview deterministic Markdown-only normalization for a bounded entity list. */
export async function previewSemanticFormats(
  rootPath: string,
  entityIds: readonly string[]
): Promise<SemanticFormatBatchPreview> {
  const repository = await loadRepository(rootPath);
  const entities = resolveEntities(repository, entityIds);
  const previews = await Promise.all(entities.map(async entity => (
    previewSemanticEntityFormat(entity, await readFile(entity.filePath), rootPath)
  )));
  return batchPreview(previews);
}

/**
 * Apply exactly the previously previewed source snapshots. Every proposed
 * result is validated before the first bounded write occurs.
 */
export async function applySemanticFormats(
  rootPath: string,
  entityIds: readonly string[],
  expectedFingerprints: Readonly<Record<string, string>>
): Promise<SemanticFormatApplyResult> {
  const repository = await loadRepository(rootPath);
  const entities = resolveEntities(repository, entityIds);
  const previews = await Promise.all(entities.map(async entity => (
    previewSemanticEntityFormat(entity, await readFile(entity.filePath), rootPath)
  )));

  for (const preview of previews.filter(item => item.changed)) {
    const expected = expectedFingerprints[preview.entityId];
    if (!expected) {
      throw new Error(`Format apply requires the preview fingerprint for ${preview.entityId}`);
    }
    if (expected !== preview.sourceFingerprint) {
      throw new Error(`Format conflict: ${preview.entityId} changed since preview`);
    }
    if (preview.blocked) {
      throw new Error(`Format apply is blocked for ${preview.entityId}; review its formatter issues`);
    }
  }

  const proposedRepository = repositoryWithFormattedBodies(repository, previews);
  const selectedIds = new Set(previews.map(preview => preview.entityId));
  const selectedPaths = new Set(previews.map(preview => preview.filePath));
  const repositoryValidation = validateRepositoryState(proposedRepository);
  const selectedRepositoryErrors = repositoryValidation.errors.filter(error => (
    error.severity === 'error'
    && (
      (error.id !== undefined && selectedIds.has(error.id))
      || (error.path !== undefined && selectedPaths.has(error.path))
    )
  ));
  if (selectedRepositoryErrors.length > 0) {
    const first = selectedRepositoryErrors[0];
    throw new Error(`Formatted repository validation failed${first ? `: ${first.message}` : ''}`);
  }
  const semanticValidation = await validateSemanticRepository(proposedRepository, { tier: 'baseline' });
  const selectedSemanticErrors = semanticValidation.diagnostics.filter(diagnostic => (
    diagnostic.severity === 'error' && selectedIds.has(diagnostic.entityId)
  ));
  if (selectedSemanticErrors.length > 0) {
    const first = selectedSemanticErrors[0];
    throw new Error(`Formatted semantic validation failed${first ? `: ${first.code} ${first.message}` : ''}`);
  }

  // Recheck every source immediately before writing so validation cannot apply
  // a stale snapshot after a human edit.
  for (const preview of previews.filter(item => item.changed)) {
    const current = await readFile(preview.filePath);
    if (fingerprint(current) !== preview.sourceFingerprint) {
      throw new Error(`Format conflict: ${preview.entityId} changed during validation`);
    }
  }

  const appliedEntityIds: string[] = [];
  for (const preview of previews.filter(item => item.changed)) {
    await writeFile(preview.filePath, preview.formattedContent);
    appliedEntityIds.push(preview.entityId);
  }
  return { ...batchPreview(previews), appliedEntityIds };
}

export function previewSemanticEntityFormat(
  entity: Entity,
  sourceContent: string,
  rootPath = ''
): SemanticFormatEntityPreview {
  const { bodyStart, body } = splitFrontmatterBody(sourceContent);
  const document = parseSemanticDocument(entity.type, body, { filePath: entity.filePath });
  const profile = getSemanticContentProfile(entity.type);
  const definitionByKey = new Map(profile.sections.map(definition => [definition.key, definition]));
  const duplicateKeys = new Set(
    Object.entries(document.knownSections)
      .filter(([, sections]) => sections.length > 1)
      .map(([key]) => key)
  );
  const edits: PendingEdit[] = [];
  const issues: SemanticFormatIssue[] = [];

  for (const key of [...duplicateKeys].sort()) {
    const sections = document.knownSections[key] ?? [];
    issues.push({
      code: 'format.section.duplicate-skipped',
      severity: 'warning',
      message: `Skipped '${key}' because the recognized section occurs ${sections.length} times; formatter does not merge duplicates.`,
      sectionKey: key,
      range: sections[1]?.headingRange ?? sections[0]?.headingRange ?? null,
      blocksApply: false
    });
  }

  const unsafeDiagnostics = document.diagnostics.filter(diagnostic => (
    diagnostic.conformance === 'baseline' && diagnostic.severity === 'error'
  ));
  for (const diagnostic of unsafeDiagnostics) {
    issues.push({
      code: 'format.document.unsafe',
      severity: 'error',
      message: `Cannot safely format this Markdown region: ${diagnostic.message}`,
      sectionKey: sectionKeyAt(document.sections, diagnostic.sectionIndex),
      range: diagnostic.range,
      blocksApply: true
    });
  }

  if (unsafeDiagnostics.length === 0) {
    for (const section of document.sections) {
      if (!section.key || duplicateKeys.has(section.key)) continue;
      const definition = definitionByKey.get(section.key);
      if (!definition) continue;
      addEdit(edits, {
        kind: 'canonicalize-heading',
        sectionKey: section.key,
        range: section.headingRange,
        start: section.headingRange.start.offset,
        end: section.headingRange.end.offset,
        before: body.slice(section.headingRange.start.offset, section.headingRange.end.offset),
        after: `## ${definition.canonicalHeading}`
      });
    }

    for (const criterion of document.criteria) {
      const section = document.sections[criterion.sectionIndex];
      if (!section?.key || duplicateKeys.has(section.key)) continue;
      const lineEnd = nextLineEnding(body, criterion.range.start.offset);
      const firstLine = body.slice(criterion.range.start.offset, lineEnd);
      const taskMarker = /^(\s*)([-+*])[ \t]+\[([ xX])\][ \t]+/.exec(firstLine);
      if (taskMarker?.[0]) {
        const after = `${taskMarker[1] ?? ''}- [${criterion.checked === true ? 'x' : ' '}] `;
        addEdit(edits, {
          kind: 'canonicalize-task-marker',
          sectionKey: section.key,
          range: rangePrefix(criterion.range, taskMarker[0].length, body),
          start: criterion.range.start.offset,
          end: criterion.range.start.offset + taskMarker[0].length,
          before: taskMarker[0],
          after
        });
        continue;
      }
      if (criterion.checked === null) {
        const bullet = /^(\s*)([-+*])[ \t]+/.exec(firstLine);
        if (bullet?.[0]) {
          addEdit(edits, {
            kind: 'add-task-marker',
            sectionKey: section.key,
            range: rangePrefix(criterion.range, bullet[0].length, body),
            start: criterion.range.start.offset,
            end: criterion.range.start.offset + bullet[0].length,
            before: bullet[0],
            after: `${bullet[1] ?? ''}- [ ] `
          });
        } else {
          issues.push({
            code: 'format.criterion.marker-skipped',
            severity: 'info',
            message: 'Skipped an ordinary criterion because its list marker cannot be losslessly converted to a task-list marker.',
            sectionKey: section.key,
            range: criterion.range,
            blocksApply: false
          });
        }
      }
    }
  }

  edits.sort((left, right) => left.start - right.start || left.end - right.end);
  assertNonOverlapping(edits);
  const formattedBody = applyEdits(body, edits);
  const formattedContent = sourceContent.slice(0, bodyStart) + formattedBody;
  const publicEdits = edits.map(edit => ({
    kind: edit.kind,
    sectionKey: edit.sectionKey,
    range: edit.range,
    before: edit.before,
    after: edit.after
  }));
  const filePath = rootPath ? path.relative(rootPath, entity.filePath) : entity.filePath;
  return {
    formatVersion: SEMANTIC_FORMAT_VERSION,
    entityId: entity.id,
    entityType: entity.type,
    filePath: entity.filePath,
    sourceFingerprint: fingerprint(sourceContent),
    changed: formattedContent !== sourceContent,
    blocked: issues.some(issue => issue.blocksApply),
    edits: publicEdits,
    issues,
    diff: renderEditDiff(filePath, body, publicEdits),
    formattedContent
  };
}

function resolveEntities(repository: Repository, requestedIds: readonly string[]): Entity[] {
  const ids = [...new Set(requestedIds.map(id => id.trim()).filter(Boolean))].sort();
  if (ids.length === 0) throw new Error('Format requires at least one entity ID');
  const byId = new Map(getAllEntities(repository).map(entity => [entity.id, entity]));
  return ids.map(id => {
    const entity = byId.get(id);
    if (!entity) throw new Error(`Entity not found: ${id}`);
    return entity;
  });
}

function batchPreview(previews: SemanticFormatEntityPreview[]): SemanticFormatBatchPreview {
  return {
    formatVersion: SEMANTIC_FORMAT_VERSION,
    entityIds: previews.map(preview => preview.entityId),
    changedEntityIds: previews.filter(preview => preview.changed).map(preview => preview.entityId),
    blockedEntityIds: previews.filter(preview => preview.blocked).map(preview => preview.entityId),
    expectedFingerprints: Object.fromEntries(previews
      .filter(preview => preview.changed)
      .map(preview => [preview.entityId, preview.sourceFingerprint])),
    previews
  };
}

function repositoryWithFormattedBodies(
  repository: Repository,
  previews: SemanticFormatEntityPreview[]
): Repository {
  const bodies = new Map(previews.map(preview => [
    preview.entityId,
    splitFrontmatterBody(preview.formattedContent).body
  ]));
  const replace = <T extends Entity>(entities: Map<string, T>): Map<string, T> => new Map(
    [...entities].map(([id, entity]) => [id, {
      ...entity,
      body: bodies.get(id) ?? entity.body
    } as T])
  );
  return {
    ...repository,
    tasks: replace(repository.tasks),
    epics: replace(repository.epics),
    milestones: replace(repository.milestones),
    decisions: replace(repository.decisions)
  };
}

function splitFrontmatterBody(content: string): { bodyStart: number; body: string } {
  const opening = /^---[ \t]*(?:\r?\n|$)/.exec(content);
  if (!opening) throw new Error('Cannot format a file without YAML frontmatter');
  const closingPattern = /^---[ \t]*(?:\r?\n|$)/gm;
  closingPattern.lastIndex = opening[0].length;
  const closing = closingPattern.exec(content);
  if (!closing) throw new Error('Cannot format a file with unclosed YAML frontmatter');
  const bodyStart = closing.index + closing[0].length;
  return { bodyStart, body: content.slice(bodyStart) };
}

function addEdit(edits: PendingEdit[], edit: PendingEdit): void {
  if (edit.before !== edit.after) edits.push(edit);
}

function nextLineEnding(source: string, offset: number): number {
  const newline = source.indexOf('\n', offset);
  return newline >= 0 ? newline : source.length;
}

function rangePrefix(range: SourceRange, length: number, source: string): SourceRange {
  const prefix = source.slice(range.start.offset, range.start.offset + length);
  const lines = prefix.split('\n');
  return {
    start: range.start,
    end: lines.length === 1
      ? { offset: range.start.offset + length, line: range.start.line, column: range.start.column + length }
      : {
        offset: range.start.offset + length,
        line: range.start.line + lines.length - 1,
        column: (lines[lines.length - 1]?.length ?? 0) + 1
      }
  };
}

function assertNonOverlapping(edits: PendingEdit[]): void {
  for (let index = 1; index < edits.length; index += 1) {
    const previous = edits[index - 1];
    const current = edits[index];
    if (previous && current && current.start < previous.end) {
      throw new Error('Formatter produced overlapping edits and refused to continue');
    }
  }
}

function applyEdits(source: string, edits: PendingEdit[]): string {
  let result = source;
  for (const edit of [...edits].sort((left, right) => right.start - left.start)) {
    if (source.slice(edit.start, edit.end) !== edit.before) {
      throw new Error('Formatter edit no longer matches its source range');
    }
    result = result.slice(0, edit.start) + edit.after + result.slice(edit.end);
  }
  return result;
}

function fingerprint(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

function sectionKeyAt(sections: OrderedSection[], index: number | null): string | null {
  return index === null ? null : sections[index]?.key ?? null;
}

function renderEditDiff(filePath: string, source: string, edits: SemanticFormatEdit[]): string {
  if (edits.length === 0) return '';
  const lines = [`--- a/${filePath}`, `+++ b/${filePath}`];
  for (const edit of edits) {
    const display = displayEdit(source, edit);
    lines.push(`@@ body:${edit.range.start.line}:${edit.range.start.column} ${edit.kind} @@`);
    lines.push(...prefixDiffLines('-', display.before));
    lines.push(...prefixDiffLines('+', display.after));
  }
  return lines.join('\n');
}

function displayEdit(source: string, edit: SemanticFormatEdit): { before: string; after: string } {
  if (edit.before.includes('\n')) return { before: edit.before, after: edit.after };
  const lineStart = source.lastIndexOf('\n', Math.max(0, edit.range.start.offset - 1)) + 1;
  const lineEnd = nextLineEnding(source, edit.range.end.offset);
  const before = source.slice(lineStart, lineEnd).replace(/\r$/, '');
  const relativeStart = edit.range.start.offset - lineStart;
  const relativeEnd = edit.range.end.offset - lineStart;
  const after = before.slice(0, relativeStart) + edit.after + before.slice(relativeEnd);
  return { before, after };
}

function prefixDiffLines(prefix: '-' | '+', value: string): string[] {
  return value.split('\n').map(line => `${prefix}${line}`);
}
