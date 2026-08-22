/**
 * Structured editor webview presentation.
 */

import * as vscode from 'vscode';
import type { Decision, Epic, Milestone, Task } from 'planfs-core';
import { HELP_SCRIPT, HELP_STYLES, renderHelpButton, renderHelpPanel } from './help';
import { escapeHtml, getNonce } from './webview';
import type { EditableEntity, EditorPayload, EpicBoardColumn, EpicBoardTask } from './editor';

export function renderEditor(webview: vscode.Webview, payload: EditorPayload): string {
  const nonce = getNonce();
  const serializedEntity = escapeScriptJson(JSON.stringify(payload.entity));
  const serializedHelpTopics = escapeScriptJson(JSON.stringify(payload.helpTopics));
  const serializedSemantic = escapeScriptJson(JSON.stringify(payload.semantic));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>PlanFS Entity Editor</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --panel: color-mix(in srgb, var(--vscode-sideBar-background) 86%, var(--vscode-editor-background));
      --border: var(--vscode-panel-border);
      --text: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --error: var(--vscode-inputValidation-errorBorder);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 18px;
      color: var(--text);
      background: var(--bg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .shell { max-width: 980px; margin: 0 auto; }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: end;
      margin-bottom: 14px;
    }

    h1 { margin: 0 0 4px; font-size: 22px; }
    h2 { margin: 0 0 10px; font-size: 15px; }
    .subtle { color: var(--muted); }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .card {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      padding: 12px;
    }

    .full { grid-column: 1 / -1; }

    label {
      display: grid;
      gap: 5px;
      margin-bottom: 10px;
      color: var(--muted);
    }

    input,
    select,
    textarea {
      width: 100%;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--border));
      border-radius: 3px;
      padding: 7px 8px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    textarea {
      min-height: 180px;
      resize: vertical;
      font-family: var(--vscode-editor-font-family);
    }

    input[type="checkbox"] {
      width: auto;
      min-width: auto;
      flex: 0 0 auto;
      margin: 2px 0 0;
    }

    .compactMeta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, max-content));
      gap: 8px 12px;
      align-items: end;
    }

    .compactField {
      display: grid;
      grid-template-columns: max-content minmax(82px, var(--field-width, 130px));
      gap: 6px;
      align-items: center;
      margin: 0;
      white-space: nowrap;
    }

    .compactField input,
    .compactField select {
      min-width: 0;
    }

    .compactField[data-field="id"] {
      --field-width: 112px;
    }

    .compactField[data-field="status"] {
      --field-width: 132px;
    }

    .compactField[data-field="priority"] {
      --field-width: 116px;
    }

    .compactField[data-field="dueDate"],
    .compactField[data-field="targetDate"] {
      --field-width: 138px;
    }

    .compactField[data-field="estimate"] {
      --field-width: 96px;
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    button {
      cursor: pointer;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 7px 10px;
    }

    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
      border-color: var(--vscode-button-secondaryBackground);
    }

    button.danger {
      color: var(--vscode-errorForeground, var(--vscode-button-foreground));
      background: color-mix(in srgb, var(--vscode-inputValidation-errorBackground, var(--vscode-input-background)) 78%, var(--vscode-button-background));
      border-color: var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
    }

    .errors {
      display: none;
      border: 1px solid var(--error);
      padding: 10px;
      margin-bottom: 12px;
      border-radius: 4px;
    }

    .checkboxes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      max-height: 170px;
      overflow: auto;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
    }

    .check {
      display: flex;
      gap: 6px;
      align-items: center;
      color: var(--text);
      margin: 0;
    }

    .check input { width: auto; }

    .epicBoard {
      display: grid;
      grid-template-columns: repeat(4, minmax(150px, 1fr));
      gap: 10px;
    }

    .boardColumn {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: color-mix(in srgb, var(--panel) 82%, var(--bg));
      padding: 8px;
    }

    .columnHead {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
    }

    .taskMini {
      display: grid;
      gap: 5px;
      width: 100%;
      margin: 0 0 8px;
      padding: 8px;
      color: var(--text);
      text-align: left;
      background: var(--vscode-input-background);
      border: 1px solid var(--border);
      border-radius: 5px;
    }

    .taskMini:hover {
      border-color: var(--vscode-focusBorder);
    }

    .taskTitle {
      overflow-wrap: anywhere;
      line-height: 1.3;
    }

    .taskMeta {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
    }

    .sectionList {
      display: grid;
      gap: 8px;
    }

    .semanticHeader,
    .semanticRow,
    .semanticActions,
    .semanticProgress {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .semanticHeader {
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .semanticGroup {
      display: grid;
      gap: 8px;
      margin-top: 14px;
    }

    .semanticGroup h3 {
      margin: 0;
      font-size: 13px;
    }

    .semanticProgress {
      margin-left: auto;
    }

    .semanticProgress progress {
      width: 112px;
      height: 7px;
      accent-color: var(--vscode-progressBar-background, var(--vscode-focusBorder));
    }

    .semanticDisclosure {
      border-top: 1px solid var(--border);
      padding-top: 10px;
    }

    .semanticDisclosure > summary,
    .semanticPreviewDisclosure > summary {
      cursor: pointer;
      color: var(--vscode-textLink-foreground);
    }

    .semanticDisclosure > summary {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      list-style: none;
    }

    .semanticDisclosure > summary::before {
      content: '›';
      color: var(--muted);
      font-size: 16px;
      line-height: 1;
      transition: transform 120ms ease;
    }

    .semanticDisclosure[open] > summary::before {
      transform: rotate(90deg);
    }

    .semanticDisclosureBody {
      display: grid;
      gap: 8px;
      margin-top: 8px;
    }

    .semanticItem {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 9px;
      align-items: start;
      padding: 8px 9px;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: var(--vscode-input-background);
    }

    .semanticItem.checked .semanticText {
      color: var(--muted);
      text-decoration: line-through;
    }

    .semanticItem.checked {
      border-left: 3px solid var(--vscode-testing-iconPassed, var(--vscode-charts-green, var(--border)));
    }

    .semanticItem.unchecked {
      border-left: 3px solid var(--vscode-focusBorder, var(--border));
    }

    .semanticItem.uncheckable {
      border-left: 3px solid var(--vscode-disabledForeground, var(--border));
      border-style: dashed;
    }

    .semanticMark {
      min-width: 22px;
      color: var(--muted);
      font-family: var(--vscode-editor-font-family);
      font-weight: 700;
    }

    .semanticText {
      min-width: 0;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .semanticMeta,
    .semanticEvidence {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.4;
    }

    .semanticEvidence {
      grid-column: 2 / -1;
    }

    .semanticExplanation {
      grid-column: 2 / -1;
      padding: 7px 8px;
      border-left: 3px solid var(--vscode-inputValidation-infoBorder, var(--border));
      background: color-mix(in srgb, var(--panel) 82%, var(--bg));
    }

    .semanticExplanation summary {
      cursor: pointer;
      color: var(--vscode-textLink-foreground);
      font-weight: 600;
    }

    .semanticExplanation p {
      margin: 7px 0 0;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.45;
    }

    .semanticLink {
      padding: 3px 6px;
      color: var(--vscode-textLink-foreground);
      background: transparent;
      border-color: transparent;
    }

    .semanticBadge {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--muted);
      font-size: 10px;
    }

    .semanticDiagnostic.warning,
    .semanticSuggestion {
      border-left: 3px solid var(--vscode-inputValidation-warningBorder, var(--border));
      border-color: var(--vscode-inputValidation-warningBorder, var(--border));
    }

    .semanticDiagnostic.error {
      border-left: 3px solid var(--vscode-inputValidation-errorBorder, var(--border));
      border-color: var(--vscode-inputValidation-errorBorder, var(--border));
    }

    .semanticDiagnostic.info {
      border-left: 3px solid var(--vscode-inputValidation-infoBorder, var(--border));
      border-color: var(--vscode-inputValidation-infoBorder, var(--border));
    }

    .semanticSectionPreview {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }

    .semanticPreviewDisclosure {
      margin-top: 5px;
    }

    .semanticPreviewDisclosure > summary {
      font-size: 11px;
    }

    .semanticFullPreview {
      margin-top: 6px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.45;
    }

    .relationshipGrid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 7px;
    }

    .relationshipBox {
      padding: 7px 8px;
      border: 1px solid var(--border);
      border-left: 3px solid var(--vscode-focusBorder, var(--border));
      border-radius: 4px;
      background: var(--vscode-input-background);
    }

    .metadataList {
      display: grid;
      gap: 8px;
      margin: 0;
    }

    .metadataList > div {
      display: grid;
      grid-template-columns: minmax(120px, max-content) minmax(0, 1fr);
      gap: 10px;
      padding: 7px 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--vscode-input-background);
    }

    .metadataList dt {
      color: var(--muted);
      font-weight: 600;
    }

    .metadataList dd {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
    }

    .metadataList code,
    .markdownFallback code {
      font-family: var(--vscode-editor-font-family);
    }

    .markdownFallback {
      display: grid;
      gap: 6px;
      margin-bottom: 12px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: var(--vscode-input-background);
    }

    .markdownFallback h2,
    .markdownFallback h3,
    .markdownFallback h4,
    .markdownFallback p,
    .markdownFallback ul,
    .markdownFallback blockquote,
    .markdownFallback pre {
      margin: 0;
    }

    .markdownFallback ul {
      padding-left: 20px;
    }

    .markdownFallback li {
      margin: 4px 0;
    }

    .markdownFallback blockquote {
      padding-left: 10px;
      border-left: 3px solid var(--border);
      color: var(--muted);
    }

    .markdownFallback pre {
      overflow: auto;
      padding: 8px;
      border-radius: 4px;
      background: var(--vscode-editor-background);
    }

    .sectionItem {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 7px 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--vscode-input-background);
    }

    .sectionItem.done {
      color: var(--muted);
    }

    .sectionText {
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .infoBox {
      display: grid;
      gap: 8px;
      border-color: var(--vscode-inputValidation-infoBorder, var(--border));
    }

    .infoBox.warning {
      border-color: var(--vscode-inputValidation-warningBorder, var(--border));
    }

    .infoBox.error {
      border-color: var(--vscode-inputValidation-errorBorder, var(--border));
    }

    .reasonList {
      margin: 0;
      padding-left: 18px;
    }

    .reasonList li {
      margin: 3px 0;
    }

    ${HELP_STYLES}

    .emptyColumn {
      padding: 8px;
      color: var(--muted);
      border: 1px dashed var(--border);
      border-radius: 5px;
    }

    @media (max-width: 760px) {
      .grid,
      .epicBoard {
        grid-template-columns: 1fr;
      }

      .compactMeta {
        grid-template-columns: 1fr;
      }

      .compactField {
        grid-template-columns: 1fr;
        gap: 5px;
        white-space: normal;
      }
    }
  </style>
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
    const vscode = acquireVsCodeApi();
    let initial = ${serializedEntity};
    const state = {
      helpTopics: ${serializedHelpTopics},
      semantic: ${serializedSemantic}
    };
    const form = document.getElementById('form');
    const errors = document.getElementById('errors');

    document.getElementById('save').addEventListener('click', () => {
      const entity = collectEntity();
      if (entity) {
        vscode.postMessage({ type: 'save', entity });
      }
    });
    document.getElementById('openRaw').addEventListener('click', () => {
      vscode.postMessage({ type: 'openRaw' });
    });
    document.getElementById('archiveEntity')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'archiveEntity' });
    });
    form.addEventListener('input', () => vscode.postMessage({ type: 'draftState', dirty: true }));
    form.addEventListener('change', () => vscode.postMessage({ type: 'draftState', dirty: true }));
    document.querySelectorAll('[data-open-entity]').forEach(button => {
      button.addEventListener('click', () => {
        vscode.postMessage({ type: 'openEntity', entityId: button.dataset.openEntity });
      });
    });
    document.querySelectorAll('[data-set-milestone-task]').forEach(button => {
      button.addEventListener('click', () => {
        vscode.postMessage({
          type: 'setMilestoneTask',
          taskId: button.dataset.setMilestoneTask,
          assigned: button.dataset.assigned === 'true'
        });
      });
    });
    document.getElementById('addMilestoneTask')?.addEventListener('click', () => {
      const taskId = document.getElementById('milestoneTaskToAdd')?.value;
      if (taskId) vscode.postMessage({ type: 'setMilestoneTask', taskId, assigned: true });
    });
    window.addEventListener('message', event => {
      if (event.data?.type === 'validation') {
        renderErrors(event.data.errors || []);
      }
      if (event.data?.type === 'updateEditor' || event.data?.type === 'saved') {
        applyPayload(event.data.payload);
        if (event.data?.type === 'saved') renderErrors([]);
      }
      if (event.data?.type === 'updateSemantic') {
        state.semantic = event.data.semantic;
        renderSemantic(state.semantic);
      }
      if (event.data?.type === 'conflict') {
        renderConflict(event.data);
      }
    });

    function applyPayload(payload) {
      if (!payload?.entity) return;
      initial = payload.entity;
      for (const element of form.elements) {
        if (!element.name || element.type === 'checkbox') continue;
        const value = initial[element.name];
        if (element.name === 'tags') {
          element.value = Array.isArray(value) ? value.join(', ') : '';
        } else if (element.name === 'links') {
          element.value = value ? JSON.stringify(value, null, 2) : '';
        } else if (element.name === 'dueDate' || element.name === 'targetDate') {
          element.value = String(value || '').slice(0, 10);
        } else {
          element.value = value ?? '';
        }
      }
      document.querySelectorAll('[data-dependency]').forEach(input => {
        input.checked = Array.isArray(initial.dependsOn) && initial.dependsOn.includes(input.value);
      });
      if (payload.semantic) {
        state.semantic = payload.semantic;
        renderSemantic(state.semantic);
      }
      vscode.postMessage({ type: 'draftState', dirty: false });
    }

    function renderConflict(conflict) {
      const description = conflict.reason === 'deleted'
        ? 'This entity was deleted from disk while your editor was open. Your draft is still in this tab.'
        : 'This entity changed on disk while this editor has a draft. Your draft has not been overwritten.';
      errors.style.display = 'block';
      errors.innerHTML = '<strong>Save conflict</strong><p>' + escapeHtml(description) + '</p>'
        + '<div class="actions"><button type="button" id="reloadConflict" class="secondary">Reload from disk</button>'
        + '<button type="button" id="compareConflict" class="secondary">Open Markdown</button>'
        + (conflict.reason === 'changed' ? '<button type="button" id="retryConflict">Retry save</button>' : '')
        + '</div>';
      document.getElementById('reloadConflict')?.addEventListener('click', () => vscode.postMessage({ type: 'reload' }));
      document.getElementById('compareConflict')?.addEventListener('click', () => vscode.postMessage({ type: 'openRaw' }));
      document.getElementById('retryConflict')?.addEventListener('click', () => {
        const entity = collectEntity();
        if (entity) vscode.postMessage({ type: 'retrySave', entity });
      });
    }

    function collectEntity() {
      const entity = { ...initial };
      const validationErrors = [];
      for (const element of form.elements) {
        if (!element.name || element.type === 'checkbox') {
          continue;
        }
        entity[element.name] = element.value;
      }

      entity.tags = splitList(entity.tags);
      entity.dependsOn = Array.from(document.querySelectorAll('[data-dependency]:checked')).map(item => item.value);
      const links = parseJson(entity.links);
      if (!links.valid) {
        validationErrors.push('Links must be valid JSON.');
      }
      entity.links = links.value;

      if (entity.type !== 'task') {
        delete entity.dependsOn;
      }
      if (entity.type === 'milestone') {
        delete entity.tags;
      }

      if (validationErrors.length > 0) {
        renderErrors(validationErrors);
        return undefined;
      }

      return entity;
    }

    function splitList(value) {
      return String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }

    function parseJson(value) {
      const text = String(value || '').trim();
      if (!text) {
        return { valid: true, value: {} };
      }
      try {
        return { valid: true, value: JSON.parse(text) };
      } catch {
        return { valid: false, value: {} };
      }
    }

    function renderErrors(messages) {
      if (messages.length === 0) {
        errors.style.display = 'none';
        errors.innerHTML = '';
        return;
      }
      errors.style.display = 'block';
      errors.innerHTML = '<strong>Save blocked</strong><ul>' + messages.map(message => '<li>' + escapeHtml(message) + '</li>').join('') + '</ul>';
    }

    function renderSemantic(semantic) {
      const container = document.getElementById('semanticContent');
      if (!container || !semantic?.inspection) return;
      const inspection = semantic.inspection;
      const documentView = inspection.semantic;
      const criteria = documentView.criteria || [];
      const checked = criteria.filter(item => item.checked === true).length;
      const checkable = criteria.filter(item => item.checked !== null).length;
      const relationships = inspection.authoritative.relationships;
      const questions = documentView.questions || [];
      const findings = documentView.findings || [];
      const mentions = inspection.advisory.mentions || [];
      const suggestions = semantic.suggestions || [];
      const analysis = inspection.analysis;
      const progressLabel = checked + ' of ' + checkable + ' checkable acceptance criteria completed';

      container.innerHTML =
        '<div class="semanticHeader"><div><strong>Semantic inspection</strong>' +
          '<div class="semanticMeta">Shared PlanFS content profile · read-only view</div></div>' +
          '<div class="semanticActions"><button type="button" id="toggleSemanticAnalysis" class="secondary">' +
            (semantic.analysisEnabled ? 'Disable local analysis' : 'Enable local analysis') + '</button>' +
            (semantic.suppressedCount ? '<button type="button" id="restoreSemanticSuggestions" class="secondary">Restore ' + semantic.suppressedCount + ' dismissed</button>' : '') +
          '</div></div>' +
        renderRelationships(inspection.entity.type, relationships) +
        '<div class="semanticGroup"><div class="semanticRow"><h3>Acceptance criteria</h3>' +
          '<div class="semanticProgress"><span class="semanticBadge">' + checked + ' / ' + checkable + ' checked' +
          (criteria.length !== checkable ? ' · ' + (criteria.length - checkable) + ' ordinary' : '') + '</span>' +
          (checkable ? '<progress value="' + checked + '" max="' + checkable + '" aria-label="' + escapeHtml(progressLabel) + '"></progress>' : '') +
          '</div></div>' +
          (criteria.length ? criteria.map(renderCriterion).join('') : emptySemantic('No acceptance criteria found.')) +
        '</div>' +
        renderEntryGroup('Findings', findings, 'finding') +
        renderEntryGroup('Questions', questions, 'question') +
        renderDisclosureGroup('Ordered sections', documentView.sections.map(renderSectionSummary).join(''), documentView.sections.length) +
        '<div class="semanticGroup"><div class="semanticRow"><h3>Advisory suggestions</h3>' +
          (analysis ? '<span class="semanticBadge">' + escapeHtml(analysis.analyzer.id + '@' + analysis.analyzer.version + ' · ' + analysis.language) + '</span>' : '') +
          '</div>' +
          (!semantic.analysisEnabled ? emptySemantic('Local analysis is disabled for this workspace.') :
            suggestions.length ? suggestions.map(renderSuggestion).join('') : emptySemantic('No actionable suggestions.')) +
        '</div>' +
        renderDisclosureGroup('Advisory body mentions', mentions.map(renderMention).join(''), mentions.length) +
        renderDisclosureGroup(
          'Semantic diagnostics',
          inspection.diagnostics.map(renderSemanticDiagnostic).join(''),
          inspection.diagnostics.length,
          inspection.diagnostics.some(item => item.severity === 'error')
        );

      container.querySelectorAll('[data-source-start]').forEach(button => {
        button.addEventListener('click', () => vscode.postMessage({
          type: 'openSemanticSource',
          start: Number(button.dataset.sourceStart),
          end: Number(button.dataset.sourceEnd)
        }));
      });
      container.querySelectorAll('[data-dismiss-suggestion]').forEach(button => {
        button.addEventListener('click', () => vscode.postMessage({
          type: 'dismissSemanticSuggestion',
          key: button.dataset.dismissSuggestion
        }));
      });
      container.querySelectorAll('[data-preview-suggestion]').forEach(button => {
        button.addEventListener('click', () => vscode.postMessage({
          type: 'previewSemanticSuggestion',
          key: button.dataset.previewSuggestion
        }));
      });
      container.querySelectorAll('[data-apply-suggestion]').forEach(button => {
        button.addEventListener('click', () => vscode.postMessage({
          type: 'applySemanticSuggestion',
          key: button.dataset.applySuggestion
        }));
      });
      document.getElementById('toggleSemanticAnalysis')?.addEventListener('click', () => {
        vscode.postMessage({ type: 'toggleSemanticAnalysis', enabled: !semantic.analysisEnabled });
      });
      document.getElementById('restoreSemanticSuggestions')?.addEventListener('click', () => {
        vscode.postMessage({ type: 'restoreSemanticSuggestions' });
      });
    }

    function renderCriterion(criterion) {
      const stateClass = criterion.checked === true ? 'checked' : criterion.checked === false ? 'unchecked' : 'uncheckable';
      const mark = criterion.checked === true ? '[x]' : criterion.checked === false ? '[ ]' : '[-]';
      const stateLabel = criterion.checked === null ? 'ordinary list item' : criterion.checked ? 'checked' : 'unchecked';
      return '<div class="semanticItem ' + stateClass + '"><span class="semanticMark" aria-label="' + stateLabel + '">' + mark + '</span>' +
        '<div><div class="semanticText">' + escapeHtml(criterion.text) + '</div><div class="semanticMeta">' + escapeHtml(criterion.provenance) + ' · ' + stateLabel + '</div></div>' +
        sourceButton(criterion.range) + '</div>';
    }

    function renderEntryGroup(title, entries, kind) {
      if (!entries.length) return '';
      return '<div class="semanticGroup"><h3>' + title + '</h3>' +
        entries.map(entry => '<div class="semanticItem"><span class="semanticMark">' + (kind === 'question' ? '?' : '•') + '</span>' +
          '<div><div class="semanticText">' + escapeHtml(entry.text) + '</div><div class="semanticMeta">' + escapeHtml(entry.provenance) + '</div></div>' +
          sourceButton(entry.range) + '</div>').join('') + '</div>';
    }

    function renderSectionSummary(section) {
      const preview = section.text ? '<div class="semanticMeta semanticSectionPreview">' + escapeHtml(section.text) + '</div>' : '';
      const expansion = section.text && section.text.length > 180
        ? '<details class="semanticPreviewDisclosure"><summary>Expand preview</summary><div class="semanticFullPreview">' + escapeHtml(section.text) + '</div></details>'
        : '';
      return '<div class="semanticItem"><span class="semanticMark">' + (section.index + 1) + '</span><div>' +
        '<div class="semanticText">' + escapeHtml(section.heading) + ' <span class="semanticBadge">' + escapeHtml(section.key || 'custom') + '</span></div>' +
        '<div class="semanticMeta">' + escapeHtml(section.provenance + ' · ' + section.contentShape) + '</div>' +
        preview + expansion + '</div>' +
        sourceButton(section.headingRange) + '</div>';
    }

    function renderSuggestion(suggestion) {
      const conclusion = suggestion.conclusion;
      const evidence = suggestion.evidence.length
        ? '<div class="semanticEvidence">Evidence: ' + suggestion.evidence.map(escapeHtml).join(' · ') + '</div>'
        : '';
      const preview = conclusion.repair.previewable
        ? '<button type="button" class="semanticLink" data-preview-suggestion="' + escapeHtml(suggestion.key) + '">Preview change</button>'
        : '';
      const application = suggestion.application;
      const apply = application
        ? '<button type="button" data-apply-suggestion="' + escapeHtml(suggestion.key) + '">Apply…</button>'
        : '';
      const explanation = application
        ? '<details class="semanticExplanation"><summary>Why this suggestion?</summary><p>' +
          escapeHtml(application.explanation) + ' Evidence remains advisory. Exact metadata change: ' +
          escapeHtml(application.exactChange) + '. Only your confirmation authorizes this edit.</p></details>'
        : '<details class="semanticExplanation"><summary>Why no Apply button?</summary><p>This signal is ambiguous, unsupported, already represented, or does not map to an existing compatible PlanFS entity. Review the source manually.</p></details>';
      return '<div class="semanticItem semanticSuggestion"><span class="semanticMark">~</span><div>' +
        '<div class="semanticText">' + escapeHtml(conclusion.message) + '</div>' +
        '<div class="semanticMeta">Advisory · ' + escapeHtml(conclusion.provenance) + ' · ' + escapeHtml(conclusion.repair.summary) + '</div></div>' +
        '<div class="semanticActions">' + sourceButton(conclusion.range) + preview + apply +
          '<button type="button" class="semanticLink" data-dismiss-suggestion="' + escapeHtml(suggestion.key) + '">Dismiss</button></div>' + evidence + explanation + '</div>';
    }

    function renderMention(mention) {
      return '<div class="semanticItem"><span class="semanticMark">~</span><div><div class="semanticText">' + escapeHtml(mention.id) + '</div>' +
        '<div class="semanticMeta">Non-authoritative prose mention · ' + escapeHtml(mention.form) + ' · ' + escapeHtml(mention.provenance) + '</div></div>' +
        sourceButton(mention.range) + '</div>';
    }

    function renderSemanticDiagnostic(diagnostic) {
      const range = diagnostic.range;
      return '<div class="semanticItem semanticDiagnostic ' + escapeHtml(diagnostic.severity) + '"><span class="semanticMark">!</span><div>' +
        '<div class="semanticText">' + escapeHtml(diagnostic.message) + '</div>' +
        '<div class="semanticMeta">' + escapeHtml(diagnostic.code + ' · ' + diagnostic.provenance + ' · ' + diagnostic.repair.summary) + '</div></div>' +
        (range ? sourceButton(range) : '') + '</div>';
    }

    function renderRelationships(entityType, relationships) {
      const boxes = entityType === 'task'
        ? [
            relationshipBox('Depends on', relationships.dependsOn),
            relationshipBox('Epic', relationships.epic),
            relationshipBox('Milestone', relationships.milestone)
          ]
        : entityType === 'decision'
          ? [
              relationshipBox('Supersedes', relationships.supersedes),
              relationshipBox('Superseded by', relationships.supersededBy)
            ]
          : [];
      if (!boxes.length) return '';
      return '<div class="semanticGroup semanticAuthoritative"><h3>Authoritative relationships</h3><div class="relationshipGrid">' + boxes.join('') + '</div></div>';
    }

    function renderDisclosureGroup(title, content, count, open) {
      if (!count) return '';
      return '<details class="semanticGroup semanticDisclosure"' + (open ? ' open' : '') + '><summary><span>' + escapeHtml(title) + '</span>' +
        '<span class="semanticBadge">' + count + '</span></summary><div class="semanticDisclosureBody">' + content + '</div></details>';
    }

    function relationshipBox(label, value) {
      const display = Array.isArray(value) ? (value.join(', ') || 'None') : (value || 'None');
      return '<div class="relationshipBox" aria-label="Authoritative ' + escapeHtml(label) + '"><div class="semanticMeta">' + label + '</div><div class="semanticText">' + escapeHtml(display) + '</div></div>';
    }

    function sourceButton(range) {
      return '<button type="button" class="semanticLink" data-source-start="' + range.start.offset + '" data-source-end="' + range.end.offset + '">Open source</button>';
    }

    function emptySemantic(message) {
      return '<p class="subtle">' + escapeHtml(message) + '</p>';
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }
    renderSemantic(state.semantic);
    ${HELP_SCRIPT}
  </script>
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

function escapeScriptJson(json: string): string {
  return json.replace(/</g, '\\u003c');
}

function toDateInput(value?: string): string {
  return String(value ?? '').slice(0, 10);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
