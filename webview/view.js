// WebView UI - canvas interface and input handler
// Receives video frames from extension, sends input events to device

(function () {
    const vscode = acquireVsCodeApi();

    // DOM Elements
    const canvas = document.getElementById('screen-canvas');
    const statusText = document.getElementById('status-text');
    const startBtn = document.getElementById('start-btn');
    const loading = document.getElementById('loading');
    const canvasContainer = document.getElementById('canvas-container');

    // State
    let decoder = null;
    let isRunning = false;
    let deviceWidth = 1080;
    let deviceHeight = 1920;

    // Touch tracking
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTouching = false;
    // Drag/send movement tracking
    let pendingClientX = null;
    let pendingClientY = null;
    let lastSentDeviceX = null;
    let lastSentDeviceY = null;
    let lastSendTime = 0;
    const SEND_INTERVAL = 60; // ms between drag segments (~16Hz)
    let dragLoopRunning = false;
    let hasSentSegments = false;
    function init() {
        console.log('[View] Initializing...');
        console.log('[View] H264Decoder available:', !!window.H264Decoder);

        // Initialize H.264 decoder
        if (window.H264Decoder) {
            decoder = new window.H264Decoder();
            decoder.init(canvas);
            decoder.onFrameReady = onFrameRendered;
            console.log('[View] Decoder initialized successfully');
        } else {
            console.error('[View] H.264 Decoder not available');
            updateStatus('H.264 Decoder not loaded', 'error');
        }        // Setup canvas
        setupCanvas();

        // Setup event listeners
        setupEventListeners();

        // Restore state
        const state = vscode.getState();
        if (state) {
            isRunning = state.isRunning || false;
            updateUI();
        }

        console.log('[View] Initialization complete');
    }    /**
     * Setup canvas dimensions
     */
    function setupCanvas() {
        const container = canvasContainer.getBoundingClientRect();
        const aspectRatio = deviceHeight / deviceWidth;

        let canvasWidth = Math.min(container.width - 20, deviceWidth);
        let canvasHeight = canvasWidth * aspectRatio;

        if (canvasHeight > container.height - 20) {
            canvasHeight = container.height - 20;
            canvasWidth = canvasHeight / aspectRatio;
        }

        canvas.width = deviceWidth;
        canvas.height = deviceHeight;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Start button
        startBtn.addEventListener('click', toggleScrcpy);

        // Window resize
        window.addEventListener('resize', setupCanvas);

        // Mouse events (tap)
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        // Touch events (for touch-enabled devices)
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        // Context menu (prevent right-click)
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Message handler
        window.addEventListener('message', handleMessage);
    }

    /**
     * Handle messages from extension
     */
    function handleMessage(event) {
        const message = event.data;

        switch (message.type) {
            case 'frame':
                handleFrame(message.data);
                break;
            case 'status':
                handleStatusUpdate(message.status, message.message);
                break;
            case 'deviceInfo':
                handleDeviceInfo(message.width, message.height);
                break;
            case 'clear':
                handleClear();
                break;
        }
    }

    /**
     * Handle clear command (restart)
     */
    function handleClear() {
        console.log('[View] Clearing decoder state for restart...');
        if (decoder) {
            decoder.clear();
        }
        canvas.classList.remove('active');
        loading.classList.add('show');
    }

    /**
     * Handle incoming video frame
     */
    function handleFrame(frameData) {
        if (!decoder) {
            console.error('[View] Decoder not initialized, cannot handle frame');
            return;
        }

        // Convert array back to Uint8Array
        const data = new Uint8Array(frameData);

        // Log first few frames
        if (decoder.frameCount < 3) {
            console.log(`[View] Received frame ${decoder.frameCount + 1}: ${data.length} bytes`);
        }

        // Decode frame
        decoder.decode(data);

        // Show canvas if not visible
        if (!canvas.classList.contains('active')) {
            console.log('[View] Activating canvas display');
            canvas.classList.add('active');
            loading.classList.remove('show');
        }
    }

    /**
     * Handle status updates
     */
    function handleStatusUpdate(status, message) {
        switch (status) {
            case 'starting':
                isRunning = false;
                updateStatus(message || 'Starting...', 'starting');
                loading.classList.add('show');
                canvas.classList.remove('active');
                break;
            case 'running':
                isRunning = true;
                updateStatus(message || 'Connected', 'connected');
                break;
            case 'stopped':
                isRunning = false;
                updateStatus(message || 'Stopped', 'stopped');
                loading.classList.remove('show');
                canvas.classList.remove('active');
                if (decoder) decoder.clear();
                break;
            case 'error':
                isRunning = false;
                updateStatus(message || 'Error', 'error');
                loading.classList.remove('show');
                break;
        }
        updateUI();
        saveState();
    }

    /**
     * Handle device info
     */
    function handleDeviceInfo(width, height) {
        deviceWidth = width;
        deviceHeight = height;
        setupCanvas();
    }

    /**
     * Frame rendered callback
     */
    function onFrameRendered() {
        // Optional: Update FPS counter or other stats
    }

    /**
     * Toggle scrcpy on/off
     */
    function toggleScrcpy() {
        if (isRunning) {
            vscode.postMessage({ type: 'stop' });
        } else {
            vscode.postMessage({ type: 'start' });
        }
    }

    /**
     * Update status text
     */
    function updateStatus(text, className) {
        statusText.textContent = text;
        statusText.className = className || '';
    }

    /**
     * Update UI based on state
     */
    function updateUI() {
        startBtn.textContent = isRunning ? 'Stop' : 'Start';
    }

    /**
     * Save state
     */
    function saveState() {
        vscode.setState({ isRunning });
    }

    /**
     * Convert canvas coordinates to device coordinates
     */
    function canvasToDevice(canvasX, canvasY) {
        // Use canvas internal dimensions, not the displayed CSS size
        const scaleX = canvas.width / canvas.getBoundingClientRect().width;
        const scaleY = canvas.height / canvas.getBoundingClientRect().height;

        return {
            x: Math.round(canvasX * scaleX),
            y: Math.round(canvasY * scaleY)
        };
    }

    /**
     * Get coordinates relative to canvas
     */
    function getCanvasCoords(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    /**
     * Mouse down handler
     */
    function handleMouseDown(event) {
        event.preventDefault();
        const coords = getCanvasCoords(event);
        touchStartX = coords.x;
        touchStartY = coords.y;
        touchStartTime = Date.now();
        isTouching = true;
        // initialize drag tracking
        pendingClientX = coords.x;
        pendingClientY = coords.y;
        lastSentDeviceX = null;
        lastSentDeviceY = null;
        lastSendTime = 0;
        hasSentSegments = false;
        scheduleDragLoop();
    }

    /**
     * Mouse move handler
     */
    function handleMouseMove(event) {
        if (!isTouching) return;
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        pendingClientX = event.clientX - rect.left;
        pendingClientY = event.clientY - rect.top;
    }

    /**
     * Mouse up handler
     */
    function handleMouseUp(event) {
        if (!isTouching) return;
        event.preventDefault();

        // If we already sent drag segments, stop and don't emit another swipe/tap
        if (hasSentSegments) {
            isTouching = false;
            pendingClientX = null;
            pendingClientY = null;
            lastSentDeviceX = null;
            lastSentDeviceY = null;
            hasSentSegments = false;
            return;
        }

        const coords = getCanvasCoords(event);
        const duration = Date.now() - touchStartTime;
        const distance = Math.sqrt(
            Math.pow(coords.x - touchStartX, 2) +
            Math.pow(coords.y - touchStartY, 2)
        );

        isTouching = false;

        // Determine gesture type
        if (duration > 500 && distance < 10) {
            // Long press
            const deviceCoords = canvasToDevice(touchStartX, touchStartY);
            sendLongPress(deviceCoords.x, deviceCoords.y, duration);
        } else if (distance > 10) {
            // Swipe
            const startDevice = canvasToDevice(touchStartX, touchStartY);
            const endDevice = canvasToDevice(coords.x, coords.y);
            sendSwipe(startDevice.x, startDevice.y, endDevice.x, endDevice.y, duration);
        } else {
            // Tap
            const deviceCoords = canvasToDevice(touchStartX, touchStartY);
            sendTap(deviceCoords.x, deviceCoords.y);
        }
    }

    /**
     * Mouse leave handler
     */
    function handleMouseLeave(event) {
        if (isTouching) {
            handleMouseUp(event);
        }
    }

    /**
     * Touch start handler
     */
    function handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const rect = canvas.getBoundingClientRect();
            touchStartX = touch.clientX - rect.left;
            touchStartY = touch.clientY - rect.top;
            touchStartTime = Date.now();
            isTouching = true;
            // initialize drag tracking
            pendingClientX = touchStartX;
            pendingClientY = touchStartY;
            lastSentDeviceX = null;
            lastSentDeviceY = null;
            lastSendTime = 0;
            hasSentSegments = false;
            scheduleDragLoop();
        }
    }

    /**
     * Touch move handler
     */
    function handleTouchMove(event) {
        event.preventDefault();
        if (!isTouching) return;
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const rect = canvas.getBoundingClientRect();
            pendingClientX = touch.clientX - rect.left;
            pendingClientY = touch.clientY - rect.top;
        }
    }

    /**
     * Touch end handler
     */
    function handleTouchEnd(event) {
        if (!isTouching) return;
        event.preventDefault();
        // If we already sent drag segments, simply stop
        if (hasSentSegments) {
            isTouching = false;
            pendingClientX = null;
            pendingClientY = null;
            lastSentDeviceX = null;
            lastSentDeviceY = null;
            hasSentSegments = false;
            return;
        }

        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            const rect = canvas.getBoundingClientRect();
            const coords = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };

            const duration = Date.now() - touchStartTime;
            const distance = Math.sqrt(
                Math.pow(coords.x - touchStartX, 2) +
                Math.pow(coords.y - touchStartY, 2)
            );

            isTouching = false;

            // Determine gesture type
            if (duration > 500 && distance < 10) {
                const deviceCoords = canvasToDevice(touchStartX, touchStartY);
                sendLongPress(deviceCoords.x, deviceCoords.y, duration);
            } else if (distance > 10) {
                const startDevice = canvasToDevice(touchStartX, touchStartY);
                const endDevice = canvasToDevice(coords.x, coords.y);
                sendSwipe(startDevice.x, startDevice.y, endDevice.x, endDevice.y, duration);
            } else {
                const deviceCoords = canvasToDevice(touchStartX, touchStartY);
                sendTap(deviceCoords.x, deviceCoords.y);
            }
        }
    }

    /**
     * Schedule a RAF-driven loop that posts small drag segments while dragging.
     */
    function scheduleDragLoop() {
        if (dragLoopRunning) return;
        dragLoopRunning = true;
        requestAnimationFrame(dragTick);
    }

    function dragTick() {
        if (!isTouching) {
            dragLoopRunning = false;
            return;
        }

        const now = Date.now();

        if (pendingClientX == null || pendingClientY == null) {
            requestAnimationFrame(dragTick);
            return;
        }

        const device = canvasToDevice(pendingClientX, pendingClientY);

        if (lastSentDeviceX == null || lastSentDeviceY == null) {
            lastSentDeviceX = device.x;
            lastSentDeviceY = device.y;
            lastSendTime = now;
            requestAnimationFrame(dragTick);
            return;
        }

        if (now - lastSendTime >= SEND_INTERVAL && (device.x !== lastSentDeviceX || device.y !== lastSentDeviceY)) {
            const dur = Math.max(20, now - lastSendTime);
            vscode.postMessage({
                type: 'input',
                action: 'drag',
                payload: { x1: lastSentDeviceX, y1: lastSentDeviceY, x2: device.x, y2: device.y, duration: dur }
            });

            lastSentDeviceX = device.x;
            lastSentDeviceY = device.y;
            lastSendTime = now;
            hasSentSegments = true;
        }

        requestAnimationFrame(dragTick);
    }

    /**
     * Send tap event to extension
     */
    function sendTap(x, y) {
        vscode.postMessage({
            type: 'input',
            action: 'tap',
            payload: { x, y }
        });
    }

    /**
     * Send swipe event to extension
     */
    function sendSwipe(x1, y1, x2, y2, duration) {
        vscode.postMessage({
            type: 'input',
            action: 'swipe',
            payload: { x1, y1, x2, y2, duration }
        });
    }

    /**
     * Send long press event to extension
     */
    function sendLongPress(x, y, duration) {
        vscode.postMessage({
            type: 'input',
            action: 'longPress',
            payload: { x, y, duration }
        });
    }

    /**
     * Cleanup resources when page unloads
     */
    function cleanup() {
        console.log('[View] Cleaning up resources...');
        if (decoder && typeof decoder.dispose === 'function') {
            decoder.dispose();
        }
        decoder = null;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
})();
