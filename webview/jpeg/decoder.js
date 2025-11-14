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
        this.img = new Image();
        this.pendingFrame = null;
        this.isRendering = false;
        this.nextFrameUrl = null;
    }

    /**
     * Initialize the decoder with a canvas element
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        console.log('[JpegDecoder] Initializing...');
        this.isInitialized = true;

        // Set canvas to default size
        if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = 720;
            canvas.height = 1280;
        }

        // Setup image load handler
        this.img.onload = () => {
            this.renderFrame();
        };

        this.img.onerror = (error) => {
            console.error('[JpegDecoder] Image load error:', error);
        };

        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);

        console.log('[JpegDecoder] ✅ Initialized successfully');
    }

    /**
     * Decode JPEG frame data
     * @param {Uint8Array} frameData - JPEG image data
     */
    decode(frameData) {
        if (!this.isInitialized || !this.canvas || !this.ctx) {
            console.warn('[JpegDecoder] Not initialized');
            return;
        }

        this.frameCount++;

        // Drop frame if still rendering previous one (prevent backlog)
        if (this.isRendering) {
            this.droppedFrames++;
            if (this.droppedFrames % 10 === 0) {
                console.warn(`[JpegDecoder] Dropped ${this.droppedFrames} frames (rendering backlog)`);
            }
            return;
        }

        // Convert Uint8Array to blob URL
        const blob = new Blob([frameData], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        // Clean up previous URL
        if (this.pendingFrame) {
            URL.revokeObjectURL(this.pendingFrame);
        }
        this.pendingFrame = url;

        // Load the image
        this.isRendering = true;
        this.img.src = url;

        // Log first frame
        if (this.frameCount === 1) {
            console.log('[JpegDecoder] 🎥 First frame received');
        }

        if (this.renderedFrames % 100 === 0 && this.renderedFrames > 0) {
            const fps = this.calculateFPS();
            console.log(`[JpegDecoder] Rendered: ${this.renderedFrames}, Dropped: ${this.droppedFrames}, FPS: ${fps.toFixed(1)}`);
        }
    }

    /**
     * Render the current frame to canvas
     */
    renderFrame() {
        if (!this.ctx || !this.canvas || !this.img.complete) {
            this.isRendering = false;
            return;
        }

        // Adjust canvas size to match image (only once)
        if (this.canvas.width !== this.img.width || this.canvas.height !== this.img.height) {
            console.log(`[JpegDecoder] Resizing canvas: ${this.canvas.width}x${this.canvas.height} -> ${this.img.width}x${this.img.height}`);
            this.canvas.width = this.img.width;
            this.canvas.height = this.img.height;
        }

        // Draw frame to canvas
        this.ctx.drawImage(this.img, 0, 0);
        this.renderedFrames++;
        this.isRendering = false;

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
        this.isRendering = false;

        if (this.pendingFrame) {
            URL.revokeObjectURL(this.pendingFrame);
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
