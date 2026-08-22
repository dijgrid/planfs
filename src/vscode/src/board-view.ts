/**
 * Board webview presentation.
 */

import * as vscode from 'vscode';
import { renderHelpButton, renderHelpPanel } from './help';
import { renderBoardBrowserScript } from './board-view-script';
import { BOARD_VIEW_STYLES } from './board-view-styles';
import { getNonce } from './webview';
import type { BoardMode, BoardPayload } from './board';

export function renderBoard(
  webview: vscode.Webview,
  payload: BoardPayload,
  initialMode: BoardMode = 'status'
): string {
  const nonce = getNonce();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>PlanFS Board</title>
  <style>
${BOARD_VIEW_STYLES}  </style>
</head>
<body>
  <div class="shell">
    <header class="header">
      <div>
        <h1>PlanFS Board</h1>
        <div class="subtle">Drag cards between statuses. Changes are saved to .planfs task files.</div>
      </div>
      ${renderHelpButton('board', 'Show help for the board')}
    </header>
    <div class="toolbar">
      <input id="filter" type="search" placeholder="Filter by ID, title, assignee, epic, milestone, or tag" aria-label="Filter tasks">
      <div class="modeSwitch" role="tablist" aria-label="Board view">
        <button type="button" class="modeTab active" role="tab" aria-selected="true" data-mode="status">Status Board</button>
        <button type="button" class="modeTab" role="tab" aria-selected="false" data-mode="next-work">Next Work</button>
      </div>
      <select id="boardScope" aria-label="Board scope">
        <option value="actionable">Actionable</option>
        <option value="all-open">All open</option>
        <option value="backlog">Backlog</option>
        <option value="saved-filter">Saved filter</option>
      </select>
      <select id="savedFilter" aria-label="Saved filter">
        <option value="">All tasks</option>
      </select>
      <button type="button" id="saveFilter">Save filter</button>
      <button type="button" id="manageFilter">Manage filter</button>
      <select id="milestoneFocus" aria-label="Milestone focus">
        <option value="">All milestones</option>
      </select>
      <button type="button" id="clearMilestoneFocus" hidden>Clear milestone</button>
      <select id="group" aria-label="Group tasks">
        <option value="none">No grouping</option>
        <option value="epic">Group by epic</option>
        <option value="milestone">Group by milestone</option>
        <option value="assignee">Group by assignee</option>
        <option value="priority">Group by priority</option>
      </select>
      <select id="sort" aria-label="Sort tasks">
        <option value="id">Sort by ID</option>
        <option value="title">Sort by title</option>
        <option value="priority">Sort by priority</option>
        <option value="assignee">Sort by assignee</option>
      </select>
    </div>
    <div id="bulkBar" class="bulkBar" aria-live="polite">
      <strong id="bulkCount">0 selected</strong>
      <select id="bulkAction" aria-label="Bulk action">
        <option value="status">Set status</option>
        <option value="assignee">Set assignee</option>
        <option value="milestone">Set milestone</option>
        <option value="priority">Set priority</option>
        <option value="estimate">Set estimate</option>
      </select>
      <button type="button" id="bulkApply">Apply</button>
      <button type="button" id="bulkClear">Clear</button>
    </div>
    <div id="scopeNotice" class="subtle" aria-live="polite"></div>
    <div id="content" class="content">
      <div class="boardRegion">
        <main id="board" class="board"></main>
      </div>
      <aside id="details" class="detailsDrawer" aria-live="polite"></aside>
    </div>
  </div>
  ${renderHelpPanel()}
  <script nonce="${nonce}">
${renderBoardBrowserScript(payload, initialMode)}  </script>
</body>
</html>`;
}
