/**
 * Structured editor webview presentation.
 */

import * as vscode from 'vscode';
import type { Decision, Epic, Milestone, Task } from 'planfs-core';
import { renderHelpButton, renderHelpPanel } from './help';
import { renderEditorBrowserScript } from './editor-view-script';
import { EDITOR_VIEW_STYLES } from './editor-view-styles';
import { escapeHtml, getNonce } from './webview';
import type { EditableEntity, EditorPayload, EpicBoardColumn, EpicBoardTask } from './editor';

export function renderEditor(webview: vscode.Webview, payload: EditorPayload): string {
  const nonce = getNonce();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>PlanFS Entity Editor</title>
  <style>
${EDITOR_VIEW_STYLES}  </style>
</head>
<body>
  <div class="shell">
    <header class="header">
      <div>
        <h1>${escapeHtml(payload.entity.id)}</h1>
        <div class="subtle">${escapeHtml(payload.entity.type)} editor</div>
      </div>
      <div class="actions">
        <button id="save">Save</button>
        <button id="openRaw" class="secondary">Open Markdown</button>
        ${renderHelpButton('editor', 'Show help for the structured editor')}
        ${payload.entity.type === 'task' || payload.entity.type === 'epic' ? '<button id="archiveEntity" class="danger" type="button">Archive ' + escapeHtml(titleCase(payload.entity.type)) + '</button>' : ''}
      </div>
    </header>
    <div id="errors" class="errors"></div>
    <form id="form" class="grid">
      ${renderEntityFields(payload)}
    </form>
  </div>
  ${renderHelpPanel()}
  <script nonce="${nonce}">
${renderEditorBrowserScript(payload)}  </script>
</body>
</html>`;
}

function renderEntityFields(payload: EditorPayload): string {
  const entity = payload.entity;
  const common = [
    compactInput('ID', 'id', entity.id, 'text', true),
    input('Title', 'title', entity.title)
  ];

  if (entity.type === 'task') {
    const task = entity as Task;
    return [
      renderDiagnostics(payload),
      compactMeta([
        compactInput('ID', 'id', task.id, 'text', true),
        compactSelect('Status', 'status', task.status, ['todo', 'in-progress', 'review', 'done']),
        compactSelect('Priority', 'priority', task.priority ?? '', ['', 'low', 'medium', 'high', 'critical']),
        compactInput('Due Date', 'dueDate', toDateInput(task.dueDate), 'date'),
        compactInput('Estimate', 'estimate', task.estimate ?? '')
      ]),
      input('Title', 'title', task.title),
      input('Assignee', 'assignee', task.assignee ?? '', 'text', false, 'developer-options'),
      datalist('developer-options', payload.options.developers),
      selectWithOptions('Epic', 'epic', task.epic ?? '', payload.options.epics),
      selectWithOptions('Milestone', 'milestone', task.milestone ?? '', payload.options.milestones),
      input('Tags', 'tags', (task.tags ?? []).join(', '), 'text', false, 'tag-options'),
      datalist('tag-options', payload.options.tags),
      renderBacklogReadiness(payload),
      dependencyChecks(task, payload.options.tasks),
      textarea('Links JSON', 'links', formatJson(task.links), 'full'),
      renderAdditionalMetadata(task),
      renderSemanticSections('Semantic Markdown')
    ].join('');
  }

  if (entity.type === 'epic') {
    const epic = entity as Epic;
    return [
      renderDiagnostics(payload),
      compactMeta([
        common[0],
        compactSelect('Status', 'status', epic.status, ['active', 'completed', 'on-hold', 'archived']),
        compactInput('Epic Planning Date', 'targetDate', toDateInput(epic.targetDate), 'date')
      ]),
      common[1],
      input('Owner', 'owner', epic.owner ?? '', 'text', false, 'developer-options'),
      datalist('developer-options', payload.options.developers),
      input('Tags', 'tags', (epic.tags ?? []).join(', '), 'text', false, 'tag-options'),
      datalist('tag-options', payload.options.tags),
      textarea('Description', 'description', epic.description ?? '', 'full'),
      textarea('Links JSON', 'links', formatJson(epic.links), 'full'),
      renderAdditionalMetadata(epic),
      renderEpicBoard(payload),
      renderSemanticSections('Epic Planning Notes')
    ].join('');
  }

  if (entity.type === 'decision') {
    const decision = entity as Decision;
    return [
      renderDiagnostics(payload),
      compactMeta([common[0], compactSelect('Status', 'status', decision.status, ['proposed', 'accepted', 'rejected', 'superseded'])]),
      common[1], input('Date', 'date', toDateInput(decision.date), 'date'), input('Author', 'author', decision.author ?? ''),
      textarea('Context', 'context', decision.context ?? '', 'full'), textarea('Decision', 'decision', decision.decision ?? '', 'full'),
      textarea('Consequences', 'consequences', decision.consequences ?? '', 'full'),
      input('Supersedes', 'supersedes', decision.supersedes ?? ''), input('Superseded By', 'supersededBy', decision.supersededBy ?? ''),
      renderAdditionalMetadata(decision), renderSemanticSections('Decision Notes')
    ].join('');
  }

  const milestone = entity as Milestone;
  return [
    renderDiagnostics(payload),
    compactMeta([
      common[0],
      compactSelect('Status', 'status', milestone.status, ['active', 'completed', 'delayed']),
      compactInput('Milestone Target Date', 'targetDate', toDateInput(milestone.targetDate), 'date')
    ]),
    common[1],
    input('Owner', 'owner', milestone.owner ?? '', 'text', false, 'developer-options'),
    datalist('developer-options', payload.options.developers),
    textarea('Description', 'description', milestone.description ?? '', 'full'),
    textarea('Links JSON', 'links', formatJson(milestone.links), 'full'),
    renderAdditionalMetadata(milestone),
    renderMilestoneRollup(payload),
    renderSemanticSections('Semantic Markdown')
  ].join('');
}

function renderMilestoneRollup(payload: EditorPayload): string {
  const rollup = payload.milestoneRollup;
  if (!rollup) return '';
  const assigned = new Set(rollup.tasks.map(item => item.task.id));
  const available = payload.options.tasks.filter(task => !assigned.has(task.id));
  const stats = [
    ['Total', rollup.total], ['Open', rollup.open], ['Done', rollup.done],
    ['Blocked', rollup.blocked], ['Overdue', rollup.overdue], ['At risk', rollup.atRisk]
  ].map(([label, value]) => `<span><strong>${value}</strong> ${label}</span>`).join('');
  const tasks = rollup.tasks.length === 0
    ? '<p class="subtle">No tasks currently reference this milestone.</p>'
    : rollup.tasks.map(item => {
      const flags = [item.blocked && 'blocked', item.overdue && 'overdue', item.atRisk && 'at risk'].filter(Boolean).join(' · ');
      return `<div class="taskMini"><button type="button" data-open-entity="${escapeHtml(item.task.id)}"><strong>${escapeHtml(item.task.id)}</strong> ${escapeHtml(item.task.title)}</button><span class="taskMeta">${escapeHtml(item.task.status)}${flags ? ` · ${escapeHtml(flags)}` : ''}</span><button type="button" data-set-milestone-task="${escapeHtml(item.task.id)}" data-assigned="false">Remove</button></div>`;
    }).join('');
  const options = available.map(task => `<option value="${escapeHtml(task.id)}">${escapeHtml(task.id)} · ${escapeHtml(task.title)}</option>`).join('');
  return `<section class="card full"><h2>Milestone Task Rollup</h2><div class="compactMeta">${stats}</div><p class="subtle">${rollup.completionPercentage === undefined ? 'No completion percentage until tasks are assigned.' : `${rollup.completionPercentage}% complete`}</p>${tasks}<div class="fieldRow"><select id="milestoneTaskToAdd" aria-label="Task to add"><option value="">Select a task</option>${options}</select><button type="button" id="addMilestoneTask"${available.length === 0 ? ' disabled' : ''}>Add task</button></div></section>`;
}

function renderDiagnostics(payload: EditorPayload): string {
  if (payload.diagnostics.length === 0) {
    return '';
  }

  const severity = payload.diagnostics.some(diagnostic => diagnostic.severity === 'error')
    ? 'error'
    : 'warning';

  return [
    '<section class="card full infoBox ' + severity + '">',
    '<h2>File Diagnostics</h2>',
    '<ul class="reasonList">',
    payload.diagnostics.map(diagnostic =>
      '<li><strong>' + escapeHtml(diagnostic.severity) + '</strong>: '
      + escapeHtml(diagnostic.message)
      + (diagnostic.path ? ' <span class="subtle">' + escapeHtml(diagnostic.path) + '</span>' : '')
      + '</li>'
    ).join(''),
    '</ul>',
    '</section>'
  ].join('');
}

function compactMeta(fields: string[]): string {
  return '<div class="card full compactMeta">' + fields.join('') + '</div>';
}

function renderBacklogReadiness(payload: EditorPayload): string {
  const readiness = payload.backlogReadiness;
  if (!readiness || !readiness.needsReview) {
    return '';
  }

  const reasons = readiness.reasons.length > 0
    ? '<ul class="reasonList">' + readiness.reasons
      .map(reason => '<li>' + escapeHtml(reason) + '</li>')
      .join('') + '</ul>'
    : '<p class="subtle">Needs backlog review.</p>';

  return [
    '<section class="card full infoBox warning">',
    '<h2>Backlog Readiness</h2>',
    reasons,
    '</section>'
  ].join('');
}

function renderEpicBoard(payload: EditorPayload): string {
  const columns = payload.epicBoard ?? [];
  const totalTasks = columns.reduce((total, column) => total + column.tasks.length, 0);

  if (columns.length === 0) {
    return '';
  }

  return [
    '<section class="card full">',
    '<h2>Epic Task Board</h2>',
    totalTasks === 0
      ? '<p class="subtle">No tasks currently reference this epic.</p>'
      : '<div class="epicBoard">' + columns.map(renderEpicBoardColumn).join('') + '</div>',
    '</section>'
  ].join('');
}

function renderEpicBoardColumn(column: EpicBoardColumn): string {
  const tasks = column.tasks.length === 0
    ? '<div class="emptyColumn">No tasks</div>'
    : column.tasks.map(renderEpicBoardTask).join('');

  return [
    '<section class="boardColumn">',
    '<div class="columnHead"><span>' + escapeHtml(column.status) + '</span><span>' + column.tasks.length + '</span></div>',
    tasks,
    '</section>'
  ].join('');
}

function renderEpicBoardTask(task: EpicBoardTask): string {
  const meta = [
    task.priority,
    task.assignee,
    task.milestone,
    toDateInput(task.dueDate)
  ].filter(Boolean).join(' · ');

  return [
    '<button type="button" class="taskMini" data-open-entity="' + escapeHtml(task.id) + '">',
    '<strong>' + escapeHtml(task.id) + '</strong>',
    '<span class="taskTitle">' + escapeHtml(task.title) + '</span>',
    meta ? '<span class="taskMeta">' + escapeHtml(meta) + '</span>' : '',
    '</button>'
  ].join('');
}

function input(
  label: string,
  name: string,
  value: string,
  type = 'text',
  readonly = false,
  list?: string
): string {
  return `<label>${escapeHtml(label)}<input name="${name}" type="${type}" value="${escapeHtml(value)}"${readonly ? ' readonly' : ''}${list ? ` list="${list}"` : ''}></label>`;
}

function compactInput(
  label: string,
  name: string,
  value: string,
  type = 'text',
  readonly = false
): string {
  return `<label class="compactField" data-field="${escapeHtml(name)}">${escapeHtml(label)}<input name="${name}" type="${type}" value="${escapeHtml(value)}"${readonly ? ' readonly' : ''}></label>`;
}

function compactSelect(label: string, name: string, value: string, options: string[]): string {
  return `<label class="compactField" data-field="${escapeHtml(name)}">${escapeHtml(label)}<select name="${name}">${options.map(option => `<option value="${escapeHtml(option)}"${option === value ? ' selected' : ''}>${escapeHtml(option || 'None')}</option>`).join('')}</select></label>`;
}

function selectWithOptions(
  label: string,
  name: string,
  value: string,
  options: Array<{ id: string; title: string }>
): string {
  return `<label>${escapeHtml(label)}<select name="${name}"><option value="">None</option>${options.map(option => `<option value="${escapeHtml(option.id)}"${option.id === value ? ' selected' : ''}>${escapeHtml(`${option.id}: ${option.title}`)}</option>`).join('')}</select></label>`;
}

function textarea(label: string, name: string, value: string, className = ''): string {
  return `<label class="${className}">${escapeHtml(label)}<textarea name="${name}">${escapeHtml(value)}</textarea></label>`;
}

function renderAdditionalMetadata(entity: EditableEntity): string {
  const known = knownMetadataFields(entity.type);
  const entries = Object.entries(entity.metadata)
    .filter(([key]) => !known.has(key))
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return '';
  }

  return [
    '<section class="card full">',
    '<h2>Additional metadata</h2>',
    '<p class="subtle">These frontmatter fields are preserved from the Markdown file but do not map to structured editor controls.</p>',
    '<dl class="metadataList">',
    entries.map(([key, value]) => [
      '<div>',
      '<dt>' + escapeHtml(key) + '</dt>',
      '<dd><code>' + escapeHtml(formatMetadataValue(value)) + '</code></dd>',
      '</div>'
    ].join('')).join(''),
    '</dl>',
    '</section>'
  ].join('');
}

function knownMetadataFields(type: EditableEntity['type']): Set<string> {
  const common = ['id', 'title', 'status', 'archive', 'createdAt', 'updatedAt'];
  switch (type) {
    case 'task':
      return new Set([
        ...common,
        'priority',
        'assignee',
        'epic',
        'milestone',
        'dependsOn',
        'tags',
        'dueDate',
        'estimate',
        'refinementState',
        'backlogOrder',
        'links'
      ]);
    case 'epic':
      return new Set([
        ...common,
        'priority',
        'owner',
        'description',
        'targetDate',
        'tags',
        'links'
      ]);
    case 'milestone':
      return new Set([
        ...common,
        'description',
        'targetDate',
        'owner',
        'links'
      ]);
    case 'decision':
      return new Set([...common, 'date', 'author', 'context', 'decision', 'consequences', 'supersedes', 'supersededBy']);
    default:
      return new Set(common);
  }
}

function formatMetadataValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2) ?? '';
}

function renderSemanticSections(heading: string): string {
  return [
    '<section class="card full">',
    '<h2>' + escapeHtml(heading) + '</h2>',
    '<p class="subtle">Semantic content is derived from the human-owned Markdown file. Use Open Markdown to edit it.</p>',
    '<div id="semanticContent" aria-live="polite"></div>',
    '</section>'
  ].join('');
}

function dependencyChecks(
  task: Task,
  tasks: Array<{ id: string; title: string }>
): string {
  const selected = new Set(task.dependsOn ?? []);
  const rows = tasks
    .filter(candidate => candidate.id !== task.id)
    .map(candidate => `<label class="check"><input data-dependency type="checkbox" value="${escapeHtml(candidate.id)}"${selected.has(candidate.id) ? ' checked' : ''}>${escapeHtml(`${candidate.id}: ${candidate.title}`)}</label>`)
    .join('');
  return `<div class="card full"><h2>Dependencies</h2><div class="checkboxes">${rows || '<span class="subtle">No other tasks available.</span>'}</div></div>`;
}

function datalist(id: string, values: string[]): string {
  return `<datalist id="${id}">${values.map(value => `<option value="${escapeHtml(value)}"></option>`).join('')}</datalist>`;
}

function formatJson(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }
  return JSON.stringify(value, null, 2);
}

function toDateInput(value?: string): string {
  return String(value ?? '').slice(0, 10);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
