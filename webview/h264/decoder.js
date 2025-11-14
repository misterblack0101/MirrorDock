/**
 * H.264 Decoder using Web Codecs API
 * Modern browser API for video decoding - no external dependencies needed
 */

class H264Decoder {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.buffer = new Uint8Array(0);
        this.onFrameReady = null;
        this.frameCount = 0;
        this.nalCount = 0;
        this.decodedFrames = 0;
        this.isInitialized = false;
        this.lastFrameTime = Date.now();
        this.videoDecoder = null;
        this.useWebCodecs = false;
        this.sps = null;
        this.pps = null;
        this.isConfigured = false;
    }

    /**
     * Initialize the decoder with a canvas element
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        console.log('[Decoder] Initializing H.264 decoder...');
        console.log('[Decoder] Canvas size:', canvas.width, 'x', canvas.height);
        this.isInitialized = true;

        // Set canvas to a reasonable default size
        if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = 720;
            canvas.height = 1280;
            console.log('[Decoder] Set default canvas size: 720x1280');
        }

        // Try to use Web Codecs API (Chrome/Edge)
        console.log('[Decoder] Checking for VideoDecoder API...');
        console.log('[Decoder] VideoDecoder available:', 'VideoDecoder' in window);

        if ('VideoDecoder' in window) {
            this.initWebCodecs();
        } else {
            console.warn('[Decoder] WebCodecs API not available, using visualization');
            console.warn('[Decoder] This VSCode version may not support WebCodecs');
        }

        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * Initialize Web Codecs API decoder
     */
    initWebCodecs() {
        console.log('[Decoder] Creating VideoDecoder instance...');
        try {
            this.videoDecoder = new VideoDecoder({
                output: (frame) => {
                    console.log('[Decoder] ✓ Frame decoded:', frame.displayWidth, 'x', frame.displayHeight);
                    this.renderVideoFrame(frame);
                    frame.close();
                },
                error: (error) => {
                    console.error('[Decoder] ❌ VideoDecoder error:', error);
                }
            });

            console.log('[Decoder] VideoDecoder created, waiting for SPS/PPS...');
            this.useWebCodecs = true;
            console.log('[Decoder] ✅ WebCodecs API initialized successfully!');
        } catch (error) {
            console.error('[Decoder] ❌ Failed to initialize WebCodecs:', error.message);
            console.error('[Decoder] Error stack:', error.stack);
            this.useWebCodecs = false;
        }
    }

    /**
     * Configure decoder with SPS and PPS
     */
    configureDecoder() {
        if (!this.sps || !this.pps) {
            console.warn('[Decoder] Cannot configure: missing SPS or PPS');
            return false;
        }

        try {
            // Create AVC description with SPS and PPS
            const description = this.createAvcDescription(this.sps, this.pps);

            console.log('[Decoder] Configuring decoder with SPS/PPS...');

            this.videoDecoder.configure({
                codec: 'avc1.42E01E',
                description: description,
                optimizeForLatency: true
            });

            this.isConfigured = true;
            console.log('[Decoder] ✅ Decoder configured with SPS/PPS!');
            return true;
        } catch (error) {
            console.error('[Decoder] ❌ Failed to configure decoder:', error);
            this.useWebCodecs = false;
            return false;
        }
    }

    /**
     * Create AVC decoder configuration
     */
    createAvcDescription(sps, pps) {
        // AVC decoder configuration record format
        // https://www.w3.org/TR/webcodecs-avc-codec-registration/
        const spsData = sps.slice(sps[2] === 0x01 ? 3 : 4); // Skip start code
        const ppsData = pps.slice(pps[2] === 0x01 ? 3 : 4); // Skip start code

        const size = 7 + spsData.length + ppsData.length;
        const description = new Uint8Array(size);
        let offset = 0;

        // Configuration version
        description[offset++] = 0x01;
        // Profile
        description[offset++] = spsData[1];
        // Profile compatibility
        description[offset++] = spsData[2];
        // Level
        description[offset++] = spsData[3];
        // Length size minus one (4 bytes - 1)
        description[offset++] = 0xFF;
        // Number of SPS (0xE1 = 0b11100001, indicating 1 SPS)
        description[offset++] = 0xE1;
        // SPS length
        description[offset++] = (spsData.length >> 8) & 0xFF;
        description[offset++] = spsData.length & 0xFF;
        // SPS data
        description.set(spsData, offset);
        offset += spsData.length;
        // Number of PPS
        description[offset++] = 0x01;
        // PPS length
        description[offset++] = (ppsData.length >> 8) & 0xFF;
        description[offset++] = ppsData.length & 0xFF;
        // PPS data
        description.set(ppsData, offset);

        console.log('[Decoder] Created AVC description:', description.length, 'bytes');
        return description;
    }

    /**
     * Render decoded video frame to canvas
     */
    renderVideoFrame(frame) {
        if (!this.ctx || !this.canvas) {
            console.error('[Decoder] No canvas context available for rendering');
            return;
        }

        // Adjust canvas size to match video
        if (this.canvas.width !== frame.displayWidth || this.canvas.height !== frame.displayHeight) {
            console.log(`[Decoder] Resizing canvas: ${this.canvas.width}x${this.canvas.height} -> ${frame.displayWidth}x${frame.displayHeight}`);
            this.canvas.width = frame.displayWidth;
            this.canvas.height = frame.displayHeight;
        }

        // Draw frame to canvas
        this.ctx.drawImage(frame, 0, 0);
        this.decodedFrames++;

        if (this.decodedFrames === 1) {
            console.log('[Decoder] 🎥 First frame rendered!');
        }

        if (this.decodedFrames % 30 === 0) {
            console.log(`[Decoder] Rendered ${this.decodedFrames} frames`);
        }

        if (this.onFrameReady) {
            this.onFrameReady();
        }
    }

    /**
     * Decode H.264 frame data from adb screenrecord
     * @param {Uint8Array} frameData - Raw H.264 NAL units
     */
    decode(frameData) {
        if (!this.isInitialized || !this.canvas || !this.ctx) {
            console.warn('[Decoder] Not initialized');
            return;
        }

        this.frameCount++;

        // Accumulate buffer
        const newBuffer = new Uint8Array(this.buffer.length + frameData.length);
        newBuffer.set(this.buffer);
        newBuffer.set(frameData, this.buffer.length);
        this.buffer = newBuffer;

        // Process NAL units
        this.processNalUnits();

        if (this.onFrameReady) {
            this.onFrameReady();
        }
    }

    /**
     * Process NAL units from buffer
     */
    processNalUnits() {
        let processed = false;
        let startIndex = 0;

        while (startIndex < this.buffer.length - 4) {
            const nalStart = this.findNalStart(startIndex);

            if (nalStart === -1) {
                // No more NAL units, keep remaining data
                this.buffer = this.buffer.slice(startIndex);
                break;
            }

            const nextNalStart = this.findNalStart(nalStart + 4);

            if (nextNalStart !== -1) {
                // Found complete NAL unit
                const nalUnit = this.buffer.slice(nalStart, nextNalStart);
                this.handleNalUnit(nalUnit);
                processed = true;
                startIndex = nextNalStart;
            } else {
                // Incomplete NAL unit, wait for more data
                this.buffer = this.buffer.slice(nalStart);
                break;
            }
        }

        if (processed) {
            this.renderFrame();
        }
    }

    /**
     * Find NAL unit start code
     */
    findNalStart(fromIndex) {
        for (let i = fromIndex; i < this.buffer.length - 3; i++) {
            // Check for 0x00 0x00 0x01
            if (this.buffer[i] === 0x00 &&
                this.buffer[i + 1] === 0x00 &&
                this.buffer[i + 2] === 0x01) {
                return i;
            }
            // Check for 0x00 0x00 0x00 0x01
            if (i < this.buffer.length - 4 &&
                this.buffer[i] === 0x00 &&
                this.buffer[i + 1] === 0x00 &&
                this.buffer[i + 2] === 0x00 &&
                this.buffer[i + 3] === 0x01) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Handle individual NAL unit
     */
    handleNalUnit(nalUnit) {
        this.nalCount++;

        // Skip start code to get NAL type
        let offset = nalUnit[2] === 0x01 ? 3 : 4;
        const nalType = nalUnit[offset] & 0x1F;

        // NAL unit types:
        // 1: Non-IDR slice
        // 5: IDR slice (keyframe)
        // 6: SEI
        // 7: SPS (Sequence Parameter Set)
        // 8: PPS (Picture Parameter Set)

        const nalTypeNames = {
            1: 'Non-IDR slice',
            5: 'IDR slice (keyframe)',
            6: 'SEI',
            7: 'SPS',
            8: 'PPS'
        };

        // Log important NAL units
        if ([5, 7, 8].includes(nalType)) {
            console.log(`[Decoder] NAL Type ${nalType} (${nalTypeNames[nalType]}): ${nalUnit.length} bytes`);
        }

        // Store SPS and PPS
        if (nalType === 7) {
            this.sps = nalUnit;
            console.log('[Decoder] ✓ SPS stored');
            if (this.pps) {
                this.configureDecoder();
            }
            return;
        }

        if (nalType === 8) {
            this.pps = nalUnit;
            console.log('[Decoder] ✓ PPS stored');
            if (this.sps) {
                this.configureDecoder();
            }
            return;
        }

        // Feed video frames to Web Codecs decoder if configured
        if (this.videoDecoder && this.useWebCodecs && this.isConfigured) {
            try {
                const isKeyFrame = nalType === 5; // IDR slice

                const chunk = new EncodedVideoChunk({
                    type: isKeyFrame ? 'key' : 'delta',
                    timestamp: performance.now() * 1000, // microseconds
                    data: nalUnit
                });

                this.videoDecoder.decode(chunk);

                if (nalType === 5) {
                    console.log('[Decoder] ✓ Decoded keyframe');
                }
            } catch (error) {
                console.error('[Decoder] ❌ Decode error:', error.message);
                // Fall back to visualization
                this.useWebCodecs = false;
            }
        } else if (nalType === 5 || nalType === 1) {
            // Video frame but decoder not ready
            if (!this.isConfigured && this.nalCount < 10) {
                console.warn('[Decoder] Waiting for decoder configuration...');
            }
        }
    }    /**
     * Render visual feedback (fallback when video decoding not working)
     */
    renderFrame() {
        if (!this.ctx || !this.canvas) return;

        // If Web Codecs is working, show decoded frame count
        if (this.useWebCodecs && this.decodedFrames > 0) {
            // Video is being rendered by renderVideoFrame, just show stats overlay
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, 10, 200, 100);

            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`✓ Video Decoding`, 20, 30);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(`Frames: ${this.decodedFrames}`, 20, 50);
            this.ctx.fillText(`NAL units: ${this.nalCount}`, 20, 70);
            this.ctx.fillText(`FPS: ${this.calculateFPS().toFixed(1)}`, 20, 90);
            this.ctx.restore();
            return;
        }

        // Fallback visualization
        const now = Date.now();
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e293b');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw pulsing circle
        const time = Date.now() / 1000;
        const radius = 50 + Math.sin(time * 3) * 10;

        this.ctx.save();
        this.ctx.translate(centerX, centerY - 100);

        const gradient2 = this.ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius);
        gradient2.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient2.addColorStop(1, 'rgba(59, 130, 246, 0)');

        this.ctx.fillStyle = gradient2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#3b82f6';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();

        // Stats
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffffff';

        this.ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI"';
        this.ctx.fillText('📱 Device Connected', centerX, centerY + 20);

        this.ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI"';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText('Receiving H.264 stream', centerX, centerY + 60);

        // Stats
        this.ctx.font = '14px monospace';
        this.ctx.fillStyle = '#64748b';
        this.ctx.textAlign = 'left';
        const leftX = 20;
        let y = centerY + 120;

        this.ctx.fillText(`Frames received: ${this.frameCount}`, leftX, y);
        y += 25;
        this.ctx.fillText(`NAL units: ${this.nalCount}`, leftX, y);
        y += 25;
        this.ctx.fillText(`Buffer: ${(this.buffer.length / 1024).toFixed(1)} KB`, leftX, y);
        y += 25;
        this.ctx.fillText(`FPS: ${this.calculateFPS().toFixed(1)}`, leftX, y);

        // Info
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#475569';
        this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI"';

        if (!this.useWebCodecs) {
            this.ctx.fillText('WebCodecs API not available • NAL parsing active', centerX, this.canvas.height - 30);
        } else {
            this.ctx.fillText('WebCodecs decoder active • Waiting for keyframe', centerX, this.canvas.height - 30);
        }
    }

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
        this.buffer = new Uint8Array(0);
        this.frameCount = 0;
        this.nalCount = 0;
        this.decodedFrames = 0;

        if (this.videoDecoder && this.useWebCodecs) {
            try {
                this.videoDecoder.reset();
            } catch (e) {
                console.warn('[Decoder] Error resetting decoder:', e);
            }
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
            bufferSize: this.buffer.length,
            frameCount: this.frameCount,
            nalCount: this.nalCount,
            decodedFrames: this.decodedFrames,
            useWebCodecs: this.useWebCodecs,
            isActive: this.buffer.length > 0
        };
    }
}

// Export for use in view.js
window.H264Decoder = H264Decoder;

console.log('[Decoder] H264Decoder class loaded and exported to window');
console.log('[Decoder] VideoDecoder API available:', 'VideoDecoder' in window);
