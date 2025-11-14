import * as vscode from 'vscode';
import { ScrcpyRunner } from './ScrcpyRunner';
import { WebViewMessage, TapInputMessage, SwipeInputMessage, LongPressInputMessage } from './types/messages';

/**
 * WebView provider for the scrcpy device panel
 */
export class ScrcpyViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private scrcpyRunner: ScrcpyRunner;
    private autoStart: boolean = false;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.scrcpyRunner = new ScrcpyRunner();
        this.setupScrcpyListeners();
    }

    /**
     * Resolve the webview view
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'webview')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message: WebViewMessage) => {
            await this.handleWebViewMessage(message);
        });

        // Handle visibility changes
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible && this.autoStart) {
                this.start();
            }
        });

        // Auto-start if configured
        if (this.autoStart) {
            this.start();
        }
    }

    /**
     * Handle messages from WebView
     */
    private async handleWebViewMessage(message: WebViewMessage): Promise<void> {
        switch (message.type) {
            case 'input':
                await this.handleInputMessage(message);
                break;
            case 'start':
                await this.start();
                break;
            case 'stop':
                this.stop();
                break;
        }
    }

    /**
     * Handle input events from WebView
     */
    private async handleInputMessage(
        message: TapInputMessage | SwipeInputMessage | LongPressInputMessage
    ): Promise<void> {
        switch (message.action) {
            case 'tap':
                await this.scrcpyRunner.tap(message.payload.x, message.payload.y);
                break;
            case 'swipe':
                await this.scrcpyRunner.swipe(
                    message.payload.x1,
                    message.payload.y1,
                    message.payload.x2,
                    message.payload.y2,
                    message.payload.duration
                );
                break;
            case 'longPress':
                await this.scrcpyRunner.longPress(
                    message.payload.x,
                    message.payload.y,
                    message.payload.duration
                );
                break;
        }
    }

    /**
     * Setup listeners for scrcpy events
     */
    private setupScrcpyListeners(): void {
        // Handle video frames
        this.scrcpyRunner.on('frame', (data: Buffer) => {
            if (this._view) {
                // Convert Buffer to array for JSON serialization
                const frameData = Array.from(data);
                this._view.webview.postMessage({
                    type: 'frame',
                    data: frameData
                });
            }
        });

        // Handle status changes
        this.scrcpyRunner.on('status', (status: string, message: string) => {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'status',
                    status: status,
                    message: message
                });
            }
        });
    }

    /**
     * Start scrcpy
     */
    public async start(): Promise<void> {
        this.autoStart = true;

        if (!this._view?.visible) {
            vscode.window.showInformationMessage('Opening Scrcpy Device panel...');
            return;
        }

        try {
            await this.scrcpyRunner.start();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to start scrcpy: ${message}`);
        }
    }

    /**
     * Stop scrcpy
     */
    public stop(): void {
        this.autoStart = false;
        this.scrcpyRunner.stop();
    }

    /**
     * Restart scrcpy
     */
    public async restart(): Promise<void> {
        this.stop();

        // Clear decoder state in WebView
        if (this._view) {
            this._view.webview.postMessage({
                type: 'clear'
            });
        }

        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.start();
    }

    /**
     * Get HTML content for webview
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'view.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'style.css')
        );
        const decoderScriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'h264', 'webcodecs-decoder.js')
        );

        // Use a nonce to whitelist which scripts can be run
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
        style-src ${webview.cspSource} 'unsafe-inline'; 
        script-src 'nonce-${nonce}' ${webview.cspSource};
        img-src ${webview.cspSource} data:;
        connect-src ${webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <title>Scrcpy Device</title>
</head>
<body>
    <div id="container">
        <div id="status-bar">
            <span id="status-text">Not connected</span>
            <button id="start-btn" class="btn">Start</button>
        </div>
        <div id="canvas-container">
            <canvas id="screen-canvas"></canvas>
            <div id="loading">
                <div class="spinner"></div>
                <p>Connecting to device...</p>
            </div>
        </div>
    </div>
    
    <script nonce="${nonce}" src="${decoderScriptUri}"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Generate a nonce for CSP
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Cleanup
     */
    public dispose(): void {
        this.scrcpyRunner.dispose();
    }
}
