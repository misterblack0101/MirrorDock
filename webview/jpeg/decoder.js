/**
 * JPEG Frame Decoder - Simple and Reliable
 * Displays JPEG frames from ffmpeg transcoded stream
 */

class JpegDecoder {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.onFrameReady = null;
        this.frameCount = 0;
        this.renderedFrames = 0;
        this.droppedFrames = 0;
        this.isInitialized = false;
        this.lastFrameTime = Date.now();
        this.pendingFrame = null;
        this.isDecoding = false;
        this.animationFrameId = null;
    }

    /**
     * Initialize the decoder with a canvas element
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        console.log('[JpegDecoder] Initializing...');
        this.isInitialized = true;

        // Set canvas to default size
        if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = 720;
            canvas.height = 1280;
        }

        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);

        console.log('[JpegDecoder] ✅ Initialized successfully');
    }

    /**
     * Decode JPEG frame data (async with createImageBitmap for speed)
     * @param {Uint8Array} frameData - JPEG image data
     */
    async decode(frameData) {
        if (!this.isInitialized || !this.canvas || !this.ctx) {
            return;
        }

        this.frameCount++;

        // Drop frame if currently decoding (prevent backlog)
        if (this.isDecoding) {
            this.droppedFrames++;
            return;
        }

        this.isDecoding = true;

        try {
            // Clean up previous frame
            if (this.pendingFrame) {
                this.pendingFrame.close();
                this.pendingFrame = null;
            }

            // Use createImageBitmap for fast decoding
            const blob = new Blob([frameData], { type: 'image/jpeg' });
            const imageBitmap = await createImageBitmap(blob, {
                resizeQuality: 'low',
                premultiplyAlpha: 'none'
            });

            // Store for rendering
            this.pendingFrame = imageBitmap;

            // Schedule render on next animation frame
            if (!this.animationFrameId) {
                this.animationFrameId = requestAnimationFrame(() => this.renderFrame());
            }

            // Log progress
            if (this.frameCount === 1) {
                console.log('[JpegDecoder] 🎥 First frame received');
            }

            if (this.renderedFrames % 100 === 0 && this.renderedFrames > 0) {
                const fps = this.calculateFPS();
                console.log(`[JpegDecoder] Rendered: ${this.renderedFrames}, Dropped: ${this.droppedFrames}, FPS: ${fps.toFixed(1)}`);
            }
        } catch (error) {
            console.error('[JpegDecoder] Decode error:', error);
        } finally {
            this.isDecoding = false;
        }
    }

    /**
     * Render the current frame to canvas (called via requestAnimationFrame)
     */
    renderFrame() {
        this.animationFrameId = null;

        if (!this.ctx || !this.canvas || !this.pendingFrame) {
            return;
        }

        // Adjust canvas size to match image (only once)
        if (this.canvas.width !== this.pendingFrame.width || this.canvas.height !== this.pendingFrame.height) {
            console.log(`[JpegDecoder] Resizing canvas: ${this.canvas.width}x${this.canvas.height} -> ${this.pendingFrame.width}x${this.pendingFrame.height}`);
            this.canvas.width = this.pendingFrame.width;
            this.canvas.height = this.pendingFrame.height;
        }

        // Draw frame to canvas (ImageBitmap is very fast)
        this.ctx.drawImage(this.pendingFrame, 0, 0);
        this.renderedFrames++;

        if (this.onFrameReady) {
            this.onFrameReady();
        }
    }

    /**
     * Calculate FPS
     */
    calculateFPS() {
        const now = Date.now();
        const fps = 1000 / (now - this.lastFrameTime);
        this.lastFrameTime = now;
        return fps;
    }

    /**
     * Clear the decoder state
     */
    clear() {
        this.frameCount = 0;
        this.renderedFrames = 0;
        this.droppedFrames = 0;
        this.isDecoding = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.pendingFrame) {
            this.pendingFrame.close();
            this.pendingFrame = null;
        }

        if (this.ctx && this.canvas) {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Get decoder statistics
     */
    getStats() {
        return {
            frameCount: this.frameCount,
            renderedFrames: this.renderedFrames,
            droppedFrames: this.droppedFrames,
            isActive: this.isInitialized
        };
    }
}

// Export for use in view.js
window.JpegDecoder = JpegDecoder;

console.log('[JpegDecoder] Loaded and exported to window');
