type Listener<T> = (event: T) => unknown;

export class Uri {
  constructor(public readonly fsPath: string) {}

  static file(fsPath: string): Uri {
    return new Uri(fsPath);
  }

  toString(): string {
    return `file://${this.fsPath}`;
  }
}

export interface WorkspaceFolder {
  uri: Uri;
  name: string;
  index: number;
}

export class EventEmitter<T> {
  private listeners: Array<Listener<T>> = [];
  readonly event = (listener: Listener<T>): { dispose: () => void } => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        this.listeners = this.listeners.filter(candidate => candidate !== listener);
      }
    };
  };

  fire(event: T): void {
    this.listeners.forEach(listener => listener(event));
  }
}

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2
} as const;

export class TreeItem {
  description?: string;
  iconPath?: ThemeIcon;
  contextValue?: string;
  command?: unknown;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: number
  ) {}
}

export class ThemeIcon {
  constructor(
    public readonly id: string,
    public readonly color?: ThemeColor
  ) {}
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export const ViewColumn = {
  One: 1
} as const;

class MockWebview {
  html = '';
  readonly cspSource = 'vscode-webview:';
  private messageListener: Listener<unknown> | undefined;

  onDidReceiveMessage(listener: Listener<unknown>): { dispose: () => void } {
    this.messageListener = listener;
    return { dispose: () => undefined };
  }

  async postMessage(message: unknown): Promise<boolean> {
    await this.messageListener?.(message);
    return true;
  }
}

class MockWebviewPanel {
  readonly webview = new MockWebview();
  private disposeListener: (() => unknown) | undefined;

  reveal = jest.fn();

  onDidDispose(listener: () => unknown): { dispose: () => void } {
    this.disposeListener = listener;
    return { dispose: () => undefined };
  }

  dispose(): void {
    this.disposeListener?.();
  }
}

function containsPath(folderPath: string, filePath: string): boolean {
  return filePath === folderPath || filePath.startsWith(`${folderPath}/`);
}

export const workspace: {
  workspaceFolders: WorkspaceFolder[] | undefined;
  getWorkspaceFolder: jest.Mock<WorkspaceFolder | undefined, [Uri]>;
  createFileSystemWatcher: jest.Mock;
  openTextDocument: jest.Mock;
} = {
  workspaceFolders: undefined,
  getWorkspaceFolder: jest.fn((uri: Uri) =>
    workspace.workspaceFolders?.find(folder => containsPath(folder.uri.fsPath, uri.fsPath))
  ),
  createFileSystemWatcher: jest.fn(() => ({
    onDidCreate: jest.fn(),
    onDidChange: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn()
  })),
  openTextDocument: jest.fn(async filePath => ({ fileName: filePath }))
};

export const window = {
  createWebviewPanel: jest.fn(() => new MockWebviewPanel()),
  registerTreeDataProvider: jest.fn(),
  registerFileDecorationProvider: jest.fn(() => ({ dispose: jest.fn() })),
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showInputBox: jest.fn(),
  showTextDocument: jest.fn()
};

export const commands = {
  registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
  executeCommand: jest.fn()
};

export const env = {
  clipboard: {
    writeText: jest.fn()
  }
};
