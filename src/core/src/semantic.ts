import { GFM, parser } from '@lezer/markdown';
import { EntityType } from './types';
import { getSemanticContentProfile } from './semantic-profiles';
import {
  ContentShape,
  EntityMention,
  KnownSectionView,
  OrderedSection,
  ParseSemanticDocumentOptions,
  SemanticContentProfile,
  SemanticCriterion,
  SemanticDecisionStatement,
  SemanticDiagnostic,
  SemanticDocument,
  SemanticFinding,
  SemanticProvenance,
  SemanticReference,
  SemanticSubsection,
  SourcePoint,
  SourceRange
} from './semantic-types';

const semanticMarkdownParser = parser.configure(GFM);
type MarkdownSyntaxNode = ReturnType<typeof semanticMarkdownParser.parse>['topNode'];

const HEADING_PATTERN = /^(?:ATX|Setext)Heading([1-6])$/;
const ENTITY_ID_PATTERN = /TASK-[0-9]{3,}|EPIC-[A-Za-z0-9][A-Za-z0-9-]*|MILESTONE-[A-Za-z0-9][A-Za-z0-9-]*|DECISION-[A-Za-z0-9][A-Za-z0-9-]*/g;
const OPAQUE_NODE_NAMES = new Set(['FencedCode', 'CodeBlock', 'HTMLBlock', 'InlineCode']);
const VOID_HTML_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr'
]);

interface SectionWork {
  section: OrderedSection;
  headingNode: MarkdownSyntaxNode;
  contentNodes: MarkdownSyntaxNode[];
}

interface LinkOccurrence {
  range: { from: number; to: number };
  labelRange: { from: number; to: number } | null;
  targetRange: { from: number; to: number } | null;
  target: string;
}

class SourceLocator {
  private readonly lineStarts: number[] = [0];

  constructor(private readonly source: string) {
    for (let index = 0; index < source.length; index += 1) {
      if (source.charCodeAt(index) === 10) {
        this.lineStarts.push(index + 1);
      }
    }
  }

  point(offset: number): SourcePoint {
    const bounded = Math.max(0, Math.min(offset, this.source.length));
    let low = 0;
    let high = this.lineStarts.length;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if ((this.lineStarts[middle] ?? 0) <= bounded) {
        low = middle;
      } else {
        high = middle;
      }
    }
    const lineStart = this.lineStarts[low] ?? 0;
    return { offset: bounded, line: low + 1, column: bounded - lineStart + 1 };
  }

  range(from: number, to: number): SourceRange {
    return { start: this.point(from), end: this.point(to) };
  }
}

export function parseSemanticDocument(
  entityType: EntityType,
  rawMarkdown: string,
  options: ParseSemanticDocumentOptions = {}
): SemanticDocument {
  const profile = getSemanticContentProfile(entityType);
  const locator = new SourceLocator(rawMarkdown);

  try {
    const tree = semanticMarkdownParser.parse(rawMarkdown);
    const root = tree.topNode;
    const rootChildren = children(root);
    const opaqueRanges = collectOpaqueRanges(root, rawMarkdown);
    const sectionWork = buildSections(rootChildren, rawMarkdown, locator, profile);
    const sections = sectionWork.map(work => work.section);
    const knownSections = groupKnownSections(sections);
    const diagnostics = collectStructuralDiagnostics(
      rootChildren,
      root,
      rawMarkdown,
      locator,
      sections,
      knownSections
    );
    const criteria = extractCriteria(sectionWork, rawMarkdown, locator);
    const findings = extractEntries<SemanticFinding>(
      sectionWork.filter(work => work.section.key === 'findings'),
      rawMarkdown,
      locator
    );
    const decisions = extractEntries<SemanticDecisionStatement>(
      sectionWork.filter(work => work.section.key === 'decisions' || (
        entityType === 'decision' && work.section.key === 'decision'
      )),
      rawMarkdown,
      locator
    );
    const { references, occurrences, diagnostics: referenceDiagnostics } = extractReferences(
      root,
      rawMarkdown,
      locator,
      sections,
      opaqueRanges
    );
    diagnostics.push(...referenceDiagnostics);
    const mentions = extractMentions(
      rawMarkdown,
      locator,
      sections,
      opaqueRanges,
      occurrences
    );
    references.push(...mentions
      .filter(mention => mention.form === 'prose')
      .map(mention => ({
        kind: 'bare-entity-id' as const,
        label: null,
        target: mention.id,
        range: mention.range,
        sectionIndex: mention.sectionIndex,
        provenance: 'rule-inferred' as const
      })));
    references.sort((left, right) => left.range.start.offset - right.range.start.offset);

    const firstSectionStart = sectionWork[0]?.headingNode.from ?? rawMarkdown.length;
    const preambleMarkdown = rawMarkdown.slice(0, firstSectionStart);
    return {
      contractVersion: '1.0.0',
      profile: { entityType, version: profile.version },
      source: { filePath: options.filePath ?? '', rawMarkdown },
      preamble: {
        markdown: preambleMarkdown,
        text: markdownToText(preambleMarkdown),
        range: locator.range(0, firstSectionStart),
        empty: preambleMarkdown.trim().length === 0
      },
      sections,
      knownSections,
      criteria,
      findings,
      decisions,
      references,
      mentions,
      diagnostics: diagnostics.sort(compareDiagnostics),
      conformance: {
        baseline: diagnostics.some(diagnostic => (
          diagnostic.conformance === 'baseline' && diagnostic.severity === 'error'
        )) ? 'nonconformant' : 'conformant',
        automationReady: 'not-evaluated',
        lifecycle: 'not-evaluated'
      },
      analyzerResults: []
    };
  } catch (error) {
    return fallbackDocument(entityType, rawMarkdown, options, locator, error);
  }
}

function buildSections(
  rootChildren: MarkdownSyntaxNode[],
  source: string,
  locator: SourceLocator,
  profile: SemanticContentProfile
): SectionWork[] {
  const boundaries = rootChildren
    .map((node, rootIndex) => ({ node, rootIndex, level: headingLevel(node) }))
    .filter((item): item is { node: MarkdownSyntaxNode; rootIndex: number; level: 2 } => item.level === 2);

  return boundaries.map((boundary, index) => {
    const next = boundaries[index + 1];
    const sectionEnd = next?.node.from ?? source.length;
    const headingEnd = semanticNodeEnd(boundary.node, source);
    const contentStart = consumeLineEnding(source, headingEnd);
    const heading = headingText(boundary.node, source);
    const match = matchSection(profile, heading);
    const contentNodes = rootChildren.slice(boundary.rootIndex + 1, next?.rootIndex);
    const contentMarkdown = source.slice(contentStart, sectionEnd);
    const section: OrderedSection = {
      index,
      heading,
      normalizedHeading: normalizeHeading(heading),
      headingLevel: 2,
      key: match?.key ?? null,
      provenance: match?.provenance ?? 'rule-inferred',
      headingRange: locator.range(boundary.node.from, headingEnd),
      contentRange: locator.range(contentStart, sectionEnd),
      range: locator.range(boundary.node.from, sectionEnd),
      markdown: source.slice(boundary.node.from, sectionEnd),
      contentMarkdown,
      text: markdownToText(contentMarkdown),
      contentShape: determineContentShape(contentNodes, contentMarkdown),
      empty: contentMarkdown.trim().length === 0,
      subsections: buildSubsections(contentNodes, sectionEnd, source, locator)
    };
    return { section, headingNode: boundary.node, contentNodes };
  });
}

function buildSubsections(
  contentNodes: MarkdownSyntaxNode[],
  sectionEnd: number,
  source: string,
  locator: SourceLocator
): SemanticSubsection[] {
  const headings = contentNodes
    .map(node => ({ node, level: headingLevel(node) }))
    .filter((item): item is { node: MarkdownSyntaxNode; level: 3 | 4 | 5 | 6 } => (
      item.level !== null && item.level >= 3
    ));

  function build(parentLevel: number, start: number, end: number): SemanticSubsection[] {
    const result: SemanticSubsection[] = [];
    let index = start;
    while (index < end) {
      const current = headings[index];
      if (!current) break;
      if (current.level <= parentLevel) {
        index += 1;
        continue;
      }
      let boundary = index + 1;
      while (boundary < end && (headings[boundary]?.level ?? 0) > current.level) {
        boundary += 1;
      }
      const rangeEnd = headings[boundary]?.node.from ?? sectionEnd;
      result.push({
        heading: headingText(current.node, source),
        headingLevel: current.level,
        headingRange: locator.range(current.node.from, semanticNodeEnd(current.node, source)),
        range: locator.range(current.node.from, rangeEnd),
        markdown: source.slice(current.node.from, rangeEnd),
        text: markdownToText(source.slice(
          consumeLineEnding(source, semanticNodeEnd(current.node, source)),
          rangeEnd
        )),
        children: build(current.level, index + 1, boundary)
      });
      index = boundary;
    }
    return result;
  }

  return build(2, 0, headings.length);
}

function matchSection(
  profile: SemanticContentProfile,
  heading: string
): { key: string; provenance: 'canonical' | 'alias' } | undefined {
  const normalized = normalizeHeading(heading);
  for (const definition of profile.sections) {
    if (normalizeHeading(definition.canonicalHeading) === normalized) {
      return { key: definition.key, provenance: 'canonical' };
    }
    if (definition.aliases.some(alias => normalizeHeading(alias) === normalized)) {
      return { key: definition.key, provenance: 'alias' };
    }
  }
  return undefined;
}

function groupKnownSections(sections: OrderedSection[]): KnownSectionView {
  const known: KnownSectionView = {};
  for (const section of sections) {
    if (section.key) {
      (known[section.key] ??= []).push(section);
    }
  }
  return known;
}

function collectStructuralDiagnostics(
  rootChildren: MarkdownSyntaxNode[],
  root: MarkdownSyntaxNode,
  source: string,
  locator: SourceLocator,
  sections: OrderedSection[],
  knownSections: KnownSectionView
): SemanticDiagnostic[] {
  const diagnostics: SemanticDiagnostic[] = [];
  for (const section of sections) {
    if (section.provenance === 'alias') {
      diagnostics.push(diagnostic(
        'content.section.alias',
        'info',
        `Section heading '${section.heading}' is a supported alias for '${section.key}'.`,
        section.headingRange,
        section.index,
        'alias',
        'automation-ready',
        'Use the canonical heading when normalizing this document.',
        'format',
        true
      ));
    }
    if (section.key && section.empty) {
      diagnostics.push(diagnostic(
        'content.section.empty',
        'warning',
        `Recognized section '${section.heading}' is empty.`,
        section.contentRange,
        section.index,
        section.provenance,
        'automation-ready',
        'Add content or remove the empty section.',
        'edit-markdown',
        false
      ));
    }
  }

  for (const [key, matches] of Object.entries(knownSections)) {
    if (matches.length < 2) continue;
    const range = matches[1]?.headingRange ?? null;
    diagnostics.push(diagnostic(
      'content.section.duplicate',
      'warning',
      `Section key '${key}' appears ${matches.length} times.`,
      range,
      matches[1]?.index ?? null,
      matches[1]?.provenance ?? 'rule-inferred',
      'automation-ready',
      'Review and explicitly merge or retain the duplicate sections.',
      'edit-markdown',
      false,
      { key, count: matches.length }
    ));
    const distinct = new Set(matches.map(match => normalizeComparisonText(match.text)));
    if (distinct.size > 1) {
      diagnostics.push(diagnostic(
        'content.section.ambiguous',
        'warning',
        `Duplicate '${key}' sections contain different content.`,
        range,
        matches[1]?.index ?? null,
        matches[1]?.provenance ?? 'rule-inferred',
        'automation-ready',
        'Choose or merge the intended content explicitly.',
        'edit-markdown',
        false,
        { key }
      ));
    }
  }

  for (const node of rootChildren) {
    if (headingLevel(node) === 1) {
      diagnostics.push(diagnostic(
        'content.unexpected-heading-level',
        'warning',
        'Level-one headings do not create semantic sections because the entity title is frontmatter-owned.',
        locator.range(node.from, node.to),
        sectionIndexAt(node.from, sections),
        'rule-inferred',
        'automation-ready',
        'Use a level-two heading for a top-level semantic section.',
        'edit-markdown',
        true
      ));
    }
  }

  for (const node of descendants(root, candidate => candidate.name === 'FencedCode')) {
    const codeMarks = descendants(node, candidate => candidate.name === 'CodeMark');
    if (codeMarks.length < 2) {
      diagnostics.push(diagnostic(
        'content.markdown.unclosed-fence',
        'warning',
        'A fenced code block is not closed and consumes the remaining Markdown body.',
        locator.range(node.from, node.to),
        sectionIndexAt(node.from, sections),
        'rule-inferred',
        'baseline',
        'Add a matching closing code fence.',
        'edit-markdown',
        true
      ));
    }
  }

  for (const node of descendants(root, candidate => candidate.name === '⚠')) {
    diagnostics.push(diagnostic(
      'content.markdown.unsupported-region',
      'error',
      'The Markdown parser could not safely classify this region.',
      locator.range(node.from, node.to),
      sectionIndexAt(node.from, sections),
      'rule-inferred',
      'baseline',
      'Review the Markdown syntax in this region.',
      'edit-markdown',
      false,
      { markdown: source.slice(node.from, node.to) }
    ));
  }
  return diagnostics;
}

function extractCriteria(
  work: SectionWork[],
  source: string,
  locator: SourceLocator
): SemanticCriterion[] {
  const criteria: SemanticCriterion[] = [];
  for (const current of work.filter(item => (
    item.section.key === 'acceptanceCriteria' || item.section.key === 'releaseCriteria'
  ))) {
    const items = current.contentNodes
      .flatMap(node => descendantsIncluding(node, candidate => candidate.name === 'ListItem'))
      .sort((left, right) => left.from - right.from);
    const ids = new Map<string, string>();
    items.forEach((item, ordinal) => ids.set(nodeIdentity(item), `criterion:${current.section.index}:${ordinal}`));

    for (const item of items) {
      const marker = findTaskMarker(item);
      const parentItem = nearestParent(item, candidate => candidate.name === 'ListItem');
      const contentNode = children(item).find(child => child.name === 'Task' || child.name === 'Paragraph');
      const id = ids.get(nodeIdentity(item));
      if (!id) continue;
      criteria.push({
        id,
        checked: marker ? source.slice(marker.from, marker.to).toLowerCase() === '[x]' : null,
        markdown: source.slice(item.from, semanticNodeEnd(item, source)),
        text: markdownToText(contentNode ? source.slice(contentNode.from, contentNode.to) : source.slice(item.from, item.to)),
        range: locator.range(item.from, semanticNodeEnd(item, source)),
        sectionIndex: current.section.index,
        listDepth: ancestorCount(item, candidate => candidate.name === 'ListItem'),
        parentCriterionId: parentItem ? ids.get(nodeIdentity(parentItem)) ?? null : null,
        provenance: current.section.provenance
      });
    }
  }
  return criteria;
}

function extractEntries<T extends SemanticFinding | SemanticDecisionStatement>(
  work: SectionWork[],
  source: string,
  locator: SourceLocator
): T[] {
  const result: T[] = [];
  for (const current of work) {
    const items = current.contentNodes.flatMap(node => (
      descendantsIncluding(node, candidate => candidate.name === 'ListItem')
    ));
    const paragraphs = current.contentNodes.flatMap(node => (
      descendantsIncluding(node, candidate => (
        candidate.name === 'Paragraph' && !nearestParent(candidate, parent => parent.name === 'ListItem')
      ))
    ));
    const nodes = [...items, ...paragraphs].sort((left, right) => left.from - right.from);
    for (const node of nodes) {
      result.push({
        markdown: source.slice(node.from, semanticNodeEnd(node, source)),
        text: markdownToText(source.slice(node.from, node.to)),
        range: locator.range(node.from, semanticNodeEnd(node, source)),
        sectionIndex: current.section.index,
        provenance: current.section.provenance
      } as T);
    }
  }
  return result;
}

function extractReferences(
  root: MarkdownSyntaxNode,
  source: string,
  locator: SourceLocator,
  sections: OrderedSection[],
  opaqueRanges: Array<{ from: number; to: number }>
): {
  references: SemanticReference[];
  occurrences: LinkOccurrence[];
  diagnostics: SemanticDiagnostic[];
} {
  const references: SemanticReference[] = [];
  const occurrences: LinkOccurrence[] = [];
  const diagnostics: SemanticDiagnostic[] = [];
  const definitions = collectLinkDefinitions(root, source);
  const nodes = descendants(root, node => ['Link', 'Autolink', 'URL'].includes(node.name));

  for (const node of nodes) {
    if (isInsideRanges(node.from, opaqueRanges)) continue;
    if (node.name === 'URL' && node.parent && ['Link', 'Autolink', 'LinkReference'].includes(node.parent.name)) {
      continue;
    }
    const sectionIndex = sectionIndexAt(node.from, sections);
    const section = sectionIndex === null ? undefined : sections[sectionIndex];
    const provenance = section?.key === 'references' ? section.provenance : 'rule-inferred';

    if (node.name === 'Autolink' || node.name === 'URL') {
      const urlNode = node.name === 'URL'
        ? node
        : descendants(node, child => child.name === 'URL')[0];
      if (!urlNode) continue;
      const target = source.slice(urlNode.from, urlNode.to);
      const range = locator.range(node.from, node.to);
      references.push({ kind: 'autolink', label: null, target, range, sectionIndex, provenance });
      occurrences.push({
        range: { from: node.from, to: node.to },
        labelRange: null,
        targetRange: { from: urlNode.from, to: urlNode.to },
        target
      });
      continue;
    }

    const urlNode = descendants(node, child => child.name === 'URL')[0];
    const labelNode = descendants(node, child => child.name === 'LinkLabel')[0];
    const target = urlNode
      ? source.slice(urlNode.from, urlNode.to)
      : labelNode
        ? definitions.get(normalizeLinkLabel(source.slice(labelNode.from, labelNode.to)))
        : undefined;
    const labelRange = linkLabelRange(node);
    if (!target) {
      diagnostics.push(diagnostic(
        'content.reference.unresolved-definition',
        'warning',
        'A reference-style link does not have a resolvable definition.',
        locator.range(node.from, node.to),
        sectionIndex,
        provenance,
        'automation-ready',
        'Add or repair the matching link reference definition.',
        'edit-markdown',
        false
      ));
      continue;
    }
    references.push({
      kind: 'link',
      label: labelRange ? markdownToText(source.slice(labelRange.from, labelRange.to)) : null,
      target,
      range: locator.range(node.from, node.to),
      sectionIndex,
      provenance
    });
    occurrences.push({
      range: { from: node.from, to: node.to },
      labelRange,
      targetRange: urlNode ? { from: urlNode.from, to: urlNode.to } : null,
      target
    });
  }

  for (const reference of descendants(root, node => node.name === 'LinkReference')) {
    const urlNode = descendants(reference, node => node.name === 'URL')[0];
    if (!urlNode) continue;
    occurrences.push({
      range: { from: reference.from, to: reference.to },
      labelRange: null,
      targetRange: { from: urlNode.from, to: urlNode.to },
      target: source.slice(urlNode.from, urlNode.to)
    });
  }
  return { references, occurrences, diagnostics };
}

function collectLinkDefinitions(root: MarkdownSyntaxNode, source: string): Map<string, string> {
  const definitions = new Map<string, string>();
  for (const reference of descendants(root, node => node.name === 'LinkReference')) {
    const label = descendants(reference, node => node.name === 'LinkLabel')[0];
    const url = descendants(reference, node => node.name === 'URL')[0];
    if (label && url) {
      definitions.set(
        normalizeLinkLabel(source.slice(label.from, label.to)),
        source.slice(url.from, url.to)
      );
    }
  }
  return definitions;
}

function extractMentions(
  source: string,
  locator: SourceLocator,
  sections: OrderedSection[],
  opaqueRanges: Array<{ from: number; to: number }>,
  links: LinkOccurrence[]
): EntityMention[] {
  const mentions: EntityMention[] = [];
  ENTITY_ID_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ENTITY_ID_PATTERN.exec(source)) !== null) {
    const id = match[0];
    const from = match.index;
    const to = from + id.length;
    if (!hasEntityBoundaries(source, from, to) || isInsideRanges(from, opaqueRanges)) {
      continue;
    }
    const link = links.find(candidate => from >= candidate.range.from && to <= candidate.range.to);
    const inTarget = link?.targetRange
      ? from >= link.targetRange.from && to <= link.targetRange.to
      : false;
    const inLabel = link?.labelRange
      ? from >= link.labelRange.from && to <= link.labelRange.to
      : false;
    mentions.push({
      id,
      entityType: mentionEntityType(id),
      form: inTarget ? 'link-target' : inLabel ? 'link-label' : 'prose',
      range: locator.range(from, to),
      sectionIndex: sectionIndexAt(from, sections),
      referenceTarget: link?.target ?? null,
      resolved: null,
      authoritative: false,
      provenance: 'rule-inferred'
    });
  }
  return mentions;
}

function collectOpaqueRanges(
  root: MarkdownSyntaxNode,
  source: string
): Array<{ from: number; to: number }> {
  const ranges = descendants(root, node => OPAQUE_NODE_NAMES.has(node.name))
    .map(node => ({ from: node.from, to: node.to }));
  const htmlTags = descendants(root, node => node.name === 'HTMLTag').sort((a, b) => a.from - b.from);
  const stack: Array<{ name: string; from: number }> = [];
  for (const tag of htmlTags) {
    const raw = source.slice(tag.from, tag.to);
    const parsed = /^<\s*(\/?)\s*([A-Za-z][\w:-]*)/.exec(raw);
    if (!parsed?.[2]) {
      ranges.push({ from: tag.from, to: tag.to });
      continue;
    }
    const name = parsed[2].toLowerCase();
    const closing = parsed[1] === '/';
    if (closing) {
      const openIndex = stack.map(item => item.name).lastIndexOf(name);
      if (openIndex >= 0) {
        const open = stack[openIndex];
        if (open) ranges.push({ from: open.from, to: tag.to });
        stack.splice(openIndex);
      } else {
        ranges.push({ from: tag.from, to: tag.to });
      }
    } else if (/\/\s*>$/.test(raw) || VOID_HTML_ELEMENTS.has(name)) {
      ranges.push({ from: tag.from, to: tag.to });
    } else {
      stack.push({ name, from: tag.from });
    }
  }
  ranges.push(...stack.map(open => ({ from: open.from, to: source.length })));
  return mergeRanges(ranges);
}

function determineContentShape(nodes: MarkdownSyntaxNode[], markdown: string): ContentShape {
  if (markdown.trim().length === 0) return 'empty';
  const hasTask = nodes.some(node => descendantsIncluding(node, child => child.name === 'Task').length > 0);
  if (hasTask) return 'task-list';
  const hasList = nodes.some(node => ['BulletList', 'OrderedList'].includes(node.name));
  const hasProse = nodes.some(node => ['Paragraph', 'Blockquote'].includes(node.name));
  const hasReference = nodes.some(node => (
    descendantsIncluding(node, child => ['Link', 'Autolink', 'URL'].includes(child.name)).length > 0
  ));
  if ((hasList || hasReference) && hasProse) return 'mixed';
  if (hasList) return 'list';
  if (hasReference) return 'references';
  return 'prose';
}

function fallbackDocument(
  entityType: EntityType,
  rawMarkdown: string,
  options: ParseSemanticDocumentOptions,
  locator: SourceLocator,
  error: unknown
): SemanticDocument {
  const message = error instanceof Error ? error.message : String(error);
  return {
    contractVersion: '1.0.0',
    profile: { entityType, version: '1.0.0' },
    source: { filePath: options.filePath ?? '', rawMarkdown },
    preamble: {
      markdown: rawMarkdown,
      text: markdownToText(rawMarkdown),
      range: locator.range(0, rawMarkdown.length),
      empty: rawMarkdown.trim().length === 0
    },
    sections: [],
    knownSections: {},
    criteria: [],
    findings: [],
    decisions: [],
    references: [],
    mentions: [],
    diagnostics: [diagnostic(
      'content.markdown.unsupported-region',
      'error',
      `Markdown parsing failed without discarding the raw body: ${message}`,
      locator.range(0, rawMarkdown.length),
      null,
      'rule-inferred',
      'baseline',
      'Review the Markdown body and parser compatibility.',
      'edit-markdown',
      false
    )],
    conformance: {
      baseline: 'nonconformant',
      automationReady: 'not-evaluated',
      lifecycle: 'not-evaluated'
    },
    analyzerResults: []
  };
}

function diagnostic(
  code: string,
  severity: SemanticDiagnostic['severity'],
  message: string,
  range: SourceRange | null,
  sectionIndex: number | null,
  provenance: SemanticProvenance,
  conformance: SemanticDiagnostic['conformance'],
  repairSummary: string,
  repairKind: SemanticDiagnostic['repair']['kind'],
  previewable: boolean,
  data?: SemanticDiagnostic['data']
): SemanticDiagnostic {
  return {
    code,
    severity,
    message,
    range,
    sectionIndex,
    provenance,
    conformance,
    repair: { summary: repairSummary, kind: repairKind, previewable },
    ...(data ? { data } : {})
  };
}

function compareDiagnostics(left: SemanticDiagnostic, right: SemanticDiagnostic): number {
  return (left.range?.start.offset ?? -1) - (right.range?.start.offset ?? -1)
    || left.code.localeCompare(right.code);
}

function headingLevel(node: MarkdownSyntaxNode): 1 | 2 | 3 | 4 | 5 | 6 | null {
  const match = HEADING_PATTERN.exec(node.name);
  if (!match?.[1]) return null;
  const level = Number(match[1]);
  return level >= 1 && level <= 6 ? level as 1 | 2 | 3 | 4 | 5 | 6 : null;
}

function headingText(node: MarkdownSyntaxNode, source: string): string {
  const marks = descendants(node, child => child.name === 'HeaderMark')
    .map(mark => ({ from: mark.from, to: mark.to }));
  return markdownToText(removeAbsoluteRanges(source, node.from, node.to, marks));
}

function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}\s+|[-+*]\s+|\d+[.)]\s+)/gm, '')
    .replace(/^\s*\[[ xX]\]\s*/gm, '')
    .replace(/[`*_~]/g, '')
    .replace(/\\([\\`*{}[\]()#+.!_>~-])/g, '$1')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeHeading(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLowerCase();
}

function normalizeComparisonText(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLowerCase();
}

function normalizeLinkLabel(value: string): string {
  return value.replace(/^\[|\]$/g, '').trim().replace(/\s+/gu, ' ').toLowerCase();
}

function consumeLineEnding(source: string, offset: number): number {
  if (source.slice(offset, offset + 2) === '\r\n') return offset + 2;
  if (source[offset] === '\r' || source[offset] === '\n') return offset + 1;
  return offset;
}

function semanticNodeEnd(node: MarkdownSyntaxNode, source: string): number {
  return node.to > node.from && source[node.to - 1] === '\r' && source[node.to] === '\n'
    ? node.to - 1
    : node.to;
}

function children(node: MarkdownSyntaxNode): MarkdownSyntaxNode[] {
  const result: MarkdownSyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    result.push(child);
  }
  return result;
}

function descendants(
  node: MarkdownSyntaxNode,
  predicate: (candidate: MarkdownSyntaxNode) => boolean
): MarkdownSyntaxNode[] {
  return children(node).flatMap(child => [
    ...(predicate(child) ? [child] : []),
    ...descendants(child, predicate)
  ]);
}

function descendantsIncluding(
  node: MarkdownSyntaxNode,
  predicate: (candidate: MarkdownSyntaxNode) => boolean
): MarkdownSyntaxNode[] {
  return [...(predicate(node) ? [node] : []), ...descendants(node, predicate)];
}

function nearestParent(
  node: MarkdownSyntaxNode,
  predicate: (candidate: MarkdownSyntaxNode) => boolean
): MarkdownSyntaxNode | null {
  let parent = node.parent;
  while (parent) {
    if (predicate(parent)) return parent;
    parent = parent.parent;
  }
  return null;
}

function ancestorCount(
  node: MarkdownSyntaxNode,
  predicate: (candidate: MarkdownSyntaxNode) => boolean
): number {
  let count = 0;
  let parent = node.parent;
  while (parent) {
    if (predicate(parent)) count += 1;
    parent = parent.parent;
  }
  return count;
}

function findTaskMarker(item: MarkdownSyntaxNode): MarkdownSyntaxNode | undefined {
  for (const child of children(item)) {
    if (child.name === 'BulletList' || child.name === 'OrderedList') continue;
    const marker = descendantsIncluding(child, candidate => candidate.name === 'TaskMarker')[0];
    if (marker) return marker;
  }
  return undefined;
}

function nodeIdentity(node: MarkdownSyntaxNode): string {
  return `${node.from}:${node.to}`;
}

function linkLabelRange(node: MarkdownSyntaxNode): { from: number; to: number } | null {
  const marks = descendants(node, child => child.name === 'LinkMark').sort((a, b) => a.from - b.from);
  const opening = marks[0];
  const closing = marks.find(mark => mark.from > (opening?.to ?? node.from));
  return opening && closing ? { from: opening.to, to: closing.from } : null;
}

function sectionIndexAt(offset: number, sections: OrderedSection[]): number | null {
  const section = sections.find(candidate => (
    offset >= candidate.range.start.offset && offset < candidate.range.end.offset
  ));
  return section?.index ?? null;
}

function mentionEntityType(id: string): EntityMention['entityType'] {
  if (id.startsWith('TASK-')) return 'task';
  if (id.startsWith('EPIC-')) return 'epic';
  if (id.startsWith('MILESTONE-')) return 'milestone';
  return 'decision';
}

function hasEntityBoundaries(source: string, from: number, to: number): boolean {
  const boundary = /[A-Za-z0-9_-]/;
  return !boundary.test(source[from - 1] ?? '') && !boundary.test(source[to] ?? '');
}

function isInsideRanges(offset: number, ranges: Array<{ from: number; to: number }>): boolean {
  return ranges.some(range => offset >= range.from && offset < range.to);
}

function mergeRanges(ranges: Array<{ from: number; to: number }>): Array<{ from: number; to: number }> {
  const sorted = ranges.filter(range => range.to > range.from).sort((a, b) => a.from - b.from);
  const merged: Array<{ from: number; to: number }> = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function removeAbsoluteRanges(
  source: string,
  from: number,
  to: number,
  ranges: Array<{ from: number; to: number }>
): string {
  let result = '';
  let cursor = from;
  for (const range of ranges.sort((a, b) => a.from - b.from)) {
    result += source.slice(cursor, Math.max(cursor, range.from));
    cursor = Math.max(cursor, range.to);
  }
  return result + source.slice(cursor, to);
}
