// H.264 video decoder using WebCodecs API
// Parses NAL units, extracts SPS/PPS, converts Annex-B to AVCC, renders to canvas

class H264Decoder {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.onFrameReady = null;
        this.frameCount = 0;
        this.decodedFrames = 0;
        this.droppedFrames = 0;
        this.isInitialized = false;
        this.lastFrameTime = Date.now();
        this.videoDecoder = null;
        this.isConfigured = false;
        this.sps = null;
        this.pps = null;
        this.buffer = new Uint8Array(0);
        this.nalCount = 0;
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        console.log('[WebCodecs] Initializing...');
        this.isInitialized = true;

        if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = 720;
            canvas.height = 1280;
        }

        if (typeof VideoDecoder === 'undefined') {
            console.error('[WebCodecs] VideoDecoder API not available');
            this.showError('WebCodecs API not supported');
            return;
        }

        this.initDecoder();
        this.clearCanvas();
        console.log('[WebCodecs] ✅ Initialized');
    }

    initDecoder() {
        try {
            this.videoDecoder = new VideoDecoder({
                output: (frame) => {
                    this.renderFrame(frame);
                    frame.close();
                },
                error: (error) => {
                    console.error('[WebCodecs] Decoder error:', error);
                }
            });
            console.log('[WebCodecs] VideoDecoder created, waiting for SPS/PPS...');
        } catch (error) {
            console.error('[WebCodecs] Failed to create VideoDecoder:', error);
            this.showError('Failed to initialize video decoder');
        }
    }

    decode(data) {
        if (!this.isInitialized) return;

        this.frameCount++;

        // Append to buffer
        const newBuffer = new Uint8Array(this.buffer.length + data.length);
        newBuffer.set(this.buffer);
        newBuffer.set(data, this.buffer.length);
        this.buffer = newBuffer;

        // Process NAL units
        this.processBuffer();

        if (this.onFrameReady) {
            this.onFrameReady();
        }
    }

    processBuffer() {
        let processed = 0;
        const maxIterations = 100;

        while (processed < maxIterations) {
            const startIdx = this.findNalStart(0);
            if (startIdx === -1) {
                break;
            }

            const nextIdx = this.findNalStart(startIdx + 3);
            if (nextIdx === -1) {
                if (startIdx > 0) {
                    this.buffer = this.buffer.slice(startIdx);
                }
                break;
            }

            const nalUnit = this.buffer.slice(startIdx, nextIdx);
            this.handleNalUnit(nalUnit);

            this.buffer = this.buffer.slice(nextIdx);
            processed++;
        }

        if (this.buffer.length > 512 * 1024) {
            console.warn('[WebCodecs] Buffer exceeded 512KB');
            this.buffer = this.buffer.slice(-256 * 1024);
        }
    }

    findNalStart(fromIndex) {
        for (let i = fromIndex; i < this.buffer.length - 3; i++) {
            if (this.buffer[i] === 0x00 && this.buffer[i + 1] === 0x00) {
                if (this.buffer[i + 2] === 0x01) {
                    return i;
                }
                if (i < this.buffer.length - 4 &&
                    this.buffer[i + 2] === 0x00 &&
                    this.buffer[i + 3] === 0x01) {
                    return i;
                }
            }
        }
        return -1;
    }

    handleNalUnit(nalUnit) {
        this.nalCount++;

        // Get NAL unit type (skip start code)
        const startCodeLen = nalUnit[2] === 0x01 ? 3 : 4;
        const nalHeader = nalUnit[startCodeLen];
        const nalType = nalHeader & 0x1F;

        // SPS (7), PPS (8), IDR (5), Non-IDR (1)
        if (nalType === 7) {
            console.log('[WebCodecs] Received SPS');
            this.sps = nalUnit;
            if (this.pps) {
                this.configureDecoder();
            }
            return;
        }

        if (nalType === 8) {
            console.log('[WebCodecs] Received PPS');
            this.pps = nalUnit;
            if (this.sps) {
                this.configureDecoder();
            }
            return;
        }

        // Only decode video frames after configuration
        if (!this.isConfigured || !this.videoDecoder) {
            return;
        }

        // Decode video frames (IDR=5, Non-IDR=1)
        if (nalType === 5 || nalType === 1) {
            try {
                // Convert from Annex-B (start codes) to AVCC (length-prefixed)
                const nalData = nalUnit.slice(startCodeLen); // Remove start code
                const avccData = new Uint8Array(4 + nalData.length);

                // Write 4-byte length prefix (big-endian)
                avccData[0] = (nalData.length >> 24) & 0xFF;
                avccData[1] = (nalData.length >> 16) & 0xFF;
                avccData[2] = (nalData.length >> 8) & 0xFF;
                avccData[3] = nalData.length & 0xFF;

                // Copy NAL data
                avccData.set(nalData, 4);

                const chunk = new EncodedVideoChunk({
                    type: nalType === 5 ? 'key' : 'delta',
                    timestamp: performance.now() * 1000,
                    data: avccData
                });

                this.videoDecoder.decode(chunk);

                if (nalType === 5 && this.decodedFrames === 0) {
                    console.log('[WebCodecs] 🎥 Decoding first keyframe...');
                }
            } catch (error) {
                console.error('[WebCodecs] Decode error:', error);
                // Don't let one bad frame break everything
                if (error.message && error.message.includes('closed')) {
                    console.error('[WebCodecs] Decoder closed, reinitializing...');
                    this.isConfigured = false;
                    this.initDecoder();
                }
            }
        }
    }

    configureDecoder() {
        if (!this.sps || !this.pps || !this.videoDecoder) {
            return;
        }

        try {
            // Extract SPS/PPS data (remove start codes)
            const spsData = this.sps.slice(this.sps[2] === 0x01 ? 3 : 4);
            const ppsData = this.pps.slice(this.pps[2] === 0x01 ? 3 : 4);

            // Create avcC box (ISO/IEC 14496-15 format)
            const avcC = new Uint8Array(11 + spsData.length + ppsData.length);
            let offset = 0;

            avcC[offset++] = 1; // configurationVersion
            avcC[offset++] = spsData[1]; // AVCProfileIndication
            avcC[offset++] = spsData[2]; // profile_compatibility
            avcC[offset++] = spsData[3]; // AVCLevelIndication
            avcC[offset++] = 0xFF; // lengthSizeMinusOne (4 bytes)
            avcC[offset++] = 0xE1; // numOfSequenceParameterSets (1)

            // SPS length
            avcC[offset++] = (spsData.length >> 8) & 0xFF;
            avcC[offset++] = spsData.length & 0xFF;
            avcC.set(spsData, offset);
            offset += spsData.length;

            // PPS count
            avcC[offset++] = 1;
            // PPS length
            avcC[offset++] = (ppsData.length >> 8) & 0xFF;
            avcC[offset++] = ppsData.length & 0xFF;
            avcC.set(ppsData, offset);

            console.log('[WebCodecs] Configuring decoder with avcC...');

            this.videoDecoder.configure({
                codec: 'avc1.42E01E', // H.264 Baseline
                description: avcC,
                optimizeForLatency: true,
                hardwareAcceleration: 'prefer-hardware'
            });

            this.isConfigured = true;
            console.log('[WebCodecs] ✅ Decoder configured successfully!');
        } catch (error) {
            console.error('[WebCodecs] Configuration failed:', error);
            this.showError('Failed to configure decoder: ' + error.message);
        }
    }

    renderFrame(frame) {
        if (!this.ctx || !this.canvas) return;

        // Resize canvas to match video
        if (this.canvas.width !== frame.displayWidth ||
            this.canvas.height !== frame.displayHeight) {
            this.canvas.width = frame.displayWidth;
            this.canvas.height = frame.displayHeight;
            console.log(`[WebCodecs] Canvas resized to ${frame.displayWidth}x${frame.displayHeight}`);
        }

        // Draw frame
        this.ctx.drawImage(frame, 0, 0);
        this.decodedFrames++;

        if (this.decodedFrames === 1) {
            console.log('[WebCodecs] 🎉 First frame rendered!');
        }

        if (this.decodedFrames % 100 === 0) {
            const fps = this.calculateFPS();
            console.log(`[WebCodecs] Frames: ${this.decodedFrames}, FPS: ${fps.toFixed(1)}`);
        }
    }

    calculateFPS() {
        const now = Date.now();
        const fps = 1000 / (now - this.lastFrameTime);
        this.lastFrameTime = now;
        return fps;
    }

    clearCanvas() {
        if (!this.ctx || !this.canvas) return;
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    showError(message) {
        if (!this.ctx || !this.canvas) return;

        this.clearCanvas();
        this.ctx.fillStyle = '#ef4444';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
    }

    clear() {
        console.log('[WebCodecs] Clearing decoder state...');
        this.frameCount = 0;
        this.decodedFrames = 0;
        this.nalCount = 0;
        this.buffer = new Uint8Array(0);
        this.sps = null;
        this.pps = null;
        this.isConfigured = false;

        if (this.videoDecoder) {
            try {
                this.videoDecoder.close();
            } catch (e) {
                console.warn('[WebCodecs] Close error:', e);
            }
            this.videoDecoder = null;
        }

        // Reinitialize decoder for next stream
        this.initDecoder();
        this.clearCanvas();
        console.log('[WebCodecs] ✅ Decoder cleared and reinitialized');
    }

    dispose() {
        console.log('[WebCodecs] Disposing decoder...');
        this.clear();
        this.canvas = null;
        this.ctx = null;
        this.onFrameReady = null;
    }

    getStats() {
        return {
            frameCount: this.frameCount,
            decodedFrames: this.decodedFrames,
            nalCount: this.nalCount,
            isConfigured: this.isConfigured,
            isActive: this.isInitialized
        };
    }
}

window.H264Decoder = H264Decoder;
console.log('[WebCodecs] H264Decoder loaded');
