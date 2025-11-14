import * as vscode from 'vscode';
import { AndroidViewProvider } from './AndroidViewProvider';

// Extension entry point - registers WebView panel and commands
export function activate(context: vscode.ExtensionContext) {
    const provider = new AndroidViewProvider(context.extensionUri);

    // Register WebView panel in activity bar
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'mirrordock.deviceView',
            provider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('mirrordock.start', () => provider.start())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mirrordock.stop', () => provider.stop())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mirrordock.restart', () => provider.restart())
    );
}

export function deactivate() { }
