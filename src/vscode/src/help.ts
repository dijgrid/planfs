import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseFrontmatter } from 'planfs-core';

export type HelpContext =
  | 'backlog'
  | 'editor'
  | 'insights.timeline'
  | 'insights.graph'
  | 'insights.reports'
  | 'insights.branch';

export interface HelpTopic {
  context: HelpContext;
  title: string;
  summary: string;
  bodyHtml: string;
}

interface HelpTopicFile {
  context: HelpContext;
  fileName: string;
}

const HELP_TOPIC_FILES: HelpTopicFile[] = [
  { context: 'backlog', fileName: 'backlog.md' },
  { context: 'editor', fileName: 'editor.md' },
  { context: 'insights.timeline', fileName: 'insights-timeline.md' },
  { context: 'insights.graph', fileName: 'insights-graph.md' },
  { context: 'insights.reports', fileName: 'insights-reports.md' },
  { context: 'insights.branch', fileName: 'insights-branch.md' }
];

export function loadHelpTopics(extensionUri: vscode.Uri, contexts: HelpContext[]): HelpTopic[] {
  return contexts.map(context => loadHelpTopic(extensionUri, context));
}

export async function openHelpDocument(
  extensionUri: vscode.Uri,
  context: HelpContext
): Promise<void> {
  const topicFile = findTopicFile(context);
  const topicPath = path.join(extensionUri.fsPath, 'resources', 'help', topicFile.fileName);
  await vscode.commands.executeCommand(
    'vscode.open',
    vscode.Uri.file(topicPath)
  );
}

export function renderHelpButton(context: HelpContext, label: string): string {
  return `<button type="button" class="helpButton" data-help-context="${escapeHtml(context)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">?</button>`;
}

export function renderHelpPanel(): string {
  return [
    '<aside id="helpPanel" class="helpPanel" role="dialog" aria-live="polite" aria-label="Context help" hidden>',
    '<div class="helpPanelHeader">',
    '<h2 id="helpTitle">Help</h2>',
    '<button type="button" id="closeHelp" class="helpClose" aria-label="Close help">Close</button>',
    '</div>',
    '<div id="helpSummary" class="helpSummary"></div>',
    '<div id="helpBody" class="helpBody"></div>',
    '<button type="button" id="openHelpDocument" class="secondary">Open Markdown</button>',
    '</aside>'
  ].join('');
}

export const HELP_STYLES = `
    .helpButton {
      display: inline-grid;
      place-items: center;
      width: 26px;
      height: 26px;
      min-width: 26px;
      padding: 0;
      border-radius: 50%;
      font-weight: 700;
      line-height: 1;
    }

    .helpPanel {
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 20;
      width: min(360px, calc(100vw - 28px));
      max-height: calc(100vh - 28px);
      overflow: auto;
      padding: 14px;
      color: var(--text, var(--vscode-foreground));
      background: var(--panel, var(--vscode-editorWidget-background));
      border: 1px solid var(--border, var(--vscode-panel-border));
      border-radius: 6px;
      box-shadow: 0 8px 28px rgb(0 0 0 / 28%);
    }

    .helpPanel[hidden] {
      display: none;
    }

    .helpPanelHeader {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      margin-bottom: 8px;
    }

    .helpPanelHeader h2 {
      margin: 0;
      font-size: 15px;
    }

    .helpClose {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
      border-color: var(--vscode-button-secondaryBackground);
    }

    .helpSummary {
      color: var(--muted, var(--vscode-descriptionForeground));
      line-height: 1.45;
      margin-bottom: 10px;
    }

    .helpBody {
      display: grid;
      gap: 8px;
      margin-bottom: 12px;
      line-height: 1.45;
    }

    .helpBody p,
    .helpBody ul {
      margin: 0;
    }

    .helpBody ul {
      padding-left: 18px;
    }
`;

export const HELP_SCRIPT = `
    let activeHelpContext = '';
    document.addEventListener('click', event => {
      const helpButton = event.target.closest('[data-help-context]');
      if (helpButton) {
        event.preventDefault();
        showHelp(helpButton.dataset.helpContext);
      }
    });
    document.getElementById('closeHelp')?.addEventListener('click', () => hideHelp());
    document.getElementById('openHelpDocument')?.addEventListener('click', () => {
      if (activeHelpContext) {
        vscode.postMessage({ type: 'openHelpDocument', context: activeHelpContext });
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        hideHelp();
      }
    });

    function showHelp(context) {
      const topics = typeof state !== 'undefined'
        ? state.helpTopics
        : (typeof payload !== 'undefined' ? payload.helpTopics : []);
      const topic = (topics || []).find(item => item.context === context);
      const panel = document.getElementById('helpPanel');
      if (!topic || !panel) return;
      activeHelpContext = context;
      document.getElementById('helpTitle').textContent = topic.title;
      document.getElementById('helpSummary').textContent = topic.summary;
      document.getElementById('helpBody').innerHTML = topic.bodyHtml;
      panel.hidden = false;
      document.getElementById('closeHelp')?.focus();
    }

    function hideHelp() {
      const panel = document.getElementById('helpPanel');
      if (panel) {
        panel.hidden = true;
      }
      activeHelpContext = '';
    }
`;

function loadHelpTopic(extensionUri: vscode.Uri, context: HelpContext): HelpTopic {
  const topicFile = findTopicFile(context);
  const primaryPath = path.join(extensionUri.fsPath, 'resources', 'help', topicFile.fileName);
  const fallbackPath = path.join(__dirname, '..', 'resources', 'help', topicFile.fileName);
  const topicPath = fs.existsSync(primaryPath) ? primaryPath : fallbackPath;
  const content = fs.readFileSync(topicPath, 'utf8');
  const parsed = parseFrontmatter(content);
  const parsedContext = String(parsed.metadata.context ?? '');

  if (parsedContext !== context) {
    throw new Error(`Help topic ${topicFile.fileName} has context ${parsedContext || 'missing'}, expected ${context}`);
  }

  return {
    context,
    title: String(parsed.metadata.title ?? context),
    summary: String(parsed.metadata.summary ?? ''),
    bodyHtml: markdownBodyToHtml(parsed.body)
  };
}

function findTopicFile(context: HelpContext): HelpTopicFile {
  const topicFile = HELP_TOPIC_FILES.find(topic => topic.context === context);
  if (!topicFile) {
    throw new Error(`Unknown help context: ${context}`);
  }
  return topicFile;
}

function markdownBodyToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listItems: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#')) {
      continue;
    }

    if (line.startsWith('- ')) {
      listItems.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`);
      continue;
    }

    if (listItems.length > 0) {
      html.push(`<ul>${listItems.join('')}</ul>`);
      listItems = [];
    }

    if (line.trim()) {
      html.push(`<p>${escapeHtml(line.trim())}</p>`);
    }
  }

  if (listItems.length > 0) {
    html.push(`<ul>${listItems.join('')}</ul>`);
  }

  return html.join('');
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] ?? char));
}
