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
            // Check if scrcpy is installed
            await this.checkScrcpyInstalled();

            this.shouldRestart = true;
            this.outputChannel.appendLine('Starting scrcpy...');
            this.emit('status', 'starting', 'Starting scrcpy process...');

            // PRODUCTION SOLUTION: Use ADB screenrecord for actual H.264 stream
            // This gives us real H.264 NAL units that Broadway.js can decode
            const args = [
                'shell',
                'screenrecord',
                '--output-format=h264',  // Raw H.264 output
                '--size',
                '720x1280',
                '--bit-rate',
                '2000000',
                '-'  // Output to stdout
            ];

            this.outputChannel.appendLine(`Running: adb ${args.join(' ')}`);
            this.process = spawn('adb', args);

            this.isRunning = true;

            // Handle stdout (H.264 video stream)
            if (this.process.stdout) {
                this.process.stdout.on('data', (data: Buffer) => {
                    // Emit raw H.264 frame data
                    this.emit('frame', data);
                });
            }

            // Handle stderr (logs and errors)
            if (this.process.stderr) {
                this.process.stderr.on('data', (data: Buffer) => {
                    const message = data.toString();
                    this.outputChannel.appendLine(`scrcpy: ${message}`);

                    // Check for device connection
                    if (message.includes('device')) {
                        this.emit('status', 'running', 'Device connected');
                    }
                });
            }

            // Handle process exit
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
     * Check if scrcpy is installed
     */
    private async checkScrcpyInstalled(): Promise<void> {
        return new Promise((resolve, reject) => {
            const check = spawn('which', ['scrcpy']);

            check.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error('scrcpy is not installed. Please install it first: https://github.com/Genymobile/scrcpy'));
                }
            });

            check.on('error', () => {
                reject(new Error('Failed to check scrcpy installation'));
            });
        });
    }

    /**
     * Execute ADB command
     */
    public async executeAdbCommand(command: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const adb = spawn('adb', ['shell', ...command.split(' ')]);

            adb.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ADB command failed with code ${code}`));
                }
            });

            adb.on('error', (err) => {
                reject(err);
            });
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
        this.removeAllListeners();
        this.outputChannel.dispose();
    }
}
