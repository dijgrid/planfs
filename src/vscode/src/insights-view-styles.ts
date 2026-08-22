/**
 * Styles for the insights webview.
 */

import { HELP_STYLES } from './help';

export const INSIGHTS_VIEW_STYLES = `    :root {
      color-scheme: light dark;
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
      --critical: #d16363;
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
      gap: 16px;
      align-items: end;
      margin-bottom: 16px;
    }

    h1 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 650;
    }

    .subtle {
      color: var(--muted);
    }

    .tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 14px;
      border-bottom: 1px solid var(--border);
    }

    .tab {
      border: 0;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      background: transparent;
      padding: 8px 10px;
      cursor: pointer;
    }

    .tab.active {
      color: var(--text);
      border-bottom-color: var(--accent);
    }

    .panel {
      display: none;
    }

    .panel.active {
      display: block;
    }

    .metrics,
    .reportGrid,
    .timeline {
      display: grid;
      gap: 12px;
    }

    .metrics {
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      margin-bottom: 14px;
    }

    .metric,
    .card,
    .milestone,
    .node {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 6px;
    }

    .metric {
      padding: 12px;
    }

    .metric strong {
      display: block;
      font-size: 20px;
      margin-bottom: 4px;
    }

    .graphTools,
    .timelineTools {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .graphTools input,
    .timelineTools input {
      min-width: 220px;
      flex: 1 1 260px;
    }

    .graphStage {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      overflow: auto;
      margin-bottom: 12px;
    }

    .graphSvg {
      display: block;
      min-width: 920px;
      width: 100%;
      height: auto;
      transform-origin: top left;
    }

    .graphEdge {
      stroke: color-mix(in srgb, var(--muted) 70%, transparent);
      stroke-width: 1.5;
      fill: none;
    }

    .graphEdge.related {
      stroke: var(--accent);
      stroke-width: 2.6;
    }

    .graphEdge.downstream {
      stroke: var(--done);
    }

    .graphNode rect {
      fill: var(--vscode-input-background);
      stroke: var(--border);
      stroke-width: 1;
      rx: 6;
    }

    .graphNode.in-progress rect {
      stroke: var(--progress);
    }

    .graphNode.review rect {
      stroke: var(--review);
    }

    .graphNode.done rect {
      stroke: var(--done);
    }

    .graphNode.selected rect {
      stroke: var(--accent);
      stroke-width: 2.5;
    }

    .graphNode.dim {
      opacity: 0.3;
    }

    .graphNode text {
      fill: var(--text);
      font-size: 12px;
      pointer-events: none;
    }

    .graphNode .metaText {
      fill: var(--muted);
      font-size: 10px;
    }

    .epicLaneLabel {
      fill: var(--muted);
      font-size: 11px;
      font-weight: 600;
    }

    .selectedDetails {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
    }

    .legend {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 0 0 12px;
      color: var(--muted);
    }

    .legendItem {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 3px 8px;
      background: color-mix(in srgb, var(--panel-strong) 40%, transparent);
    }

    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--todo);
    }

    .swatch.progress { background: var(--progress); }
    .swatch.review { background: var(--review); }
    .swatch.done { background: var(--done); }
    .swatch.warning { background: var(--critical); }

    .nodeHead {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .nodeTitle {
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .lane {
      color: var(--muted);
      font-size: 11px;
    }

    .warningList {
      margin-top: 16px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
    }

    .timelineAxis {
      position: relative;
      min-height: 420px;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      padding: 18px 24px 54px;
    }

    .timelineCanvas {
      position: relative;
      min-width: 980px;
      height: 340px;
    }

    .tabIntro {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      margin: 0 0 12px;
      color: var(--muted);
      line-height: 1.45;
    }

    .axisLine,
    .nowLine {
      position: absolute;
      left: 0;
      right: 0;
      top: 168px;
      height: 1px;
      background: var(--border);
    }

    .nowLine {
      width: 2px;
      right: auto;
      top: 0;
      height: 318px;
      background: var(--accent);
    }

    .nowLabel {
      position: absolute;
      top: 322px;
      transform: translateX(-50%);
      color: var(--accent);
      font-size: 11px;
      font-weight: 600;
    }

    .tick {
      position: absolute;
      top: 152px;
      width: 1px;
      height: 32px;
      background: var(--border);
    }

    .tick span {
      position: absolute;
      top: 36px;
      transform: translateX(-50%);
      color: var(--muted);
      font-size: 10px;
      white-space: nowrap;
    }

    .timelineItem {
      position: absolute;
      width: 132px;
      min-height: 42px;
      transform: translateX(-50%);
      padding: 6px 7px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--vscode-input-background);
      box-shadow: 0 2px 8px color-mix(in srgb, black 14%, transparent);
      color: var(--text);
      text-align: left;
      cursor: pointer;
    }

    .timelineItem.compact {
      width: 96px;
      min-height: 30px;
      padding: 5px 6px;
    }

    .timelineItem.compact .timelineTitle,
    .timelineItem.compact .timelineProgress,
    .timelineItem.compact .timelineDate {
      display: none;
    }

    .timelineItem.detailed {
      width: 150px;
    }

    .timelineItem.task {
      border-left: 4px solid var(--progress);
    }

    .timelineItem.epic {
      border-left: 4px solid var(--review);
    }

    .timelineItem.milestone {
      border-left: 4px solid var(--done);
    }

    .timelineItem.overdue {
      border-color: var(--critical);
    }

    .timelineItem.selected {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
    }

    .timelineItem.undated {
      border-style: dashed;
    }

    .timelineItemStatic {
      width: 100%;
      color: var(--text);
      text-align: left;
      background: var(--panel);
      border-color: var(--border);
    }

    .timelineTitle {
      overflow-wrap: anywhere;
      line-height: 1.25;
      margin-top: 3px;
      font-size: 12px;
    }

    .undatedRail {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }

    .timelineGroup {
      margin-bottom: 14px;
    }

    .timelineGroup h2 {
      margin: 0 0 8px;
      font-size: 14px;
    }

    .milestone,
    .card {
      padding: 12px;
    }

    .bar {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: color-mix(in srgb, var(--muted) 25%, transparent);
      margin: 10px 0;
    }

    .fill {
      height: 100%;
      background: linear-gradient(90deg, var(--progress), var(--done));
    }

    .row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    input,
    button {
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--border));
      border-radius: 3px;
      padding: 6px 8px;
      min-height: 28px;
    }

    button {
      cursor: pointer;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    ${HELP_STYLES}

    .reportGrid {
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }

    .branchGrid {
      display: grid;
      grid-template-columns: minmax(280px, 1.1fr) minmax(280px, 0.9fr);
      gap: 12px;
      align-items: start;
    }

    .pillRow {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .pill {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 3px 8px;
      color: var(--text);
      background: color-mix(in srgb, var(--panel-strong) 48%, transparent);
      font-size: 12px;
    }

    .fileList {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }

    .fileRow {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 8px;
      align-items: start;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .filePath {
      overflow-wrap: anywhere;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      text-align: left;
      padding: 7px 6px;
      border-bottom: 1px solid var(--border);
    }

    th {
      color: var(--muted);
      font-weight: 500;
    }
`;
