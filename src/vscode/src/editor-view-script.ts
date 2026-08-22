/**
 * Browser-side behavior for the editor webview.
 */

import { HELP_SCRIPT } from './help';
import type { EditorPayload } from './editor';

export function renderEditorBrowserScript(payload: EditorPayload): string {
  const serializedEntity = escapeScriptJson(JSON.stringify(payload.entity));
  const serializedHelpTopics = escapeScriptJson(JSON.stringify(payload.helpTopics));
  const serializedSemantic = escapeScriptJson(JSON.stringify(payload.semantic));
  return `    const vscode = acquireVsCodeApi();
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
`;
}

function escapeScriptJson(json: string): string {
  return json.replace(/</g, '\\u003c');
}
