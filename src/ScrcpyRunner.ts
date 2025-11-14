import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';

export class ScrcpyRunner extends EventEmitter {
    private process: ChildProcess | null = null;
    private isRunning: boolean = false;
    private shouldRestart: boolean = true;
    private outputChannel: vscode.OutputChannel;
    private pendingCommands: Set<ChildProcess> = new Set();

    constructor() {
        super();
        this.outputChannel = vscode.window.createOutputChannel('Android Screen');
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            this.outputChannel.appendLine('Already running');
            return;
        }

        try {
            await this.checkDeviceConnected();
            await this.killExistingScreenrecord();

            this.shouldRestart = true;
            this.outputChannel.appendLine('Starting screen recording...');
            this.emit('status', 'starting', 'Starting screen recording...');

            const adbArgs = [
                'shell',
                'screenrecord',
                '--output-format=h264',
                '--size', '720x1280',
                '--bit-rate', '1000000',
                '-'
            ];

            this.outputChannel.appendLine(`Running: adb ${adbArgs.join(' ')}`);
            this.process = spawn('adb', adbArgs);

            this.isRunning = true;

            setTimeout(async () => {
                try {
                    await this.executeAdbCommand('input keyevent KEYCODE_WAKEUP', { ignoreErrors: true });
                    await this.executeAdbCommand('input swipe 0 0 0 1 10', { ignoreErrors: true });
                    this.outputChannel.appendLine('Triggered screen refresh');
                } catch (e) {
                    // Ignore
                }
            }, 500);

            if (this.process.stdout) {
                this.process.stdout.on('data', (data: Buffer) => {
                    this.emit('frame', data);
                });
            }

            if (this.process.stderr) {
                this.process.stderr.on('data', (data: Buffer) => {
                    const message = data.toString();
                    this.outputChannel.appendLine(message);

                    if (message.includes('device') || message.includes('encoder')) {
                        this.emit('status', 'running', 'Device connected');
                    }
                });
            } this.process.on('exit', (code, signal) => {
                this.isRunning = false;
                this.outputChannel.appendLine(`Process exited: ${code}`);

                if (this.shouldRestart && code !== 0) {
                    this.outputChannel.appendLine('Restarting...');
                    setTimeout(() => this.start(), 2000);
                } else {
                    this.emit('status', 'stopped', 'Stopped');
                }
            });

            this.process.on('error', (err) => {
                this.outputChannel.appendLine(`Error: ${err.message}`);
                this.emit('status', 'error', err.message);
                this.isRunning = false;
            });

            this.emit('status', 'running', 'Started successfully');

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`Failed to start: ${message}`);
            this.emit('status', 'error', message);
            throw error;
        }
    }

    public stop(): void {
        this.shouldRestart = false;

        if (this.process) {
            this.outputChannel.appendLine('Stopping...');

            if (this.process.stdout) {
                this.process.stdout.removeAllListeners();
            }
            if (this.process.stderr) {
                this.process.stderr.removeAllListeners();
            }
            this.process.removeAllListeners();

            this.process.kill('SIGTERM');
            this.process = null;
            this.isRunning = false;
            this.emit('status', 'stopped', 'Stopped');
        }
    }

    public getIsRunning(): boolean {
        return this.isRunning;
    }

    private async checkDeviceConnected(): Promise<void> {
        return new Promise((resolve, reject) => {
            const check = spawn('adb', ['devices']);
            let output = '';

            check.stdout?.on('data', (data) => {
                output += data.toString();
            });

            check.on('exit', (code) => {
                if (code === 0) {
                    const lines = output.split('\n').filter(line => line.includes('\t'));
                    if (lines.length > 0) {
                        const deviceInfo = lines[0].split('\t');
                        this.outputChannel.appendLine(`Device found: ${deviceInfo[0]}`);
                        resolve();
                    } else {
                        reject(new Error('No device connected. Please connect a device and enable USB debugging.'));
                    }
                } else {
                    reject(new Error('Failed to check for connected devices'));
                }
            });

            check.on('error', () => {
                reject(new Error('ADB not found. Please install Android SDK Platform Tools.'));
            });
        });
    }

    private async killExistingScreenrecord(): Promise<void> {
        try {
            await this.executeAdbCommand('pkill -9 screenrecord', { ignoreErrors: true });
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            this.outputChannel.appendLine('No existing screenrecord processes');
        }
    }

    public async executeAdbCommand(command: string, options?: { ignoreErrors?: boolean }): Promise<void> {
        return new Promise((resolve, reject) => {
            const args = command.startsWith('shell ') ? command.split(' ') : ['shell', ...command.split(' ')];
            const adb = spawn('adb', args);
            this.pendingCommands.add(adb);

            const cleanup = () => {
                this.pendingCommands.delete(adb);
                adb.removeAllListeners();
            };

            adb.on('exit', (code) => {
                cleanup();
                if (code === 0 || options?.ignoreErrors) {
                    resolve();
                } else {
                    reject(new Error(`ADB command failed with code ${code}`));
                }
            });

            adb.on('error', (err) => {
                cleanup();
                if (options?.ignoreErrors) {
                    resolve();
                } else {
                    reject(err);
                }
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                if (this.pendingCommands.has(adb)) {
                    adb.kill();
                    cleanup();
                    if (options?.ignoreErrors) {
                        resolve();
                    } else {
                        reject(new Error('ADB command timeout'));
                    }
                }
            }, 5000);
        });
    }

    public async tap(x: number, y: number): Promise<void> {
        try {
            await this.executeAdbCommand(`input tap ${Math.round(x)} ${Math.round(y)}`);
        } catch (error) {
            this.outputChannel.appendLine(`Tap failed: ${error}`);
        }
    }

    public async swipe(x1: number, y1: number, x2: number, y2: number, duration: number): Promise<void> {
        try {
            await this.executeAdbCommand(
                `input swipe ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)} ${duration}`
            );
        } catch (error) {
            this.outputChannel.appendLine(`Swipe failed: ${error}`);
        }
    }

    public async longPress(x: number, y: number, duration: number): Promise<void> {
        try {
            await this.executeAdbCommand(
                `input swipe ${Math.round(x)} ${Math.round(y)} ${Math.round(x)} ${Math.round(y)} ${duration}`
            );
        } catch (error) {
            this.outputChannel.appendLine(`Long press failed: ${error}`);
        }
    }

    public dispose(): void {
        this.stop();

        this.pendingCommands.forEach(proc => {
            try {
                proc.kill();
            } catch (e) { }
        });
        this.pendingCommands.clear();

        this.removeAllListeners();
        this.outputChannel.dispose();
    }
}
