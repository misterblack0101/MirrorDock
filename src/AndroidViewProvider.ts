import * as vscode from 'vscode';
import { AndroidStreamRunner } from './AndroidStreamRunner';
import { WebViewMessage, TapInputMessage, SwipeInputMessage, LongPressInputMessage } from './types/messages';

// WebView controller - manages UI panel and routes messages
export class AndroidViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private streamRunner: AndroidStreamRunner;
    private autoStart: boolean = false;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.streamRunner = new AndroidStreamRunner();
        this.setupStreamListeners();
    }

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

        webviewView.webview.onDidReceiveMessage(async (message: WebViewMessage) => {
            await this.handleWebViewMessage(message);
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible && this.autoStart) {
                this.start();
            }
        });

        if (this.autoStart) {
            this.start();
        }
    }

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

    private async handleInputMessage(
        message: TapInputMessage | SwipeInputMessage | LongPressInputMessage
    ): Promise<void> {
        switch (message.action) {
            case 'tap':
                await this.streamRunner.tap(message.payload.x, message.payload.y);
                break;
            case 'swipe':
                await this.streamRunner.swipe(
                    message.payload.x1,
                    message.payload.y1,
                    message.payload.x2,
                    message.payload.y2,
                    message.payload.duration
                );
                break;
            case 'longPress':
                await this.streamRunner.longPress(
                    message.payload.x,
                    message.payload.y,
                    message.payload.duration
                );
                break;
        }
    }

    private setupStreamListeners(): void {
        this.streamRunner.on('frame', (data: Buffer) => {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'frame',
                    data: Array.from(data)
                });
            }
        });

        this.streamRunner.on('status', (status: string, message: string) => {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'status',
                    status: status,
                    message: message
                });
            }
        });
    }

    public async start(): Promise<void> {
        this.autoStart = true;

        if (!this._view?.visible) {
            vscode.window.showInformationMessage('Opening device panel...');
            return;
        }

        try {
            await this.streamRunner.start();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to start: ${message}`);
        }
    }

    public stop(): void {
        this.autoStart = false;
        this.streamRunner.stop();
    }

    public async restart(): Promise<void> {
        this.stop();

        if (this._view) {
            this._view.webview.postMessage({
                type: 'clear'
            });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        await this.start();
    }

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

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public dispose(): void {
        this.streamRunner.dispose();
    }
}
