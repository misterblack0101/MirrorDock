# H.264 Decoder Integration Guide

This guide explains how to integrate a real H.264 decoder into the extension to enable actual video streaming.

## Current State

The extension includes a **stub decoder** (`webview/h264/decoder.js`) that:
- Receives H.264 frame data from the extension
- Displays a placeholder visualization
- Does NOT actually decode video

## Why You Need a Real Decoder

scrcpy outputs raw H.264 video data which needs to be:
1. Parsed into frame units (NAL units)
2. Decoded into RGB pixel data
3. Rendered onto the canvas

## Decoder Options

### Option 1: Broadway.js (Recommended for Beginners)

**Pros:**
- Pure JavaScript (no WASM compilation needed)
- Easy to integrate
- Works in all browsers
- Maintained and stable

**Cons:**
- Lower performance than WASM solutions
- Higher CPU usage

**Installation:**

```bash
npm install broadway-player
```

**Integration:**

Replace `webview/h264/decoder.js` with:

```javascript
// Import Broadway player
import Player from 'broadway-player';

class H264Decoder {
    constructor() {
        this.player = null;
        this.canvas = null;
    }

    init(canvas) {
        this.canvas = canvas;
        
        // Initialize Broadway player
        this.player = new Player({
            useWorker: true,
            workerFile: './broadway/Decoder.js',
            size: {
                width: 1080,
                height: 1920
            }
        });
        
        // Attach to canvas
        this.player.canvas = canvas;
        canvas.parentNode.appendChild(this.player.canvas);
    }

    decode(frameData) {
        if (this.player) {
            this.player.decode(frameData);
        }
    }

    clear() {
        if (this.player) {
            this.player.clear();
        }
    }
}

window.H264Decoder = H264Decoder;
```

**Additional Setup:**

Copy Broadway worker files to `webview/broadway/`:
```bash
cp node_modules/broadway-player/Decoder.js webview/broadway/
cp node_modules/broadway-player/Decoder.wasm webview/broadway/
```

Update `ScrcpyViewProvider.ts` to serve these files:

```typescript
webview.options = {
    enableScripts: true,
    localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'webview'),
        vscode.Uri.joinPath(this._extensionUri, 'webview', 'broadway')
    ]
};
```

### Option 2: ffmpeg.wasm (Most Powerful)

**Pros:**
- Full ffmpeg capabilities
- Excellent performance
- Supports many codecs
- Active development

**Cons:**
- Large bundle size (~25MB)
- More complex setup
- Requires SharedArrayBuffer (security headers)

**Installation:**

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/core
```

**Integration:**

```javascript
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

class H264Decoder {
    constructor() {
        this.ffmpeg = null;
        this.canvas = null;
        this.ctx = null;
        this.loaded = false;
    }

    async init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Load ffmpeg
        this.ffmpeg = new FFmpeg();
        await this.ffmpeg.load({
            coreURL: await toBlobURL('./ffmpeg-core.js', 'text/javascript'),
            wasmURL: await toBlobURL('./ffmpeg-core.wasm', 'application/wasm'),
        });
        
        this.loaded = true;
    }

    async decode(frameData) {
        if (!this.loaded || !this.ffmpeg) return;
        
        // Write frame to virtual file system
        await this.ffmpeg.writeFile('input.h264', frameData);
        
        // Decode frame
        await this.ffmpeg.exec([
            '-i', 'input.h264',
            '-f', 'image2',
            '-vcodec', 'rawvideo',
            '-pix_fmt', 'rgba',
            'output.raw'
        ]);
        
        // Read decoded frame
        const data = await this.ffmpeg.readFile('output.raw');
        
        // Create ImageData and render
        const imageData = new ImageData(
            new Uint8ClampedArray(data),
            this.canvas.width,
            this.canvas.height
        );
        this.ctx.putImageData(imageData, 0, 0);
    }

    clear() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

window.H264Decoder = H264Decoder;
```

### Option 3: Custom OpenH264 WASM Build

**Pros:**
- Smallest bundle size
- Best performance
- Official Cisco decoder

**Cons:**
- Requires manual compilation
- More complex integration
- Need to handle frame parsing

**Steps:**

1. Clone OpenH264:
   ```bash
   git clone https://github.com/cisco/openh264.git
   cd openh264
   ```

2. Install Emscripten:
   ```bash
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   ./emsdk install latest
   ./emsdk activate latest
   source ./emsdk_env.sh
   ```

3. Compile to WASM:
   ```bash
   cd openh264
   make OS=linux ARCH=wasm CC=emcc CXX=em++ AR=emar
   ```

4. Create JavaScript wrapper similar to Broadway example

## Handling Frame Boundaries

H.264 streams consist of NAL (Network Abstraction Layer) units. You need to:

1. **Find NAL boundaries**: Look for start codes `0x00 0x00 0x00 0x01` or `0x00 0x00 0x01`
2. **Buffer partial frames**: Accumulate data until complete frame
3. **Feed complete frames to decoder**

Example NAL parser:

```javascript
class NALParser {
    constructor() {
        this.buffer = new Uint8Array(0);
    }

    addData(data) {
        // Concatenate with existing buffer
        const newBuffer = new Uint8Array(this.buffer.length + data.length);
        newBuffer.set(this.buffer);
        newBuffer.set(data, this.buffer.length);
        this.buffer = newBuffer;
        
        return this.extractFrames();
    }

    extractFrames() {
        const frames = [];
        let startIndex = 0;
        
        while (startIndex < this.buffer.length - 4) {
            // Look for NAL start code
            if (this.isStartCode(startIndex)) {
                const nextStart = this.findNextStartCode(startIndex + 3);
                
                if (nextStart !== -1) {
                    // Extract complete NAL unit
                    const frame = this.buffer.slice(startIndex, nextStart);
                    frames.push(frame);
                    startIndex = nextStart;
                } else {
                    break;
                }
            } else {
                startIndex++;
            }
        }
        
        // Keep remaining data in buffer
        this.buffer = this.buffer.slice(startIndex);
        
        return frames;
    }

    isStartCode(index) {
        return (
            this.buffer[index] === 0x00 &&
            this.buffer[index + 1] === 0x00 &&
            (
                (this.buffer[index + 2] === 0x00 && this.buffer[index + 3] === 0x01) ||
                (this.buffer[index + 2] === 0x01)
            )
        );
    }

    findNextStartCode(fromIndex) {
        for (let i = fromIndex; i < this.buffer.length - 3; i++) {
            if (this.isStartCode(i)) {
                return i;
            }
        }
        return -1;
    }
}
```

## Performance Optimization

### 1. Use Web Workers

Decode frames in a separate thread:

```javascript
// decoder-worker.js
self.onmessage = function(e) {
    const { frameData } = e.data;
    
    // Decode frame (using your chosen decoder)
    const decodedFrame = decodeH264(frameData);
    
    // Send back to main thread
    self.postMessage({
        type: 'frame',
        data: decodedFrame
    }, [decodedFrame.buffer]);
};
```

```javascript
// In decoder.js
class H264Decoder {
    constructor() {
        this.worker = new Worker('./decoder-worker.js');
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
    }

    decode(frameData) {
        this.worker.postMessage({
            frameData: frameData
        }, [frameData.buffer]);
    }

    handleWorkerMessage(e) {
        const { type, data } = e.data;
        if (type === 'frame') {
            // Render to canvas
            this.renderFrame(data);
        }
    }
}
```

### 2. Frame Dropping

Skip frames if decoder is behind:

```javascript
decode(frameData) {
    if (this.frameQueue.length > 5) {
        // Drop older frames if queue is too long
        this.frameQueue.shift();
    }
    this.frameQueue.push(frameData);
}
```

### 3. Hardware Acceleration

Use OffscreenCanvas for better performance:

```javascript
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);
```

## Testing the Decoder

1. **Test with sample H.264 file:**
   ```javascript
   fetch('sample.h264')
       .then(r => r.arrayBuffer())
       .then(buffer => {
           const data = new Uint8Array(buffer);
           decoder.decode(data);
       });
   ```

2. **Monitor performance:**
   ```javascript
   const stats = {
       framesDecoded: 0,
       startTime: Date.now()
   };

   decoder.onFrameReady = () => {
       stats.framesDecoded++;
       const elapsed = (Date.now() - stats.startTime) / 1000;
       const fps = stats.framesDecoded / elapsed;
       console.log(`FPS: ${fps.toFixed(2)}`);
   };
   ```

3. **Check for frame drops:**
   ```javascript
   decoder.getStats(); // { queueLength, droppedFrames, fps }
   ```

## Troubleshooting

### Black Screen
- Check if decoder is receiving data
- Verify NAL unit boundaries are correct
- Ensure canvas dimensions match video

### Choppy Playback
- Increase buffer size
- Reduce video resolution in scrcpy
- Use hardware decoder
- Implement frame dropping

### High CPU Usage
- Move decoding to Web Worker
- Use WASM decoder instead of JS
- Reduce frame rate

### Memory Leaks
- Clear decoder buffers regularly
- Release canvas contexts
- Dispose of workers properly

## Recommended Setup

For the best balance of performance and ease of use:

1. **Start with Broadway.js** - Easy to integrate
2. **Add NAL parsing** - Handle frame boundaries
3. **Implement Web Worker** - Offload decoding
4. **Monitor performance** - Add FPS counter
5. **Optimize as needed** - Switch to ffmpeg.wasm if needed

## References

- [Broadway.js GitHub](https://github.com/mbebenita/Broadway)
- [ffmpeg.wasm Documentation](https://ffmpegwasm.netlify.app/)
- [OpenH264 GitHub](https://github.com/cisco/openh264)
- [H.264 NAL Units Explained](https://yumichan.net/video-processing/video-compression/introduction-to-h264-nal-unit/)
- [Web Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
