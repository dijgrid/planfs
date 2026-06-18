import * as vscode from 'vscode';

export class PlanFSDecorationProvider implements vscode.FileDecorationProvider {
  provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    if (uri.path.split('/').pop() !== '.planfs') {
      return undefined;
    }

    return new vscode.FileDecoration(
      'P',
      'PlanFS planning repository',
      new vscode.ThemeColor('charts.orange')
    );
  }
}
