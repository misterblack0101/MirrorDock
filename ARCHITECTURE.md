# Architecture

## Overview

This extension streams Android device screens to VS Code using ADB screenrecord and WebCodecs H.264 decoding.

```
Android Device → ADB screenrecord → AndroidStreamRunner → WebView → VideoDecoder → Canvas
     ↑                                                                                ↓
     └──────────────────── ADB input commands ←─────────────── Mouse events ─────────┘
```

## Components

### Extension (src/extension.ts)
Entry point that registers the WebView panel and commands with VS Code.

### AndroidStreamRunner (src/AndroidStreamRunner.ts)
Manages the ADB screenrecord process:
- Spawns `adb shell screenrecord --output-format=h264 -`
- Captures H.264 video from stdout
- Emits frame data to WebView
- Executes ADB input commands (tap/swipe/longpress)

### AndroidViewProvider (src/AndroidViewProvider.ts)
WebView controller:
- Creates and configures the WebView panel
- Routes messages between extension and WebView
- Forwards video frames and input events

### WebView UI (webview/view.js)
Canvas interface:
- Receives video chunks via postMessage
- Passes data to H.264 decoder
- Captures mouse/touch events
- Converts canvas coordinates to device coordinates
- Sends input events to extension

### H.264 Decoder (webview/h264/webcodecs-decoder.js)
Video decoder:
- Parses H.264 NAL units (start codes: `0x00 0x00 0x01`)
- Extracts SPS/PPS configuration
- Converts Annex-B format to AVCC (length-prefixed)
- Decodes with WebCodecs VideoDecoder API
- Renders frames to canvas

## Message Protocol

**Extension → WebView:**
```javascript
{ type: 'frame', data: [/* H.264 bytes */] }
{ type: 'status', status: 'running', message: '...' }
{ type: 'clear' }  // Restart signal
```

**WebView → Extension:**
```javascript
{ type: 'input', action: 'tap', payload: { x, y } }
{ type: 'input', action: 'swipe', payload: { x1, y1, x2, y2, duration } }
{ type: 'input', action: 'longPress', payload: { x, y, duration } }
```

## H.264 NAL Units

- **SPS (type 7)**: Sequence Parameter Set - video configuration
- **PPS (type 8)**: Picture Parameter Set - encoding parameters
- **IDR (type 5)**: Keyframe - can decode independently
- **Non-IDR (type 1)**: P-frame - depends on previous frames

Decoder requires SPS + PPS to configure, then decodes IDR/P-frames.

## Key Technical Choices

**Why ADB screenrecord instead of scrcpy?**
- Simpler: no external dependencies
- Direct H.264 output
- Better control over stream parameters

**Why WebCodecs API?**
- Hardware-accelerated (GPU decoding)
- Native browser API, no external libraries
- Much faster than JavaScript/WASM decoders

**Annex-B vs AVCC format:**
- screenrecord outputs Annex-B (start codes)
- WebCodecs requires AVCC (length-prefixed)
- Decoder converts on-the-fly

## Performance

- Resolution: 720x1280 (configurable)
- Bitrate: 1 Mbps
- Target FPS: ~30
- Latency: ~100-200ms
- Buffer limit: 512KB (prevents memory leaks)
