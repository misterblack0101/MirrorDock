/**
 * Simple H.264 Stream Monitor
 * Shows real-time stats and activity visualization
 * For production video decoding, consider using a native app or WebRTC
 */

class H264Decoder {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.onFrameReady = null;
        this.frameCount = 0;
        this.bytesReceived = 0;
        this.isInitialized = false;
        this.lastFrameTime = Date.now();
        this.fpsHistory = [];
        this.maxFpsHistory = 30;
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        console.log('[H264] Initializing stream monitor...');
        this.isInitialized = true;

        if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = 720;
            canvas.height = 1280;
        }

        this.drawWaiting();
        console.log('[H264] ✅ Initialized successfully');
    }

    decode(frameData) {
        if (!this.isInitialized) return;

        this.frameCount++;
        this.bytesReceived += frameData.length;

        // Calculate FPS
        const now = Date.now();
        const fps = 1000 / (now - this.lastFrameTime);
        this.lastFrameTime = now;

        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > this.maxFpsHistory) {
            this.fpsHistory.shift();
        }

        // Draw visualization
        if (this.frameCount % 2 === 0) { // Draw every other frame for performance
            this.drawVisualization();
        }

        if (this.onFrameReady) {
            this.onFrameReady();
        }
    }

    drawVisualization() {
        if (!this.ctx || !this.canvas) return;

        const { ctx, canvas } = this;
        const time = Date.now() / 1000;

        // Dark gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a0e27');
        gradient.addColorStop(1, '#1a1f3a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Pulsing circle
        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length || 0;
        const pulse = 0.8 + Math.sin(time * 5) * 0.2;
        const radius = 80 * pulse;

        // Outer glow
        const glowGradient = ctx.createRadialGradient(centerX, centerY - 100, 0, centerX, centerY - 100, radius * 1.5);
        glowGradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
        glowGradient.addColorStop(0.5, 'rgba(79, 70, 229, 0.2)');
        glowGradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, centerY - 300, canvas.width, 400);

        // Inner circle
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 100, radius, 0, Math.PI * 2);
        ctx.fill();

        // Status text
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🎥 Live Stream Active', centerX, centerY + 40);

        ctx.font = '18px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('H.264 video stream receiving', centerX, centerY + 80);

        // Stats box
        const statsY = centerY + 140;
        const lineHeight = 32;

        ctx.textAlign = 'left';
        ctx.font = '16px "SF Mono", Menlo, Monaco, Consolas, monospace';

        // Draw stats
        const stats = [
            { label: 'Frames:', value: this.frameCount.toLocaleString(), color: '#60a5fa' },
            { label: 'Data:', value: `${(this.bytesReceived / 1024 / 1024).toFixed(2)} MB`, color: '#34d399' },
            { label: 'FPS:', value: avgFps.toFixed(1), color: '#fbbf24' },
            { label: 'Bitrate:', value: `${((this.bytesReceived * 8 / (Date.now() - this.lastFrameTime + this.frameCount * 33)) / 1000).toFixed(0)} kbps`, color: '#a78bfa' }
        ];

        stats.forEach((stat, i) => {
            const y = statsY + i * lineHeight;
            ctx.fillStyle = '#64748b';
            ctx.fillText(stat.label, 60, y);
            ctx.fillStyle = stat.color;
            ctx.fillText(stat.value, 200, y);
        });

        // FPS graph
        this.drawFpsGraph(60, canvas.height - 120);

        // Footer
        ctx.textAlign = 'center';
        ctx.font = '14px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Video decoding requires native codec support', centerX, canvas.height - 60);
        ctx.fillStyle = '#64748b';
        ctx.fillText('Stream is active and receiving data • Touch to interact', centerX, canvas.height - 35);
    }

    drawFpsGraph(x, y) {
        if (this.fpsHistory.length < 2) return;

        const { ctx } = this;
        const width = this.canvas.width - x * 2;
        const height = 60;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, y, width, height);

        // Draw graph
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const maxFps = 60;
        const step = width / this.maxFpsHistory;

        this.fpsHistory.forEach((fps, i) => {
            const plotX = x + i * step;
            const plotY = y + height - (fps / maxFps) * height;

            if (i === 0) {
                ctx.moveTo(plotX, plotY);
            } else {
                ctx.lineTo(plotX, plotY);
            }
        });

        ctx.stroke();

        // Label
        ctx.font = '12px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'left';
        ctx.fillText('FPS History', x + 5, y + 15);
    }

    drawWaiting() {
        if (!this.ctx || !this.canvas) return;

        const { ctx, canvas } = this;

        ctx.fillStyle = '#0a0e27';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.font = '20px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Waiting for video stream...', canvas.width / 2, canvas.height / 2);
    }

    clear() {
        this.frameCount = 0;
        this.bytesReceived = 0;
        this.fpsHistory = [];

        if (this.ctx && this.canvas) {
            this.drawWaiting();
        }
    }

    getStats() {
        return {
            frameCount: this.frameCount,
            bytesReceived: this.bytesReceived,
            isActive: this.isInitialized
        };
    }
}

window.H264Decoder = H264Decoder;
console.log('[H264] Simple decoder loaded');
