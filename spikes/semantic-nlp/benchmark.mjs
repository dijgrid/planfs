import { createRequire } from 'node:module';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const spikeRoot = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(await readFile(join(spikeRoot, 'fixtures.json'), 'utf8'));
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
const iterations = 250;

const actionWords = new Set([
  'accept', 'add', 'analyze', 'begin', 'build', 'cache', 'check', 'complete', 'continue',
  'create', 'delete', 'display', 'emit', 'ensure', 'expose', 'finish', 'handle', 'infer',
  'issue', 'keep', 'load', 'log', 'make', 'modify', 'navigate', 'parse', 'persist', 'preserve',
  'publish', 'read', 'refresh', 'reject', 'render', 'report', 'resolve', 'return', 'retry',
  'review', 'save', 'send', 'show', 'store', 'support', 'update', 'use', 'validate', 'write'
]);
const copulas = new Set(['am', 'are', 'be', 'been', 'being', 'is', 'was', 'were']);

const adapters = [
  await createBaselineAdapter(),
  await createWinkAdapter(),
  await createCompromiseAdapter(),
  await createRetextAdapter()
];

const results = [];
for (const adapter of adapters) {
  for (const fixture of fixtures) adapter.analyze(fixture.text);
  const started = performance.now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const fixture of fixtures) adapter.analyze(fixture.text);
  }
  const elapsedMs = performance.now() - started;
  const predictions = fixtures.map(fixture => ({
    id: fixture.id,
    predicted: [...adapter.analyze(fixture.text)].sort(),
    expected: [...fixture.labels].sort()
  }));
  results.push({
    id: adapter.id,
    identity: adapter.identity,
    coldStartMs: round(adapter.coldStartMs),
    throughputDocsPerSecond: round((fixtures.length * iterations) / (elapsedMs / 1000)),
    packageBytes: await packageBytes(adapter.packages),
    moduleCompatibility: adapter.moduleCompatibility,
    sample: adapter.sample,
    metrics: Object.fromEntries(signals.map(signal => [signal, metrics(signal, predictions)])),
    micro: microMetrics(predictions),
    predictions
  });
}

const output = {
  schemaVersion: 1,
  runtime: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    fixtureCount: fixtures.length,
    timedDocumentsPerCandidate: fixtures.length * iterations,
    note: 'Cold start is module import plus analyzer initialization in one fresh benchmark process; filesystem cache may benefit later candidates.'
  },
  thresholds: {
    promotePrecision: 0.9,
    promoteRecall: 0.8,
    maxColdStartMs: 100,
    minThroughputDocsPerSecond: 1000,
    maxInstalledBytes: 5000000
  },
  results
};

await writeFile(join(spikeRoot, 'results.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  runtime: output.runtime,
  candidates: results.map(result => ({
    id: result.id,
    coldStartMs: result.coldStartMs,
    throughputDocsPerSecond: result.throughputDocsPerSecond,
    packageBytes: result.packageBytes,
    micro: result.micro
  }))
}, null, 2));

async function createBaselineAdapter() {
  const started = performance.now();
  const adapter = {
    id: 'planfs-token-rules',
    identity: { package: 'none', version: 'prototype-1' },
    packages: [],
    moduleCompatibility: { commonjs: true, esm: true, browser: true },
    analyze(text) {
      return combineRuleSignals(text, baselineActions(text));
    }
  };
  return {
    ...adapter,
    coldStartMs: performance.now() - started,
    sample: sampleOutput(adapter.analyze, fixtures[3].text)
  };
}

async function createWinkAdapter() {
  const started = performance.now();
  const [{ default: winkNLP }, { default: model }] = await Promise.all([
    import('wink-nlp'),
    import('wink-eng-lite-web-model')
  ]);
  const wink = winkNLP(model);
  const its = wink.its;
  const adapter = {
    id: 'wink-nlp',
    identity: { package: 'wink-nlp + wink-eng-lite-web-model', version: '2.4.0 + 1.8.1' },
    packages: ['wink-nlp', 'wink-eng-lite-web-model'],
    moduleCompatibility: compatibility(['wink-nlp', 'wink-eng-lite-web-model'], true),
    analyze(text) {
      const doc = wink.readDoc(text);
      const tokens = doc.tokens().out();
      const pos = doc.tokens().out(its.pos);
      const verbIndexes = pos
        .map((tag, index) => tag === 'VERB' && !copulas.has(String(tokens[index]).toLowerCase()) ? index : -1)
        .filter(index => index >= 0);
      return combineRuleSignals(text, {
        action: verbIndexes.length > 0,
        compound: hasCoordinatedVerbs(tokens, verbIndexes)
      });
    }
  };
  const sampleDoc = wink.readDoc(fixtures[3].text);
  return {
    ...adapter,
    coldStartMs: performance.now() - started,
    sample: {
      tokens: sampleDoc.tokens().out(),
      lemmas: sampleDoc.tokens().out(its.lemma),
      partOfSpeech: sampleDoc.tokens().out(its.pos),
      sentences: sampleDoc.sentences().out(),
      signals: [...adapter.analyze(fixtures[3].text)].sort()
    }
  };
}

async function createCompromiseAdapter() {
  const started = performance.now();
  const { default: nlp } = await import('compromise');
  const adapter = {
    id: 'compromise',
    identity: { package: 'compromise', version: '14.16.0' },
    packages: ['compromise'],
    moduleCompatibility: compatibility(['compromise'], true),
    analyze(text) {
      const doc = nlp(text);
      const verbs = doc.verbs().out('array')
        .map(value => String(value).toLowerCase())
        .filter(value => !copulas.has(value));
      const words = doc.terms().out('array');
      const indexes = words
        .map((word, index) => verbs.includes(String(word).toLowerCase()) ? index : -1)
        .filter(index => index >= 0);
      return combineRuleSignals(text, {
        action: verbs.length > 0,
        compound: hasCoordinatedVerbs(words, indexes)
      });
    }
  };
  const sampleDoc = nlp(fixtures[3].text);
  return {
    ...adapter,
    coldStartMs: performance.now() - started,
    sample: {
      terms: sampleDoc.terms().json(),
      verbs: sampleDoc.verbs().out('array'),
      sentences: sampleDoc.sentences().out('array'),
      signals: [...adapter.analyze(fixtures[3].text)].sort()
    }
  };
}

async function createRetextAdapter() {
  const started = performance.now();
  const [retextModule, englishModule, posModule] = await Promise.all([
    import('retext'),
    import('retext-english'),
    import('retext-pos')
  ]);
  const processor = retextModule.retext()
    .use(englishModule.default)
    .use(posModule.default);
  const analyzeParts = text => {
    const tree = processor.runSync(processor.parse(text));
    const words = [];
    visit(tree, node => {
      if (node.type === 'WordNode') {
        words.push({
          text: node.children?.map(child => child.value ?? '').join('') ?? '',
          partOfSpeech: node.data?.partOfSpeech ?? null
        });
      }
    });
    const verbIndexes = words
      .map((word, index) => String(word.partOfSpeech).startsWith('VB') && !copulas.has(word.text.toLowerCase()) ? index : -1)
      .filter(index => index >= 0);
    return { tree, words, verbIndexes };
  };
  const adapter = {
    id: 'retext-pos',
    identity: { package: 'retext + retext-english + retext-pos', version: '9.0.0 + 5.0.0 + 5.0.0' },
    packages: ['retext', 'retext-english', 'retext-pos', 'unified'],
    moduleCompatibility: compatibility(['retext', 'retext-english', 'retext-pos'], true),
    analyze(text) {
      const { words, verbIndexes } = analyzeParts(text);
      return combineRuleSignals(text, {
        action: verbIndexes.length > 0,
        compound: hasCoordinatedVerbs(words.map(word => word.text), verbIndexes)
      });
    }
  };
  const sample = analyzeParts(fixtures[3].text);
  return {
    ...adapter,
    coldStartMs: performance.now() - started,
    sample: {
      words: sample.words,
      sentences: countNodes(sample.tree, 'SentenceNode'),
      signals: [...adapter.analyze(fixtures[3].text)].sort()
    }
  };
}

function combineRuleSignals(text, actionSignals) {
  const lower = text.toLowerCase();
  const found = new Set();
  if (/\b(?:must|should|may)\b/.test(lower)) found.add('modality');
  if (/\b(?:not|never|no|without)\b/.test(lower)) found.add('negation');
  if (/\b(?:if|when|unless|until|after|before|once)\b/.test(lower)) found.add('condition');
  if (/\b(?:appropriate|easy|fast|quickly|reliable|simple|soon|stable|user-friendly)\b/.test(lower)) found.add('vague');
  if (/\b(?:\d+(?:\.\d+)?\s*(?:ms|milliseconds?|seconds?|minutes?|hours?|days?)|per second|tomorrow|\d{4}-\d{2}-\d{2})\b/.test(lower)) {
    found.add('date-duration');
  }
  const hasEntity = /\b(?:TASK-[0-9]{3,}|EPIC-[A-Za-z0-9-]+|MILESTONE-[A-Za-z0-9-]+|DECISION-[A-Za-z0-9-]+)\b/.test(text);
  if (hasEntity && /\b(?:after|before|block(?:s|ed by)?|depend(?:s|ed)? on|belongs under|parent)\b/i.test(text)) {
    found.add('relationship');
  }
  if (actionSignals.action) found.add('action');
  if (actionSignals.compound) found.add('compound');
  return found;
}

function baselineActions(text) {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const indexes = words
    .map((word, index) => actionWords.has(word) ? index : -1)
    .filter(index => index >= 0);
  return { action: indexes.length > 0, compound: hasCoordinatedVerbs(words, indexes) };
}

function hasCoordinatedVerbs(words, verbIndexes) {
  if (verbIndexes.length < 2) return false;
  for (let index = 1; index < verbIndexes.length; index += 1) {
    const between = words.slice((verbIndexes[index - 1] ?? 0) + 1, verbIndexes[index]);
    if (between.some(word => ['and', 'or'].includes(String(word).toLowerCase()))) return true;
  }
  return false;
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
    if (!expected && predicted) {
      falsePositive += 1;
      falsePositives.push(prediction.id);
    }
    if (expected && !predicted) {
      falseNegative += 1;
      falseNegatives.push(prediction.id);
    }
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

function microMetrics(predictions) {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  for (const prediction of predictions) {
    for (const signal of signals) {
      const expected = prediction.expected.includes(signal);
      const predicted = prediction.predicted.includes(signal);
      if (expected && predicted) truePositive += 1;
      if (!expected && predicted) falsePositive += 1;
      if (expected && !predicted) falseNegative += 1;
    }
  }
  const precision = truePositive / (truePositive + falsePositive);
  const recall = truePositive / (truePositive + falseNegative);
  return {
    precision: round(precision),
    recall: round(recall),
    f1: round((2 * precision * recall) / (precision + recall))
  };
}

function sampleOutput(analyze, text) {
  return {
    tokens: text.match(/[A-Za-z0-9-]+|[^\sA-Za-z0-9]/g) ?? [],
    sentences: [text],
    signals: [...analyze(text)].sort()
  };
}

function compatibility(packages, browser) {
  const require = createRequire(import.meta.url);
  let commonjs = true;
  for (const packageName of packages) {
    try {
      require(packageName);
    } catch {
      commonjs = false;
    }
  }
  return { commonjs, esm: true, browser };
}

async function packageBytes(packages) {
  let total = 0;
  for (const packageName of packages) {
    total += await directorySize(join(spikeRoot, 'node_modules', ...packageName.split('/')));
  }
  return total;
}

async function directorySize(path) {
  const value = await stat(path);
  if (value.isFile()) return value.size;
  const entries = await readdir(path);
  let total = 0;
  for (const entry of entries) total += await directorySize(join(path, entry));
  return total;
}

function visit(node, callback) {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}

function countNodes(node, type) {
  let count = 0;
  visit(node, candidate => {
    if (candidate.type === type) count += 1;
  });
  return count;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
