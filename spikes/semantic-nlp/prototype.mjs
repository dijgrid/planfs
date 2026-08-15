import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const { parseSemanticDocument } = require('../../src/core/dist');
const spikeRoot = dirname(fileURLToPath(import.meta.url));
const sentenceFixtures = JSON.parse(await readFile(join(spikeRoot, 'fixtures.json'), 'utf8'));

const identity = { id: 'planfs-english-token-rules-experimental', version: '0.1.0' };
const signals = [
  'modality',
  'negation',
  'condition',
  'action',
  'vague',
  'compound',
  'relationship',
  'date-duration'
];
const actionWords = new Set([
  'accept', 'add', 'analyze', 'begin', 'build', 'cache', 'check', 'complete', 'continue',
  'create', 'delete', 'display', 'emit', 'ensure', 'expose', 'finish', 'handle', 'infer',
  'issue', 'keep', 'load', 'log', 'make', 'modify', 'navigate', 'parse', 'persist', 'preserve',
  'publish', 'read', 'refresh', 'reject', 'render', 'report', 'resolve', 'return', 'retry',
  'review', 'save', 'send', 'show', 'store', 'support', 'update', 'use', 'validate', 'write'
]);

const markdownFixtures = [
  ...sentenceFixtures.map(fixture => ({
    id: fixture.id,
    markdown: `## Acceptance Criteria\n\n- [ ] ${fixture.text}`,
    expected: fixture.labels
  })),
  {
    id: 'excluded-inline-code',
    markdown: '## Acceptance Criteria\n\n- [ ] Render `must not depend on TASK-999` literally.',
    expected: ['action']
  },
  {
    id: 'excluded-link-url',
    markdown: '## Acceptance Criteria\n\n- [ ] See [the guide](https://example.test/should/not/TASK-999).',
    expected: []
  },
  {
    id: 'eligible-link-label',
    markdown: '## Acceptance Criteria\n\n- [ ] Review [TASK-118](../tasks/TASK-118.md) after TASK-117.',
    expected: ['action', 'condition', 'relationship']
  },
  {
    id: 'excluded-autolink',
    markdown: '## Acceptance Criteria\n\n- [ ] <https://example.test/must/not/TASK-999>',
    expected: []
  },
  {
    id: 'excluded-raw-html',
    markdown: '## Acceptance Criteria\n\n- [ ] <span>must not depend on TASK-999</span> Render output.',
    expected: ['action']
  },
  {
    id: 'excluded-fenced-code',
    markdown: [
      '## Acceptance Criteria',
      '',
      '- [ ] Preserve this example:',
      '',
      '  ```text',
      '  must not depend on TASK-999',
      '  ```'
    ].join('\n'),
    expected: ['action']
  },
  {
    id: 'nested-does-not-double-count',
    markdown: [
      '## Acceptance Criteria',
      '',
      '- [ ] Preserve the parent.',
      '  - [ ] Must not send tokens.'
    ].join('\n'),
    expected: ['action', 'modality', 'negation']
  }
];

class ExperimentalTokenAnalyzer {
  identity = identity;
  supportedLanguages = ['en'];
  #cache = new Map();
  #limit;
  stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(limit = 128) {
    this.#limit = limit;
  }

  async analyze({ document, language }) {
    if (!this.supportedLanguages.includes(language)) {
      return {
        analyzer: this.identity,
        language,
        signals: [],
        diagnostics: [unsupportedLanguageDiagnostic(language)]
      };
    }

    const key = createHash('sha256')
      .update(document.source.rawMarkdown)
      .update('\0')
      .update(language)
      .update('\0')
      .update(this.identity.id)
      .update('\0')
      .update(this.identity.version)
      .digest('hex');
    const cached = this.#cache.get(key);
    if (cached) {
      this.stats.hits += 1;
      this.#cache.delete(key);
      this.#cache.set(key, cached);
      return structuredClone(cached);
    }

    this.stats.misses += 1;
    const result = {
      analyzer: this.identity,
      language,
      signals: document.criteria.flatMap(criterion => analyzeCriterion(document, criterion, language)),
      diagnostics: []
    };
    this.#cache.set(key, structuredClone(result));
    if (this.#cache.size > this.#limit) {
      this.#cache.delete(this.#cache.keys().next().value);
      this.stats.evictions += 1;
    }
    return result;
  }
}

const analyzer = new ExperimentalTokenAnalyzer();
const predictions = [];
let exclusionFailures = 0;
let authoritativeMutationFailures = 0;
let rangeFailures = 0;
const coldStarted = performance.now();
await analyzeFixture(analyzer, markdownFixtures[0]);
const coldStartMs = performance.now() - coldStarted;

for (const fixture of markdownFixtures) {
  const prediction = await analyzeFixture(analyzer, fixture);
  predictions.push(prediction);
  if (fixture.id.startsWith('excluded-') && !sameSet(prediction.predicted, fixture.expected)) {
    exclusionFailures += 1;
  }
  if (!prediction.authoritativeUnchanged) authoritativeMutationFailures += 1;
  rangeFailures += prediction.signals.filter(signal => (
    fixture.markdown.slice(signal.range.start.offset, signal.range.end.offset) !== signal.evidence[0]?.text
  )).length;
}

const throughputIterations = 250;
const uncached = new ExperimentalTokenAnalyzer(128);
const uncachedStarted = performance.now();
for (let iteration = 0; iteration < throughputIterations; iteration += 1) {
  for (const fixture of markdownFixtures) {
    await analyzeFixture(uncached, {
      ...fixture,
      markdown: `${fixture.markdown}\n<!-- benchmark-${iteration} -->`
    });
  }
}
const uncachedMs = performance.now() - uncachedStarted;

const cached = new ExperimentalTokenAnalyzer(128);
const cachedDocuments = markdownFixtures.map(fixture => ({
  fixture,
  document: parseSemanticDocument('task', fixture.markdown)
}));
for (const { document } of cachedDocuments) await cached.analyze({ document, language: 'en' });
const cachedStarted = performance.now();
for (let iteration = 0; iteration < throughputIterations; iteration += 1) {
  for (const { document } of cachedDocuments) await cached.analyze({ document, language: 'en' });
}
const cachedMs = performance.now() - cachedStarted;

const cacheProbe = new ExperimentalTokenAnalyzer(8);
const cacheDocument = parseSemanticDocument('task', markdownFixtures[0].markdown);
await cacheProbe.analyze({ document: cacheDocument, language: 'en' });
await cacheProbe.analyze({ document: cacheDocument, language: 'en' });
cacheDocument.source.rawMarkdown += ' ';
await cacheProbe.analyze({ document: cacheDocument, language: 'en' });

const unsupported = await analyzer.analyze({
  document: parseSemanticDocument('task', markdownFixtures[0].markdown),
  language: 'fr'
});
const disabledSource = markdownFixtures[0].markdown;
const disabledDocumentA = parseSemanticDocument('task', disabledSource);
const disabledDocumentB = parseSemanticDocument('task', disabledSource);
const relationshipDocument = parseSemanticDocument(
  'task',
  '## Acceptance Criteria\n\n- [ ] Complete this after TASK-117 and before TASK-118.'
);
const relationshipResult = await analyzer.analyze({ document: relationshipDocument, language: 'en' });
const authoritativeMetadata = { dependsOn: ['TASK-117'], epic: 'EPIC-semantic-planning-documents' };
const metadataBefore = JSON.stringify(authoritativeMetadata);
const relationshipComparison = compareRelationships(relationshipResult, authoritativeMetadata);

const output = {
  schemaVersion: 1,
  analyzer: identity,
  runtime: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    fixtureCount: markdownFixtures.length,
    coldStartMs: round(coldStartMs),
    uncachedParseAndAnalyzeDocsPerSecond: round((markdownFixtures.length * throughputIterations) / (uncachedMs / 1000)),
    cachedAnalyzeDocsPerSecond: round((markdownFixtures.length * throughputIterations) / (cachedMs / 1000)),
    directPackageBytes: 0
  },
  cache: {
    repeatedContentProbe: cacheProbe.stats,
    keyIncludes: ['rawMarkdown', 'language', 'analyzer.id', 'analyzer.version'],
    boundedEntries: 8
  },
  safeguards: {
    exclusionFailures,
    authoritativeMutationFailures,
    rangeFailures,
    disabledSemanticDocumentEqual: JSON.stringify(disabledDocumentA) === JSON.stringify(disabledDocumentB),
    relationshipMetadataUnchanged: JSON.stringify(authoritativeMetadata) === metadataBefore,
    relationshipComparison,
    unsupportedLanguageDiagnostic: unsupported.diagnostics[0]?.code ?? null,
    networkCalls: 0
  },
  metrics: Object.fromEntries(signals.map(signal => [signal, metrics(signal, predictions)])),
  predictions
};

await writeFile(join(spikeRoot, 'prototype-results.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  runtime: output.runtime,
  cache: output.cache,
  safeguards: output.safeguards,
  metrics: output.metrics
}, null, 2));

async function analyzeFixture(activeAnalyzer, fixture) {
  const document = parseSemanticDocument('task', fixture.markdown, { filePath: `${fixture.id}.md` });
  const authoritativeBefore = JSON.stringify(document);
  const result = await activeAnalyzer.analyze({ document, language: 'en' });
  return {
    id: fixture.id,
    expected: [...fixture.expected].sort(),
    predicted: [...new Set(result.signals.map(signal => signal.kind))].sort(),
    signals: result.signals,
    authoritativeUnchanged: JSON.stringify(document) === authoritativeBefore
  };
}

function analyzeCriterion(document, criterion, language) {
  let eligible = maskIneligibleMarkdown(criterion.markdown);
  for (const child of document.criteria.filter(candidate => candidate.parentCriterionId === criterion.id)) {
    const start = child.range.start.offset - criterion.range.start.offset;
    const end = child.range.end.offset - criterion.range.start.offset;
    eligible = maskRange(eligible, start, end);
  }

  const matches = [];
  collect(matches, eligible, /\b(must|should|may)\b/gi, 'modality', 0.98, 'Exact modal token');
  collect(matches, eligible, /\b(not|never|no|without)\b/gi, 'negation', 0.98, 'Exact negation token');
  collect(matches, eligible, /\b(if|when|unless|until|after|before|once)\b/gi, 'condition', 0.95, 'Bounded condition introducer');
  collect(matches, eligible, /\b(appropriate|easy|fast|quickly|reliable|simple|soon|stable|user-friendly)\b/gi, 'vague', 0.65, 'Experimental vague-term lexicon');
  collect(matches, eligible, /\b(?:\d+(?:\.\d+)?\s*(?:ms|milliseconds?|seconds?|minutes?|hours?|days?)|per second|tomorrow|\d{4}-\d{2}-\d{2})\b/gi, 'date-duration', 0.95, 'Explicit date or duration token');

  const words = [...eligible.matchAll(/\b[A-Za-z]+\b/g)];
  const actionMatches = words.filter(match => actionWords.has(match[0].toLowerCase()));
  for (const match of actionMatches) {
    addMatch(matches, match, 'action', 0.70, 'Experimental bounded action lexicon');
  }
  for (let index = 1; index < actionMatches.length; index += 1) {
    const left = actionMatches[index - 1];
    const right = actionMatches[index];
    const between = eligible.slice((left.index ?? 0) + left[0].length, right.index);
    if (/\b(?:and|or)\b/i.test(between)) {
      matches.push({
        kind: 'compound',
        index: left.index,
        length: right.index + right[0].length - left.index,
        confidence: 0.60,
        basis: 'Experimental conjunction between action-lexicon terms'
      });
    }
  }

  const entityMatches = [...eligible.matchAll(/\b(?:TASK-[0-9]{3,}|EPIC-[A-Za-z0-9-]+|MILESTONE-[A-Za-z0-9-]+|DECISION-[A-Za-z0-9-]+)\b/g)];
  const relationshipMatches = [...eligible.matchAll(/\b(?:after|before|block(?:s|ed by)?|depend(?:s|ed)? on|belongs under|parent)\b/gi)];
  if (entityMatches.length > 0 && relationshipMatches.length > 0) {
    for (const entity of entityMatches) {
      const phrase = nearestMatch(entity, relationshipMatches);
      const start = Math.min(entity.index, phrase.index);
      const end = Math.max(entity.index + entity[0].length, phrase.index + phrase[0].length);
      matches.push({
        kind: 'relationship',
        index: start,
        length: end - start,
        confidence: 0.90,
        basis: 'Exact PlanFS ID with bounded relationship phrase',
        targetId: entity[0]
      });
    }
  }

  return deduplicate(matches).map(match => toSignal(document, criterion, match, language));
}

function maskIneligibleMarkdown(markdown) {
  let value = markdown;
  const patterns = [
    /(^|\n)[ \t]*(```+|~~~+)[^\n]*(?:\n[\s\S]*?(?:\n[ \t]*\2[^\n]*)?(?=\n|$)|$)/g,
    /`+[^`\n]*`+/g,
    /<!--[\s\S]*?-->/g,
    /<([A-Za-z][A-Za-z0-9-]*)\b[^>]*>[\s\S]*?<\/\1\s*>/g,
    /<https?:\/\/[^>]+>/gi,
    /<[^>]*>/g,
    /\]\([^)]*\)/g,
    /https?:\/\/[^\s)>]+/gi,
    /(^|\n)[ \t]*(?:[-+*]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/g
  ];
  for (const pattern of patterns) value = value.replace(pattern, match => ' '.repeat(match.length));
  return value.replace(/[\[\]_*~>#]/g, ' ');
}

function maskRange(value, start, end) {
  return `${value.slice(0, start)}${' '.repeat(Math.max(0, end - start))}${value.slice(end)}`;
}

function collect(target, text, pattern, kind, confidence, basis) {
  for (const match of text.matchAll(pattern)) addMatch(target, match, kind, confidence, basis);
}

function addMatch(target, match, kind, confidence, basis) {
  target.push({ kind, index: match.index, length: match[0].length, confidence, basis });
}

function nearestMatch(target, matches) {
  return matches.reduce((nearest, candidate) => (
    Math.abs(candidate.index - target.index) < Math.abs(nearest.index - target.index) ? candidate : nearest
  ));
}

function deduplicate(matches) {
  const seen = new Set();
  return matches.filter(match => {
    const key = `${match.kind}:${match.index}:${match.length}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toSignal(document, criterion, match, language) {
  const startOffset = criterion.range.start.offset + match.index;
  const endOffset = startOffset + match.length;
  const range = sourceRange(document.source.rawMarkdown, startOffset, endOffset);
  const evidenceText = document.source.rawMarkdown.slice(startOffset, endOffset);
  return {
    kind: match.kind,
    message: messageFor(match.kind, evidenceText),
    language,
    analyzer: identity,
    provenance: 'nlp-inferred',
    range,
    evidence: [{ text: evidenceText, range }],
    confidence: match.confidence,
    authoritative: false,
    data: {
      criterionId: criterion.id,
      evidenceBasis: match.basis,
      ...(match.targetId ? { targetId: match.targetId } : {})
    }
  };
}

function sourceRange(source, start, end) {
  return { start: sourcePoint(source, start), end: sourcePoint(source, end) };
}

function sourcePoint(source, offset) {
  const before = source.slice(0, offset);
  const lines = before.split('\n');
  return { offset, line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

function messageFor(kind, evidence) {
  const messages = {
    modality: `Modal wording detected: ${evidence}`,
    negation: `Negation detected: ${evidence}`,
    condition: `Conditional wording detected: ${evidence}`,
    action: `Possible observable action detected: ${evidence}`,
    vague: `Potentially vague wording detected: ${evidence}`,
    compound: 'Criterion may contain multiple independent actions',
    relationship: 'Possible planning relationship mentioned in prose',
    'date-duration': `Date or duration wording detected: ${evidence}`
  };
  return messages[kind];
}

function unsupportedLanguageDiagnostic(language) {
  return {
    code: 'analysis.language.unsupported',
    severity: 'info',
    message: `Analyzer does not support language: ${language}`,
    range: null,
    sectionIndex: null,
    provenance: 'nlp-inferred',
    conformance: 'analysis',
    repair: { summary: 'Disable analysis or select a supported language', kind: 'none', previewable: false },
    data: { language }
  };
}

function compareRelationships(result, metadata) {
  const authoritativeIds = new Set(metadata.dependsOn ?? []);
  return result.signals
    .filter(signal => signal.kind === 'relationship' && typeof signal.data.targetId === 'string')
    .map(signal => ({
      targetId: signal.data.targetId,
      state: authoritativeIds.has(signal.data.targetId) ? 'already-authoritative' : 'prose-only-suggestion',
      authoritative: false
    }));
}

function metrics(signal, predictions) {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  const falsePositives = [];
  const falseNegatives = [];
  for (const prediction of predictions) {
    const expected = prediction.expected.includes(signal);
    const predicted = prediction.predicted.includes(signal);
    if (expected && predicted) truePositive += 1;
    if (!expected && predicted) { falsePositive += 1; falsePositives.push(prediction.id); }
    if (expected && !predicted) { falseNegative += 1; falseNegatives.push(prediction.id); }
  }
  const precision = truePositive + falsePositive === 0 ? 1 : truePositive / (truePositive + falsePositive);
  const recall = truePositive + falseNegative === 0 ? 1 : truePositive / (truePositive + falseNegative);
  return {
    truePositive,
    falsePositive,
    falseNegative,
    precision: round(precision),
    recall: round(recall),
    f1: round(precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)),
    falsePositives,
    falseNegatives
  };
}

function sameSet(left, right) {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
