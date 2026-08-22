/**
 * Styles for the editor webview.
 */

import { HELP_STYLES } from './help';

export const EDITOR_VIEW_STYLES = `    :root {
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
`;
