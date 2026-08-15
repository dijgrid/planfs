import {
  applySemanticFormats,
  getAllEntities,
  loadRepository,
  previewSemanticFormats,
  SemanticFormatBatchPreview
} from 'planfs-core';

export interface FormatOptions {
  ids?: string[];
  all?: boolean;
  check?: boolean;
  apply?: boolean;
  expectedFingerprint?: string[];
  format?: 'text' | 'json';
}

export async function formatCommand(
  rootPath: string,
  options: FormatOptions = {}
): Promise<number> {
  try {
    if (options.check && options.apply) {
      throw new Error('Choose either --check or --apply, not both');
    }
    const ids = await selectedEntityIds(rootPath, options);
    const mode = options.apply ? 'apply' : options.check ? 'check' : 'preview';
    const result = options.apply
      ? await applySemanticFormats(rootPath, ids, parseExpectedFingerprints(
        ids,
        options.expectedFingerprint ?? []
      ))
      : await previewSemanticFormats(rootPath, ids);

    if (options.format === 'json') {
      console.log(JSON.stringify({ mode, ...result }, null, 2));
    } else {
      printFormatResult(mode, result);
    }
    return mode === 'check' && (
      result.changedEntityIds.length > 0 || result.blockedEntityIds.length > 0
    ) ? 1 : 0;
  } catch (error) {
    console.error(`Format failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

async function selectedEntityIds(rootPath: string, options: FormatOptions): Promise<string[]> {
  const explicit = normalizeIds(options.ids ?? []);
  if (options.all && explicit.length > 0) {
    throw new Error('Use explicit entity IDs or --all, not both');
  }
  if (options.all) {
    const repository = await loadRepository(rootPath);
    return getAllEntities(repository).map(entity => entity.id).sort();
  }
  if (explicit.length === 0) {
    throw new Error('Provide one or more entity IDs, or use --all for the active repository');
  }
  return explicit;
}

function normalizeIds(values: string[]): string[] {
  return [...new Set(values.flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean))].sort();
}

function parseExpectedFingerprints(
  entityIds: string[],
  values: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const raw of values) {
    const separator = raw.indexOf('=');
    if (separator < 0) {
      if (entityIds.length !== 1) {
        throw new Error('Batch apply fingerprints must use ENTITY-ID=sha256:...');
      }
      const onlyId = entityIds[0];
      if (onlyId) result[onlyId] = raw;
      continue;
    }
    const id = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim();
    if (!entityIds.includes(id)) throw new Error(`Unexpected format fingerprint for ${id}`);
    if (!value) throw new Error(`Missing format fingerprint value for ${id}`);
    result[id] = value;
  }
  return result;
}

function printFormatResult(
  mode: 'preview' | 'check' | 'apply',
  result: SemanticFormatBatchPreview & { appliedEntityIds?: string[] }
): void {
  console.log(`\nSemantic format ${mode}`);
  console.log('='.repeat(60));
  for (const preview of result.previews) {
    const label = preview.blocked ? 'BLOCKED' : preview.changed ? 'CHANGES' : 'CLEAN';
    console.log(`\n${label} ${preview.entityId} — ${preview.filePath}`);
    for (const issue of preview.issues) {
      console.log(`  ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
    }
    if (preview.diff) console.log(preview.diff);
    if (preview.changed && mode !== 'apply') {
      console.log(`  Preview fingerprint: ${preview.entityId}=${preview.sourceFingerprint}`);
    }
  }
  if (mode === 'apply') {
    console.log(`\nApplied ${result.appliedEntityIds?.length ?? 0} file(s).`);
  } else if (result.changedEntityIds.length === 0) {
    console.log('\nNo semantic formatting changes needed.');
  } else if (mode === 'preview') {
    console.log('\nNo files were written. Re-run with --apply and every preview fingerprint to apply exactly these snapshots.');
  } else {
    console.log(`\n${result.changedEntityIds.length} file(s) require semantic formatting.`);
  }
}
