/**
 * Styles for the board webview.
 */

import { HELP_STYLES } from './help';

export const BOARD_VIEW_STYLES = `    :root {
      color-scheme: light dark;
      --gap: 12px;
      --column-width: minmax(220px, 1fr);
      --bg: var(--vscode-editor-background);
      --panel: color-mix(in srgb, var(--vscode-sideBar-background) 88%, var(--vscode-editor-background));
      --panel-strong: color-mix(in srgb, var(--vscode-sideBar-background) 72%, var(--vscode-focusBorder));
      --border: var(--vscode-panel-border);
      --text: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --accent: var(--vscode-focusBorder);
      --todo: #7f8a99;
      --progress: #4d9de0;
      --review: #d9a441;
      --done: #58a66c;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 18px;
      color: var(--text);
      background: var(--bg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .shell {
      max-width: 1280px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 16px;
      margin-bottom: 14px;
    }

    h1 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 650;
    }

    .subtle {
      color: var(--muted);
    }

    .toolbar {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .bulkBar {
      display: none;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 6px;
      margin: -4px 0 16px;
      padding: 8px 10px;
    }

    .bulkBar.active {
      display: flex;
      flex-wrap: wrap;
    }

    .bulkBar button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 4px 8px;
      font: inherit;
      cursor: pointer;
    }

    input,
    select {
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 3px;
      padding: 6px 8px;
      min-height: 28px;
    }

    input {
      min-width: 240px;
      flex: 1 1 260px;
    }

    .modeSwitch {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      min-height: 34px;
    }

    .modeTab {
      color: var(--text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 5px 10px;
      min-height: 26px;
      font: inherit;
      cursor: pointer;
    }

    .modeTab:hover {
      background: color-mix(in srgb, var(--accent) 10%, transparent);
    }

    .modeTab.active {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
      font-weight: 600;
    }

    .modeTab:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(4, var(--column-width));
      gap: var(--gap);
      align-items: start;
      min-width: 920px;
    }

    .board.nextWork {
      grid-template-columns: repeat(5, var(--column-width));
      min-width: 1080px;
    }

    .swimlanes {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      min-width: 920px;
    }

    .swimlane {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: color-mix(in srgb, var(--panel) 72%, transparent);
      overflow: hidden;
    }

    .swimlaneHeader {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--panel-strong);
    }

    .swimlaneTitle {
      font-weight: 650;
      overflow-wrap: anywhere;
    }

    .swimlaneMeta {
      color: var(--muted);
      white-space: nowrap;
    }

    .swimlaneBoard {
      display: grid;
      grid-template-columns: repeat(4, var(--column-width));
      gap: var(--gap);
      align-items: start;
      padding: 10px;
    }

    .content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, var(--details-width, 340px));
      gap: var(--gap);
      align-items: start;
    }

    .content.detailsHidden {
      grid-template-columns: minmax(0, 1fr);
    }

    .boardRegion {
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .detailsDrawer {
      position: sticky;
      top: 18px;
      align-self: start;
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 6px;
      min-height: 220px;
      overflow: hidden;
    }

    .content.detailsHidden .detailsDrawer {
      display: none;
    }

    .detailsResizeHandle {
      position: absolute;
      top: 0;
      bottom: 0;
      left: -5px;
      width: 10px;
      cursor: col-resize;
      z-index: 1;
    }

    .detailsResizeHandle::after {
      content: '';
      position: absolute;
      top: 12px;
      bottom: 12px;
      left: 4px;
      border-left: 2px solid transparent;
    }

    .detailsResizeHandle:hover::after,
    .detailsResizeHandle:focus-visible::after {
      border-left-color: var(--accent);
    }

    .detailsHeader {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: start;
      border-bottom: 1px solid var(--border);
      background: var(--panel-strong);
      padding: 12px;
    }

    .detailsHeader h2 {
      margin: 0 0 4px;
      font-size: 15px;
      line-height: 1.25;
    }

    .detailsHeaderActions {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .iconButton {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      color: var(--text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 3px;
      font: inherit;
      cursor: pointer;
    }

    .iconButton:hover,
    .iconButton:focus-visible,
    .iconButton.active {
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      border-color: var(--border);
      outline: none;
    }

    .detailsBody {
      padding: 12px;
      display: grid;
      gap: 12px;
    }

    .detailsDrawer.compact .detailsBody {
      gap: 8px;
      padding: 10px;
    }

    .detailsDrawer.compact .detailSection {
      display: none;
    }

    .detailsDrawer.compact .detailSection:first-of-type {
      display: block;
    }

    .detailGrid {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 6px 10px;
      align-items: baseline;
    }

    .detailLabel {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }

    .detailValue {
      overflow-wrap: anywhere;
    }

    .detailSection h3 {
      margin: 0 0 6px;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--muted);
      letter-spacing: 0;
    }

    .detailActions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .detailActions button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 4px 8px;
      font: inherit;
      cursor: pointer;
    }

    .column {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 6px;
      min-height: 220px;
      overflow: hidden;
    }

    .columnHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 11px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--panel-strong);
      font-weight: 600;
      text-transform: capitalize;
    }

    .columnHeader button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 2px 6px;
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      text-transform: none;
    }

    .count {
      color: var(--muted);
      font-weight: 400;
    }

    .dropzone {
      min-height: 180px;
      padding: 10px;
    }

    .dropzone.dragOver {
      outline: 2px solid var(--accent);
      outline-offset: -2px;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }

    .card {
      cursor: grab;
      border: 1px solid var(--border);
      border-left: 4px solid var(--todo);
      background: var(--bg);
      padding: 11px;
      margin-bottom: 9px;
      border-radius: 4px;
      box-shadow: 0 1px 2px color-mix(in srgb, #000 16%, transparent);
    }

    .card.in-progress {
      border-left-color: var(--progress);
    }

    .card.review {
      border-left-color: var(--review);
    }

    .card.done {
      border-left-color: var(--done);
    }

    .card.selected {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }

    .card.bulkSelected {
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 65%, transparent);
    }

    .card:active {
      cursor: grabbing;
    }

    .bulkSelect {
      float: right;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--muted);
      font-size: 11px;
      cursor: pointer;
    }

    .bulkSelect input {
      min-width: 0;
      flex: none;
    }

    .cardId {
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 5px;
    }

    .cardTitle {
      font-weight: 600;
      line-height: 1.35;
      margin-bottom: 8px;
      overflow-wrap: anywhere;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .badge {
      border: 1px solid var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 11px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge.reason {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 18%, var(--vscode-badge-background));
    }

    .quickActions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
    }

    .quickActions button,
    .badgeButton {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid var(--vscode-button-background);
      border-radius: 3px;
      padding: 4px 7px;
      font: inherit;
      cursor: pointer;
    }

    .badgeButton {
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
      border-color: var(--vscode-badge-background);
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 11px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      color: var(--muted);
      font-style: italic;
      padding: 10px 0;
    }

    .terminalSummary {
      border-top: 1px solid var(--border);
      color: var(--muted);
      display: grid;
      gap: 6px;
      margin-top: 8px;
      padding-top: 10px;
    }

    .terminalSummary button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
      border: 1px solid var(--vscode-button-secondaryBackground, var(--vscode-button-background));
      border-radius: 3px;
      padding: 4px 7px;
      font: inherit;
      cursor: pointer;
      justify-self: start;
    }

    ${HELP_STYLES}

    @media (max-width: 980px) {
      .content {
        grid-template-columns: 1fr;
      }

      .detailsDrawer {
        position: static;
      }
    }
`;
