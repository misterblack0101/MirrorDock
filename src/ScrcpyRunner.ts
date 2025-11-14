import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';

/**
 * Manages the scrcpy process and handles video stream output
 */
export class ScrcpyRunner extends EventEmitter {
    private process: ChildProcess | null = null;
    private isRunning: boolean = false;
    private shouldRestart: boolean = true;
    private outputChannel: vscode.OutputChannel;
    private pendingCommands: Set<ChildProcess> = new Set();

    constructor() {
        super();
        this.outputChannel = vscode.window.createOutputChannel('Scrcpy');
    }

    /**
     * Start the scrcpy process
     */
    public async start(): Promise<void> {
        if (this.isRunning) {
            this.outputChannel.appendLine('Scrcpy is already running');
            return;
        }

        try {
            // Check if a device is connected
            await this.checkDeviceConnected();

            // Kill any existing screenrecord processes on the device
            await this.killExistingScreenrecord();

            this.shouldRestart = true;
            this.outputChannel.appendLine('Starting scrcpy...');
            this.emit('status', 'starting', 'Starting scrcpy process...');

            // Simple approach: Use scrcpy with video output via ADB
            // scrcpy will handle encoding efficiently
            const args = [
                '--video-codec=h264',
                '--max-size=720',
                '--max-fps=30',
                '--video-bit-rate=1M',
                '--no-audio',
                '--no-window',
                '--video-encoder=OMX.google.h264.encoder'
            ];

            this.outputChannel.appendLine(`Running: scrcpy ${args.join(' ')}`);

            // For now, let's just go back to ADB screenrecord without ffmpeg transcoding
            // We'll decode H.264 directly in the browser
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

            // Handle stdout (raw video stream from scrcpy)
            if (this.process.stdout) {
                this.process.stdout.on('data', (data: Buffer) => {
                    // Emit raw video data
                    this.emit('frame', data);
                });
            }

            // Handle stderr (logs and errors)
            if (this.process.stderr) {
                this.process.stderr.on('data', (data: Buffer) => {
                    const message = data.toString();
                    this.outputChannel.appendLine(`scrcpy: ${message}`);

                    // Check for device connection
                    if (message.includes('device') || message.includes('encoder')) {
                        this.emit('status', 'running', 'Device connected');
                    }
                });
            }            // Handle process exit
            this.process.on('exit', (code, signal) => {
                this.isRunning = false;
                this.outputChannel.appendLine(`scrcpy process exited with code ${code}, signal ${signal}`);

                if (this.shouldRestart && code !== 0) {
                    this.outputChannel.appendLine('Attempting to restart scrcpy...');
                    setTimeout(() => this.start(), 2000);
                } else {
                    this.emit('status', 'stopped', 'Scrcpy process stopped');
                }
            });

            // Handle errors
            this.process.on('error', (err) => {
                this.outputChannel.appendLine(`Error: ${err.message}`);
                this.emit('status', 'error', err.message);
                this.isRunning = false;
            });

            this.emit('status', 'running', 'Scrcpy started successfully');

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`Failed to start scrcpy: ${message}`);
            this.emit('status', 'error', message);
            throw error;
        }
    }

    /**
     * Stop the scrcpy process
     */
    public stop(): void {
        this.shouldRestart = false;

        if (this.process) {
            this.outputChannel.appendLine('Stopping scrcpy...');

            // Remove all listeners to prevent memory leaks
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
            this.emit('status', 'stopped', 'Scrcpy stopped');
        }
    }

    /**
     * Check if scrcpy is running
     */
    public getIsRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Check if ADB device is connected
     */
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

    /**
     * Kill any existing screenrecord processes on device
     */
    private async killExistingScreenrecord(): Promise<void> {
        try {
            this.outputChannel.appendLine('Checking for existing screenrecord processes...');
            // Find and kill screenrecord processes
            await this.executeAdbCommand('pkill -9 screenrecord', { ignoreErrors: true });
            // Small delay to ensure processes are killed
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            // Ignore errors - process might not exist
            this.outputChannel.appendLine('No existing screenrecord processes found');
        }
    }

    /**
     * Execute ADB command
     */
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

    /**
     * Send tap event to device
     */
    public async tap(x: number, y: number): Promise<void> {
        try {
            await this.executeAdbCommand(`input tap ${Math.round(x)} ${Math.round(y)}`);
        } catch (error) {
            this.outputChannel.appendLine(`Tap failed: ${error}`);
        }
    }

    /**
     * Send swipe event to device
     */
    public async swipe(x1: number, y1: number, x2: number, y2: number, duration: number): Promise<void> {
        try {
            await this.executeAdbCommand(
                `input swipe ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)} ${duration}`
            );
        } catch (error) {
            this.outputChannel.appendLine(`Swipe failed: ${error}`);
        }
    }

    /**
     * Send long press event to device
     */
    public async longPress(x: number, y: number, duration: number): Promise<void> {
        try {
            // Long press is simulated as a swipe with same start/end coordinates
            await this.executeAdbCommand(
                `input swipe ${Math.round(x)} ${Math.round(y)} ${Math.round(x)} ${Math.round(y)} ${duration}`
            );
        } catch (error) {
            this.outputChannel.appendLine(`Long press failed: ${error}`);
        }
    }

    /**
     * Cleanup resources
     */
    public dispose(): void {
        this.stop();

        // Kill any pending ADB commands
        this.pendingCommands.forEach(proc => {
            try {
                proc.kill();
            } catch (e) {
                // Ignore
            }
        });
        this.pendingCommands.clear();

        this.removeAllListeners();
        this.outputChannel.dispose();
    }
}
