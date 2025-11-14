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

            // OPTIMIZED SOLUTION: Use ffmpeg to convert H.264 to JPEG frames
            // Optimized for low latency and reasonable quality
            const args = [
                'exec-out',
                'screenrecord --output-format=h264 --size 720x1280 --bit-rate 1000000 -'
            ];

            this.outputChannel.appendLine(`Running: adb ${args.join(' ')} | ffmpeg...`);

            // Pipe through ffmpeg to convert H.264 to JPEG frames
            const adbProcess = spawn('adb', args);

            const ffmpegArgs = [
                '-i', 'pipe:0',              // Input from stdin
                '-f', 'image2pipe',          // Output as image stream
                '-vcodec', 'mjpeg',          // MJPEG codec
                '-q:v', '8',                 // Quality (2-31, 8 is good balance)
                '-vf', 'scale=720:1280',     // Ensure correct size
                '-r', '20',                  // 20 FPS
                '-preset', 'ultrafast',      // Fast encoding
                '-tune', 'zerolatency',      // Minimize latency
                'pipe:1'                     // Output to stdout
            ];

            this.process = spawn('ffmpeg', ffmpegArgs);

            // Pipe ADB output to ffmpeg
            if (adbProcess.stdout && this.process.stdin) {
                adbProcess.stdout.pipe(this.process.stdin);
            }

            this.isRunning = true;

            // Handle ADB process
            if (adbProcess.stderr) {
                adbProcess.stderr.on('data', (data: Buffer) => {
                    this.outputChannel.appendLine(`ADB: ${data.toString()}`);
                });
            }

            adbProcess.on('exit', (code) => {
                this.outputChannel.appendLine(`ADB process exited with code ${code}`);
            });

            // Handle ffmpeg stdout (JPEG frames)
            if (this.process.stdout) {
                let buffer = Buffer.alloc(0);
                const SOI = Buffer.from([0xFF, 0xD8]); // JPEG start marker
                const EOI = Buffer.from([0xFF, 0xD9]); // JPEG end marker

                this.process.stdout.on('data', (data: Buffer) => {
                    buffer = Buffer.concat([buffer, data]);

                    // Find complete JPEG frames
                    while (true) {
                        const startIdx = buffer.indexOf(SOI);
                        if (startIdx === -1) break;

                        const endIdx = buffer.indexOf(EOI, startIdx + 2);
                        if (endIdx === -1) break;

                        // Extract complete JPEG frame
                        const frame = buffer.slice(startIdx, endIdx + 2);
                        this.emit('frame', frame);

                        // Remove processed frame from buffer
                        buffer = buffer.slice(endIdx + 2);
                    }

                    // Keep buffer size reasonable
                    if (buffer.length > 1024 * 1024) {
                        buffer = buffer.slice(-512 * 1024);
                    }
                });
            }

            // Handle stderr (logs and errors)
            if (this.process.stderr) {
                this.process.stderr.on('data', (data: Buffer) => {
                    const message = data.toString();
                    // Only log errors, not all ffmpeg output
                    if (message.toLowerCase().includes('error')) {
                        this.outputChannel.appendLine(`ffmpeg: ${message}`);
                    }

                    // Detect when streaming starts
                    if (message.includes('frame=') || message.includes('size=')) {
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
