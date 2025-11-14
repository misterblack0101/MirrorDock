import * as vscode from 'vscode';
import { ScrcpyViewProvider } from './ScrcpyViewProvider';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Scrcpy extension is now active');

    // Create the view provider
    const provider = new ScrcpyViewProvider(context.extensionUri);

    // Register the webview view provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'scrcpy.deviceView',
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('scrcpy.start', () => {
            provider.start();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('scrcpy.stop', () => {
            provider.stop();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('scrcpy.restart', () => {
            provider.restart();
        })
    );
}

/**
 * Extension deactivation cleanup
 */
export function deactivate() {
    console.log('Scrcpy extension is now deactivated');
}
