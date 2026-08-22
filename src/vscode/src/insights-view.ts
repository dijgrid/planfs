/**
 * Insights webview presentation.
 */

import * as vscode from 'vscode';
import { renderHelpPanel } from './help';
import { renderInsightsBrowserScript } from './insights-view-script';
import { INSIGHTS_VIEW_STYLES } from './insights-view-styles';
import { getNonce } from './webview';
import type { InsightsPayload } from './insights';

export function renderInsights(webview: vscode.Webview, payload: InsightsPayload): string {
  const nonce = getNonce();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>PlanFS Insights</title>
  <style>
${INSIGHTS_VIEW_STYLES}  </style>
</head>
<body>
  <div class="shell">
    <header class="header">
      <div>
        <h1>PlanFS Insights</h1>
        <div class="subtle">Dependency graph, roadmap timeline, and project reports from .planfs.</div>
      </div>
    </header>

    <nav class="tabs" aria-label="Insights views">
      <button class="tab active" data-tab="timeline">Timeline</button>
      <button class="tab" data-tab="graph">Dependency Graph</button>
      <button class="tab" data-tab="reports">Reports</button>
      <button class="tab" data-tab="branch">Branch</button>
    </nav>

    <section id="timeline" class="panel active"></section>
    <section id="graph" class="panel"></section>
    <section id="reports" class="panel"></section>
    <section id="branch" class="panel"></section>
  </div>
  ${renderHelpPanel()}

  <script nonce="${nonce}">
${renderInsightsBrowserScript(payload)}  </script>
</body>
</html>`;
}
